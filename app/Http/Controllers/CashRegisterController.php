<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\CashRegisterSession;
use App\Models\IncomeExpense;
use App\Models\MoneyTransaction;
use App\Models\Sale;
use App\Models\SaleItem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class CashRegisterController extends Controller
{
    public function index(Request $request): Response
    {
        $sessionQuery = CashRegisterSession::query()
            ->where('status', 'open');

        if (!$request->user()?->is_admin) {
            $sessionQuery->where('opened_by', $request->user()->id);
        }

        $session = $sessionQuery
            ->latest('opened_at')
            ->first();

        // Calculate bank sales from sales with payment_method=bank
        $bankSales = $session
            ? (float) Sale::query()
                ->where('cash_register_session_id', $session->id)
                ->where('payment_method', 'bank')
                ->sum('total')
            : 0;

        // Calculate cash debt repaid (logged to cash_register)
        $cashDebtRepaid = $session
            ? (float) MoneyTransaction::query()
                ->where('source_type', 'cash_register')
                ->where('source_id', $session->id)
                ->where('category', 'debt_payment')
                ->sum('amount')
            : 0;

        // Calculate bank debt repaid (logged to bank_account during session time)
        $bankDebtRepaid = $session
            ? (float) MoneyTransaction::query()
                ->where('source_type', 'bank_account')
                ->where('category', 'debt_payment')
                ->where(function ($query) use ($session) {
                    $query->where('cash_register_session_id', $session->id)
                        ->orWhere(function ($fallback) use ($session) {
                            $fallback->whereNull('cash_register_session_id')
                                ->where('created_at', '>=', $session->opened_at);
                        });
                })
                ->sum('amount')
            : 0;

        // Add bank debt to bank sales total
        $totalBankSales = $bankSales + $bankDebtRepaid;

        $itemSales = $session 
            ? SaleItem::query()
                ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
                ->join('items', 'sale_items.item_id', '=', 'items.id')
                ->where('sales.cash_register_session_id', $session->id)
                ->select(
                    'items.id',
                    'items.name',
                    DB::raw('SUM(sale_items.quantity) as quantity'),
                    DB::raw('SUM(sale_items.subtotal) as revenue')
                )
                ->groupBy('items.id', 'items.name')
                ->orderByDesc('revenue')
                ->get()
                ->map(fn ($item) => [
                    'id' => $item->id,
                    'name' => $item->name,
                    'quantity' => $item->quantity,
                    'revenue' => number_format($item->revenue, 2),
                ])
            : [];

        $moneyFlow = $session
            ? MoneyTransaction::query()
                ->where('source_type', 'cash_register')
                ->where('source_id', $session->id)
                ->with('user:id,name')
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(fn ($tx) => [
                    'id' => $tx->id,
                    'type' => $tx->type,
                    'amount' => number_format($tx->amount, 2),
                    'category' => $tx->category,
                    'description' => $tx->description,
                    'user' => $tx->user?->name ?? 'Unknown',
                    'created_at' => $tx->created_at?->format('M d, Y H:i:s'),
                ])
            : [];

        // Calculate expected cash: opening balance + cash sales + CASH debt only
        $expectedCash = $session ? (
            (float)$session->opening_balance + 
            (float)$session->cash_sales + 
            $cashDebtRepaid
        ) : 0;

        return Inertia::render('CashRegister/Index', [
            'session' => $session ? [
                'id' => $session->id,
                'opening_balance' => $session->opening_balance,
                'cash_sales' => $session->cash_sales,
                'bank_sales' => $totalBankSales,
                'cash_debt_repaid' => $cashDebtRepaid,
                'bank_debt_repaid' => $bankDebtRepaid,
                'expected_cash' => $expectedCash,
                'actual_cash' => $session->actual_cash,
                'opened_at' => $session->opened_at?->format('M d, Y H:i'),
            ] : null,
            'itemSales' => $itemSales,
            'moneyFlow' => $moneyFlow,
        ]);
    }

    public function open(Request $request): RedirectResponse
    {
        $openSession = CashRegisterSession::query()
            ->where('status', 'open')
            ->first();

        if ($openSession) {
            return redirect()->route('cash-register.index')->withErrors(['error' => 'Another user has already opened a register session. Please wait for them to close it.']);
        }

        $validated = $request->validate([
            'opening_balance' => ['required', 'numeric', 'min:0'],
        ]);

        $openingBalance = (float) $validated['opening_balance'];

        $session = CashRegisterSession::create([
            'opened_by' => $request->user()->id,
            'opening_balance' => $openingBalance,
            'cash_sales' => 0,
            'debt_repaid' => 0,
            'expected_cash' => $openingBalance,
            'status' => 'open',
            'opened_at' => now(),
        ]);

        // Log opening balance transaction
        if ($openingBalance > 0) {
            MoneyTransaction::logCashIn(
                amount: $openingBalance,
                sessionId: $session->id,
                category: 'opening_balance',
                userId: $request->user()->id,
                description: 'Opening balance for cash register session'
            );
        }

        return redirect()->route('pos.index')->with('success', 'Register session started. You can now process sales.');
    }

    public function getShiftReview(Request $request): \Illuminate\Http\JsonResponse
    {
        $session = CashRegisterSession::query()
            ->with('opener')
            ->where('status', 'open')
            ->where('opened_by', $request->user()->id)
            ->latest('opened_at')
            ->first();

        if (!$session) {
            return response()->json(['error' => 'No active session found'], 404);
        }

        // Get all sales for this session
        $sales = Sale::query()
            ->where('cash_register_session_id', $session->id)
            ->with('customer')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($sale) => [
                'id' => $sale->id,
                'customer' => $sale->customer?->name ?? 'Walk-in Customer',
                'payment_method' => $sale->payment_method,
                'total' => number_format($sale->total, 2),
                'created_at' => $sale->created_at?->format('M d, Y H:i'),
            ]);

        // Get item sales summary with details
        $saleIds = Sale::where('cash_register_session_id', $session->id)->pluck('id');
        
        $itemSales = SaleItem::query()
            ->whereIn('sale_id', $saleIds)
            ->join('items', 'sale_items.item_id', '=', 'items.id')
            ->select(
                'items.id',
                'items.name',
                DB::raw('SUM(sale_items.quantity) as quantity'),
                DB::raw('SUM(sale_items.subtotal) as subtotal')
            )
            ->groupBy('items.id', 'items.name')
            ->orderByDesc('subtotal')
            ->get()
            ->map(fn ($item) => [
                'id' => $item->id,
                'name' => $item->name,
                'quantity' => (int) $item->quantity,
                'unit_price' => $item->quantity > 0 ? number_format($item->subtotal / $item->quantity, 2) : '0.00',
                'subtotal' => number_format($item->subtotal, 2),
            ]);

        // Calculate expected cash fresh to ensure accuracy
        // Calculate cash debt repaid (logged to cash_register)
        $cashDebtRepaid = (float) MoneyTransaction::query()
            ->where('source_type', 'cash_register')
            ->where('source_id', $session->id)
            ->where('category', 'debt_payment')
            ->sum('amount');

        // Calculate bank debt repaid (logged to bank_account during session time)
        $bankDebtRepaid = (float) MoneyTransaction::query()
            ->where('source_type', 'bank_account')
            ->where('category', 'debt_payment')
            ->where(function ($query) use ($session) {
                $query->where('cash_register_session_id', $session->id)
                    ->orWhere(function ($fallback) use ($session) {
                        $fallback->whereNull('cash_register_session_id')
                            ->where('created_at', '>=', $session->opened_at);
                    });
            })
            ->sum('amount');

        $expectedCash = (float)$session->opening_balance + 
                        (float)$session->cash_sales + 
                        $cashDebtRepaid;

        $bankSales = (float) Sale::query()
            ->where('cash_register_session_id', $session->id)
            ->where('payment_method', 'bank')
            ->sum('total');

        // Add bank debt to bank sales total
        $totalBankSales = $bankSales + $bankDebtRepaid;

        return response()->json([
            'session' => [
                'id' => $session->id,
                'opening_balance' => number_format($session->opening_balance, 2),
                'cash_sales' => number_format($session->cash_sales, 2),
                'bank_sales' => number_format($totalBankSales, 2),
                'cash_debt_repaid' => number_format($cashDebtRepaid, 2),
                'bank_debt_repaid' => number_format($bankDebtRepaid, 2),
                'expected_cash' => number_format($expectedCash, 2),
                'opened_at' => $session->opened_at?->format('M d, Y H:i A'),
                'opened_by' => $session->opener?->name ?? 'Unknown',
            ],
            'sales' => $sales,
            'itemSales' => $itemSales,
            'totalSales' => $sales->count(),
        ]);
    }

    public function close(Request $request): RedirectResponse
    {
        $session = CashRegisterSession::query()
            ->where('status', 'open')
            ->where('opened_by', $request->user()->id)
            ->latest('opened_at')
            ->first();

        if (!$session) {
            return redirect()->route('cash-register.index')->withErrors(['error' => 'You do not have an open register session to close.']);
        }

        $validated = $request->validate([
            'actual_cash' => ['required', 'numeric', 'min:0'],
        ]);

        $session->update([
            'actual_cash' => $validated['actual_cash'],
            'status' => 'closed',
            'closed_by' => $request->user()->id,
            'closed_at' => now(),
        ]);

        $this->recordPosIncome($session, $request->user()->id);

        return redirect()->route('cash-register.index');
    }

    public function finalize(Request $request): RedirectResponse
    {
        $session = CashRegisterSession::query()
            ->where('status', 'open')
            ->where('opened_by', $request->user()->id)
            ->latest('opened_at')
            ->first();

        if (!$session) {
            return redirect()->route('cash-register.index')->withErrors(['error' => 'No active session found']);
        }

        $validated = $request->validate([
            'actual_cash' => ['required', 'numeric', 'min:0'],
        ]);

        $actualCash = (float) $validated['actual_cash'];
        $expectedCash = (float) $session->expected_cash;

        $session->update([
            'actual_cash' => $actualCash,
            'status' => 'closed',
            'closed_by' => $request->user()->id,
            'closed_at' => now(),
        ]);

        $this->recordPosIncome($session, $request->user()->id);

        return redirect()->route('cash-register.index');
    }

    private function recordPosIncome(CashRegisterSession $session, int $userId): void
    {
        $existing = IncomeExpense::query()
            ->where('cash_register_session_id', $session->id)
            ->where('is_system_generated', true)
            ->where('type', 'income')
            ->where('category', 'POS Sales')
            ->exists();

        if ($existing) {
            return;
        }

        $cashSales = (float) $session->cash_sales;
        $bankSales = (float) Sale::query()
            ->where('cash_register_session_id', $session->id)
            ->where('payment_method', 'bank')
            ->sum('total');
        
        // Calculate cash debt payments (from cash register)
        $cashDebtRepaid = (float) MoneyTransaction::query()
            ->where('source_type', 'cash_register')
            ->where('category', 'debt_payment')
            ->where('type', 'in')
            ->where(function ($query) use ($session) {
                $query->where('cash_register_session_id', $session->id)
                    ->orWhere(function ($fallback) use ($session) {
                        $fallback->whereNull('cash_register_session_id')
                            ->where('source_id', $session->id);
                    });
            })
            ->sum('amount');
        
        // Calculate bank debt payments (from bank accounts)
        $bankDebtRepaid = (float) MoneyTransaction::query()
            ->where('source_type', 'bank_account')
            ->where('category', 'debt_payment')
            ->where('type', 'in')
            ->where(function ($query) use ($session) {
                $query->where('cash_register_session_id', $session->id)
                    ->orWhere(function ($fallback) use ($session) {
                        $fallback->whereNull('cash_register_session_id')
                            ->whereBetween('created_at', [$session->opened_at, $session->closed_at ?? now()]);
                    });
            })
            ->sum('amount');

        $totalPosIncome = $cashSales + $cashDebtRepaid + $bankSales + $bankDebtRepaid;

        if ($totalPosIncome <= 0) {
            return;
        }

        IncomeExpense::create([
            'type' => 'income',
            'category' => 'POS Sales',
            'description' => sprintf(
                'Auto-recorded from closed register session #%d (Cash Sales: ₱%s, Cash Debt: ₱%s, Bank Sales: ₱%s, Bank Debt: ₱%s)',
                $session->id,
                number_format($cashSales, 2),
                number_format($cashDebtRepaid, 2),
                number_format($bankSales, 2),
                number_format($bankDebtRepaid, 2)
            ),
            'amount' => $totalPosIncome,
            'source' => 'cash_register',
            'cash_register_session_id' => $session->id,
            'user_id' => $userId,
            'transaction_date' => $session->closed_at?->toDateString() ?? now()->toDateString(),
            'is_system_generated' => true,
        ]);
    }
}

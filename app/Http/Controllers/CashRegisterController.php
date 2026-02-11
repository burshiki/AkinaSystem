<?php

namespace App\Http\Controllers;

use App\Models\CashRegisterSession;
use App\Models\Item;
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
        $session = CashRegisterSession::query()
            ->where('status', 'open')
            ->where('opened_by', $request->user()->id)
            ->latest('opened_at')
            ->first();

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

        return Inertia::render('CashRegister/Index', [
            'session' => $session ? [
                'id' => $session->id,
                'opening_balance' => $session->opening_balance,
                'cash_sales' => $session->cash_sales,
                'debt_repaid' => $session->debt_repaid,
                'expected_cash' => $session->expected_cash,
                'actual_cash' => $session->actual_cash,
                'opened_at' => $session->opened_at?->format('M d, Y H:i'),
            ] : null,
            'itemSales' => $itemSales,
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

        CashRegisterSession::create([
            'opened_by' => $request->user()->id,
            'opening_balance' => $openingBalance,
            'cash_sales' => 0,
            'debt_repaid' => 0,
            'expected_cash' => $openingBalance,
            'status' => 'open',
            'opened_at' => now(),
        ]);

        return redirect()->route('cash-register.index');
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

        return redirect()->route('cash-register.index');
    }
}

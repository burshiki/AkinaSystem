<?php

namespace App\Http\Controllers;

use App\Models\BankAccount;
use App\Models\CashRegisterSession;
use App\Models\CashRegisterSessionAccessRequest;
use App\Models\CashRegisterSessionAudit;
use App\Models\Customer;
use App\Models\Item;
use App\Models\ItemLog;
use App\Models\MoneyTransaction;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class SalesHistoryController extends Controller
{
    public function index(Request $request): Response
    {
        $sessions = CashRegisterSession::query()
            ->with(['opener', 'closer'])
            ->where('status', 'closed')
            ->latest('opened_at')
            ->paginate(10)
            ->through(function (CashRegisterSession $session) use ($request) {
                $expectedCash = (float) $session->opening_balance
                    + (float) $session->cash_sales
                    + (float) $session->debt_repaid;

                $requestStatus = CashRegisterSessionAccessRequest::query()
                    ->where('cash_register_session_id', $session->id)
                    ->where('requested_by', $request->user()->id)
                    ->latest()
                    ->first();

                return [
                    'id' => $session->id,
                    'opened_at' => $session->opened_at?->format('M d, Y H:i'),
                    'closed_at' => $session->closed_at?->format('M d, Y H:i'),
                    'opened_by' => $session->opener?->name ?? 'Unknown',
                    'closed_by' => $session->closer?->name ?? 'Unknown',
                    'opening_balance' => number_format($session->opening_balance, 2),
                    'cash_sales' => number_format($session->cash_sales, 2),
                    'debt_repaid' => number_format($session->debt_repaid, 2),
                    'expected_cash' => number_format($expectedCash, 2),
                    'actual_cash' => $session->actual_cash !== null
                        ? number_format($session->actual_cash, 2)
                        : null,
                    'status' => $session->status,
                    'access_status' => $requestStatus?->status,
                ];
            });

        $pendingRequests = [];
        if ($request->user()->is_admin) {
            $pendingRequests = CashRegisterSessionAccessRequest::query()
                ->with(['requester', 'session'])
                ->where('status', 'pending')
                ->latest('created_at')
                ->get()
                ->map(fn (CashRegisterSessionAccessRequest $accessRequest) => [
                    'id' => $accessRequest->id,
                    'session_id' => $accessRequest->cash_register_session_id,
                    'requested_by' => $accessRequest->requester?->name ?? 'Unknown',
                    'requested_at' => $accessRequest->created_at?->format('M d, Y H:i'),
                    'reason' => $accessRequest->reason,
                ]);
        }

        return Inertia::render('RegisterHistory/Index', [
            'sessions' => $sessions,
            'pendingRequests' => $pendingRequests,
            'isAdmin' => $request->user()->is_admin,
        ]);
    }

    public function show(Request $request, CashRegisterSession $session): JsonResponse
    {
        if ($session->status !== 'closed') {
            return response()->json(['error' => 'Session is not closed.'], 400);
        }

        if (!$request->user()->is_admin) {
            $approved = CashRegisterSessionAccessRequest::query()
                ->where('cash_register_session_id', $session->id)
                ->where('requested_by', $request->user()->id)
                ->where('status', 'approved')
                ->exists();

            if (!$approved) {
                return response()->json(['error' => 'Approval required.'], 403);
            }
        }

        $sales = Sale::query()
            ->where('cash_register_session_id', $session->id)
            ->with(['customer', 'items.item'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($sale) => [
                'id' => $sale->id,
                'parent_sale_id' => $sale->parent_sale_id,
                'customer' => $sale->customer?->name ?? 'Walk-in Customer',
                'payment_method' => $sale->payment_method,
                'total' => number_format($sale->total, 2),
                'created_at' => $sale->created_at?->format('M d, Y H:i'),
                'status' => $sale->status,
                'items' => $sale->items->map(fn (SaleItem $item) => [
                    'id' => $item->id,
                    'item_id' => $item->item_id,
                    'name' => $item->item?->name ?? 'Item',
                    'quantity' => (int) $item->quantity,
                    'price' => number_format($item->price, 2),
                    'subtotal' => number_format($item->subtotal, 2),
                ])->values(),
            ]);

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

        $expectedCash = (float) $session->opening_balance
            + (float) $session->cash_sales
            + (float) $session->debt_repaid;

        $bankAccounts = BankAccount::query()
            ->select('id', 'bank_name', 'account_name', 'account_number')
            ->orderBy('bank_name')
            ->get()
            ->map(fn ($account) => [
                'id' => $account->id,
                'bank_name' => $account->bank_name,
                'account_name' => $account->account_name,
                'account_number' => $account->account_number,
            ]);

        $transactions = MoneyTransaction::query()
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
            ]);

        return response()->json([
            'session' => [
                'id' => $session->id,
                'opened_at' => $session->opened_at?->format('M d, Y H:i A'),
                'closed_at' => $session->closed_at?->format('M d, Y H:i A'),
                'opening_balance' => number_format($session->opening_balance, 2),
                'cash_sales' => number_format($session->cash_sales, 2),
                'debt_repaid' => number_format($session->debt_repaid, 2),
                'expected_cash' => number_format($expectedCash, 2),
                'actual_cash' => $session->actual_cash !== null
                    ? number_format($session->actual_cash, 2)
                    : null,
            ],
            'sales' => $sales,
            'itemSales' => $itemSales,
            'totalSales' => $sales->count(),
            'bankAccounts' => $bankAccounts,
            'transactions' => $transactions,
        ]);
    }

    public function returnSale(Request $request, Sale $sale): JsonResponse
    {
        $session = $sale->cashRegisterSession;

        if (!$session || $session->status !== 'closed') {
            return response()->json(['error' => 'Session must be closed to process a return.'], 400);
        }

        if ($sale->status !== 'completed') {
            return response()->json(['error' => 'Only completed sales can be returned.'], 400);
        }

        if (!$request->user()->is_admin) {
            $approved = CashRegisterSessionAccessRequest::query()
                ->where('cash_register_session_id', $session->id)
                ->where('requested_by', $request->user()->id)
                ->where('status', 'approved')
                ->exists();

            if (!$approved) {
                return response()->json(['error' => 'Approval required.'], 403);
            }
        }

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.id' => ['required', 'integer', 'exists:sale_items,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        $sale->load(['items.item']);

        $returnItems = collect($validated['items'])
            ->keyBy('id')
            ->map(fn ($item) => (int) $item['quantity']);

        $returnSaleIds = Sale::query()
            ->where('parent_sale_id', $sale->id)
            ->pluck('id');

        $returnedByItem = SaleItem::query()
            ->whereIn('sale_id', $returnSaleIds)
            ->select('item_id', DB::raw('ABS(SUM(quantity)) as returned_qty'))
            ->groupBy('item_id')
            ->pluck('returned_qty', 'item_id');

        $lines = [];
        $refundSubtotal = 0.0;

        foreach ($sale->items as $item) {
            $requestedQty = $returnItems->get($item->id, 0);
            if ($requestedQty <= 0) {
                continue;
            }

            $soldQty = (int) $item->quantity;
            $alreadyReturned = (int) ($returnedByItem[$item->item_id] ?? 0);
            $availableQty = $soldQty - $alreadyReturned;

            if ($requestedQty > $availableQty) {
                return response()->json([
                    'error' => "Return quantity exceeds available items for {$item->item?->name}.",
                ], 422);
            }

            $lineTotal = $requestedQty * (float) $item->price;
            $refundSubtotal += $lineTotal;

            $lines[] = [
                'item' => $item->item,
                'quantity' => $requestedQty,
                'price' => (float) $item->price,
                'subtotal' => $lineTotal,
            ];
        }

        if ($refundSubtotal <= 0) {
            return response()->json(['error' => 'Select at least one item to return.'], 422);
        }

        $refundSale = DB::transaction(function () use ($request, $sale, $session, $lines, $refundSubtotal, $validated) {
            $refund = Sale::create([
                'customer_id' => $sale->customer_id,
                'user_id' => $request->user()->id,
                'cash_register_session_id' => $session->id,
                'parent_sale_id' => $sale->id,
                'bank_account_id' => $sale->bank_account_id,
                'payment_method' => $sale->payment_method,
                'subtotal' => -$refundSubtotal,
                'total' => -$refundSubtotal,
                'amount_paid' => 0,
                'change_given' => 0,
                'status' => 'refunded',
                'notes' => $validated['reason'],
            ]);

            foreach ($lines as $line) {
                SaleItem::create([
                    'sale_id' => $refund->id,
                    'item_id' => $line['item']->id,
                    'quantity' => -$line['quantity'],
                    'price' => $line['price'],
                    'subtotal' => -$line['subtotal'],
                ]);

                $oldStock = $line['item']->stock;
                $newStock = $oldStock + $line['quantity'];
                Item::where('id', $line['item']->id)->update(['stock' => $newStock]);

                ItemLog::logStockChange(
                    itemId: $line['item']->id,
                    type: 'reversed',
                    quantityChange: $line['quantity'],
                    oldStock: $oldStock,
                    newStock: $newStock,
                    description: "Return for Sale #{$sale->id} (Return #{$refund->id})",
                    userId: $request->user()->id,
                    referenceType: Sale::class,
                    referenceId: $refund->id
                );
            }

            if ($sale->payment_method === 'cash') {
                $session->increment('cash_sales', -$refundSubtotal);
                $session->increment('expected_cash', -$refundSubtotal);
            } elseif ($sale->payment_method === 'credit' && $sale->customer_id) {
                Customer::where('id', $sale->customer_id)->decrement('debt_balance', $refundSubtotal);
            }

            $totalReturned = (float) Sale::query()
                ->where('parent_sale_id', $sale->id)
                ->select(DB::raw('COALESCE(SUM(ABS(total)), 0) as total_returned'))
                ->value('total_returned');

            if ($totalReturned >= (float) $sale->total) {
                $sale->update(['status' => 'refunded']);
            }

            return $refund;
        });

        return response()->json([
            'status' => 'ok',
            'refund_id' => $refundSale->id,
            'refund_amount' => abs($refundSubtotal),
        ]);
    }

    public function setRefundSource(Request $request, Sale $sale): JsonResponse
    {
        if ($sale->status !== 'refunded' || !$sale->parent_sale_id) {
            return response()->json(['error' => 'Invalid refund sale.'], 400);
        }

        if ($sale->refund_source) {
            return response()->json(['error' => 'Refund source already set.'], 400);
        }

        $validated = $request->validate([
            'refund_source' => ['required', 'in:cash,bank'],
            'bank_account_id' => ['required_if:refund_source,bank', 'nullable', 'exists:bank_accounts,id'],
        ]);

        // If cash refund, find the current open register
        if ($validated['refund_source'] === 'cash') {
            $currentSession = CashRegisterSession::query()
                ->where('status', 'open')
                ->first();

            if (!$currentSession) {
                return response()->json(['error' => 'No open cash register session found. Please open a register first.'], 400);
            }
        }

        DB::transaction(function () use ($sale, $validated, $request) {
            $refundAmount = abs((float) $sale->total);

            $sale->update([
                'refund_source' => $validated['refund_source'],
                'refund_bank_account_id' => $validated['bank_account_id'] ?? null,
            ]);

            if ($validated['refund_source'] === 'cash') {
                // Deduct from the current open register, not the closed one
                $currentSession = CashRegisterSession::query()
                    ->where('status', 'open')
                    ->first();

                if ($currentSession) {
                    // Deduct from cash sales and expected cash
                    $currentSession->decrement('cash_sales', $refundAmount);
                    $currentSession->decrement('expected_cash', $refundAmount);

                    // Log the transaction
                    MoneyTransaction::logCashOut(
                        amount: $refundAmount,
                        sessionId: $currentSession->id,
                        category: 'refund',
                        userId: $request->user()->id,
                        description: "Refund for Sale #{$sale->parent_sale_id}",
                        reference: $sale
                    );
                }
            } elseif ($validated['refund_source'] === 'bank' && $validated['bank_account_id']) {
                // Log bank transaction
                MoneyTransaction::logBankOut(
                    amount: $refundAmount,
                    bankAccountId: $validated['bank_account_id'],
                    category: 'refund',
                    userId: $request->user()->id,
                    description: "Refund for Sale #{$sale->parent_sale_id}",
                    reference: $sale
                );
            }
        });

        return response()->json([
            'status' => 'ok',
            'message' => 'Refund source recorded successfully.',
        ]);
    }

    public function getTransactions(Request $request, CashRegisterSession $session): JsonResponse
    {
        if ($session->status !== 'closed') {
            return response()->json(['error' => 'Session is not closed.'], 400);
        }

        if (!$request->user()->is_admin) {
            $approved = CashRegisterSessionAccessRequest::query()
                ->where('cash_register_session_id', $session->id)
                ->where('requested_by', $request->user()->id)
                ->where('status', 'approved')
                ->exists();

            if (!$approved) {
                return response()->json(['error' => 'Approval required.'], 403);
            }
        }

        $transactions = MoneyTransaction::query()
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
            ]);

        return response()->json([
            'transactions' => $transactions,
        ]);
    }

    public function requestAccess(Request $request, CashRegisterSession $session): JsonResponse
    {
        if ($request->user()->is_admin) {
            return response()->json(['status' => 'approved']);
        }

        if ($session->status !== 'closed') {
            return response()->json(['error' => 'Session is not closed.'], 400);
        }

        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $existing = CashRegisterSessionAccessRequest::query()
            ->where('cash_register_session_id', $session->id)
            ->where('requested_by', $request->user()->id)
            ->whereIn('status', ['pending', 'approved'])
            ->latest()
            ->first();

        if ($existing) {
            return response()->json(['status' => $existing->status]);
        }

        $accessRequest = CashRegisterSessionAccessRequest::create([
            'cash_register_session_id' => $session->id,
            'requested_by' => $request->user()->id,
            'status' => 'pending',
            'reason' => $validated['reason'] ?? null,
        ]);

        return response()->json(['status' => $accessRequest->status]);
    }

    public function approve(Request $request, CashRegisterSessionAccessRequest $accessRequest): RedirectResponse
    {
        if (!$request->user()->is_admin) {
            return redirect()->back()->with('error', 'Only administrators can approve requests.');
        }

        $accessRequest->update([
            'status' => 'approved',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ]);

        return redirect()->back()->with('success', 'Request approved.');
    }

    public function deny(Request $request, CashRegisterSessionAccessRequest $accessRequest): RedirectResponse
    {
        if (!$request->user()->is_admin) {
            return redirect()->back()->with('error', 'Only administrators can deny requests.');
        }

        $accessRequest->update([
            'status' => 'denied',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ]);

        return redirect()->back()->with('success', 'Request denied.');
    }

    public function update(Request $request, CashRegisterSession $session): RedirectResponse
    {
        if ($session->status !== 'closed') {
            return redirect()->back()->with('error', 'Session is not closed.');
        }

        $approvedBy = null;
        if (!$request->user()->is_admin) {
            $accessRequest = CashRegisterSessionAccessRequest::query()
                ->where('cash_register_session_id', $session->id)
                ->where('requested_by', $request->user()->id)
                ->where('status', 'approved')
                ->latest()
                ->first();

            if (!$accessRequest) {
                return redirect()->back()->with('error', 'Approval required.');
            }

            $approvedBy = $accessRequest->approved_by;
            $accessRequest->update([
                'status' => 'used',
                'used_at' => now(),
            ]);
        }

        $validated = $request->validate([
            'opening_balance' => ['required', 'numeric', 'min:0'],
            'cash_sales' => ['required', 'numeric', 'min:0'],
            'debt_repaid' => ['required', 'numeric', 'min:0'],
            'actual_cash' => ['nullable', 'numeric', 'min:0'],
            'reason' => ['required', 'string', 'max:500'],
        ]);

        $oldValues = [
            'opening_balance' => $session->opening_balance,
            'cash_sales' => $session->cash_sales,
            'debt_repaid' => $session->debt_repaid,
            'actual_cash' => $session->actual_cash,
        ];

        $session->update([
            'opening_balance' => $validated['opening_balance'],
            'cash_sales' => $validated['cash_sales'],
            'debt_repaid' => $validated['debt_repaid'],
            'actual_cash' => $validated['actual_cash'],
            'expected_cash' => $validated['opening_balance']
                + $validated['cash_sales']
                + $validated['debt_repaid'],
        ]);

        CashRegisterSessionAudit::create([
            'cash_register_session_id' => $session->id,
            'changed_by' => $request->user()->id,
            'approved_by' => $approvedBy,
            'old_values' => $oldValues,
            'new_values' => [
                'opening_balance' => $validated['opening_balance'],
                'cash_sales' => $validated['cash_sales'],
                'debt_repaid' => $validated['debt_repaid'],
                'actual_cash' => $validated['actual_cash'],
            ],
            'reason' => $validated['reason'],
        ]);

        return redirect()->back()->with('success', 'Session updated successfully.');
    }
}

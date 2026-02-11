<?php

namespace App\Http\Controllers;

use App\Models\CashRegisterSession;
use App\Models\CashRegisterSessionAccessRequest;
use App\Models\CashRegisterSessionAudit;
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
            ->get()
            ->map(function (CashRegisterSession $session) use ($request) {
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

        return Inertia::render('SalesHistory/Index', [
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

<?php

namespace App\Http\Controllers;

use App\Models\Item;
use App\Models\Sale;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $range = $request->query('range', '7d');
        [$startDate, $endDate] = $this->resolveRange($range, $request);

        $todayStart = Carbon::today();
        $todayEnd = Carbon::today()->endOfDay();

        $revenueToday = (float) Sale::query()
            ->where('status', 'completed')
            ->whereBetween('created_at', [$todayStart, $todayEnd])
            ->sum('total');

        $ordersToday = (int) Sale::query()
            ->where('status', 'completed')
            ->whereBetween('created_at', [$todayStart, $todayEnd])
            ->count();

        $profitToday = (float) DB::table('sale_items')
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->join('items', 'items.id', '=', 'sale_items.item_id')
            ->where('sales.status', 'completed')
            ->whereBetween('sales.created_at', [$todayStart, $todayEnd])
            ->selectRaw('COALESCE(SUM(sale_items.subtotal - (sale_items.quantity * COALESCE(items.cost, 0))), 0) as profit')
            ->value('profit');

        $chartSales = Sale::query()
            ->where('status', 'completed')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->selectRaw('DATE(created_at) as date, SUM(total) as revenue')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->keyBy('date');

        $points = [];
        $cursor = $startDate->copy();
        while ($cursor->lte($endDate)) {
            $dateKey = $cursor->format('Y-m-d');
            $points[] = [
                'date' => $dateKey,
                'revenue' => (float) ($chartSales[$dateKey]->revenue ?? 0),
            ];
            $cursor->addDay();
        }

        $lowStockItems = Item::query()
            ->where('stock', '<', 10)
            ->orderBy('stock')
            ->limit(10)
            ->get(['id', 'name', 'stock'])
            ->map(fn ($item) => [
                'id' => $item->id,
                'name' => $item->name,
                'stock' => $item->stock,
            ]);

        $recentSales = Sale::query()
            ->with('customer')
            ->where('status', 'completed')
            ->latest('created_at')
            ->limit(8)
            ->get()
            ->map(fn ($sale) => [
                'id' => $sale->id,
                'total' => (float) $sale->total,
                'customer' => $sale->customer?->name ?? 'Walk-in Customer',
                'created_at' => $sale->created_at->format('M d, Y H:i'),
            ]);

        return Inertia::render('dashboard', [
            'metrics' => [
                'revenueToday' => $revenueToday,
                'profitToday' => $profitToday,
                'ordersToday' => $ordersToday,
            ],
            'chart' => [
                'range' => $range,
                'from' => $startDate->toDateString(),
                'to' => $endDate->toDateString(),
                'points' => $points,
            ],
            'lowStockItems' => $lowStockItems,
            'recentSales' => $recentSales,
        ]);
    }

    private function resolveRange(string $range, Request $request): array
    {
        $today = Carbon::today();

        if ($range === 'today') {
            return [$today->copy(), $today->copy()->endOfDay()];
        }

        if ($range === '30d') {
            return [$today->copy()->subDays(29), $today->copy()->endOfDay()];
        }

        if ($range === 'custom') {
            $from = $request->query('from');
            $to = $request->query('to');
            $start = $from ? Carbon::parse($from)->startOfDay() : $today->copy()->subDays(6);
            $end = $to ? Carbon::parse($to)->endOfDay() : $today->copy()->endOfDay();
            if ($start->gt($end)) {
                [$start, $end] = [$end, $start];
            }
            return [$start, $end];
        }

        return [$today->copy()->subDays(6), $today->copy()->endOfDay()];
    }
}

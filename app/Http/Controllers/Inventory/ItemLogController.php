<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Item;
use App\Models\ItemLog;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ItemLogController extends Controller
{
    public function index(Request $request)
    {
        $itemId = $request->query('item_id');

        $query = ItemLog::with(['item', 'user'])
            ->orderBy('created_at', 'desc');

        // Filter by item if specified
        if ($itemId) {
            $query->where('item_id', $itemId);
        }

        $logs = $query->paginate(10)
            ->withQueryString()
            ->through(function ($log) {
                return [
                    'id' => $log->id,
                    'item_id' => $log->item_id,
                    'item_name' => $log->item->name,
                    'type' => $log->type,
                    'type_label' => $log->type_label,
                    'quantity_change' => $log->quantity_change,
                    'old_stock' => $log->old_stock,
                    'new_stock' => $log->new_stock,
                    'description' => $log->description,
                    'user_name' => $log->user?->name ?? 'System',
                    'created_at' => $log->created_at->format('M d, Y H:i:s'),
                ];
            });

        $items = Item::select('id', 'name', 'stock')
            ->orderBy('name')
            ->get()
            ->toArray();

        return Inertia::render('Inventory/Logs', [
            'logs' => $logs,
            'items' => $items,
            'selectedItemId' => $itemId ? (int) $itemId : null,
        ]);
    }
}

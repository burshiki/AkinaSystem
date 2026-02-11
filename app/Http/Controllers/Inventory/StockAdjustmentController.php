<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Item;
use App\Models\ItemLog;
use App\Models\StockAdjustment;
use Illuminate\Http\Request;
use Inertia\Inertia;

class StockAdjustmentController extends Controller
{
    public function index()
    {
        $adjustments = StockAdjustment::with(['item', 'user'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($adjustment) {
                return [
                    'id' => $adjustment->id,
                    'item_id' => $adjustment->item_id,
                    'item_name' => $adjustment->item->name,
                    'quantity_change' => $adjustment->quantity_change,
                    'reason' => $adjustment->reason,
                    'reason_label' => $adjustment->reason_label,
                    'notes' => $adjustment->notes,
                    'old_stock' => $adjustment->old_stock,
                    'new_stock' => $adjustment->new_stock,
                    'user_name' => $adjustment->user->name,
                    'created_at' => $adjustment->created_at->format('M d, Y H:i'),
                ];
            });

        $items = Item::orderBy('name')
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'name' => $item->name,
                    'stock' => $item->stock,
                ];
            });

        return Inertia::render('Inventory/StockAdjustments', [
            'adjustments' => $adjustments,
            'items' => $items,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'item_id' => ['required', 'exists:items,id'],
            'quantity_change' => ['required', 'integer', 'not_in:0'],
            'reason' => ['required', 'in:adjustment,warranty,damage,internal_use'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $item = Item::findOrFail($validated['item_id']);
        $oldStock = $item->stock;
        $newStock = $oldStock + $validated['quantity_change'];

        // Prevent negative stock
        if ($newStock < 0) {
            return redirect()->back()->with('error', 'Adjustment would result in negative stock. Current stock: ' . $oldStock);
        }

        // Update item stock
        $item->update(['stock' => $newStock]);

        // Create adjustment record
        $adjustment = StockAdjustment::create([
            'item_id' => $validated['item_id'],
            'quantity_change' => $validated['quantity_change'],
            'reason' => $validated['reason'],
            'notes' => $validated['notes'],
            'old_stock' => $oldStock,
            'new_stock' => $newStock,
            'user_id' => $request->user()->id,
        ]);

        // Log stock movement
        $reasonLabels = [
            'adjustment' => 'Stock Adjustment',
            'warranty' => 'Warranty Claim',
            'damage' => 'Damaged Goods',
            'internal_use' => 'Internal Use',
        ];
        $description = ($reasonLabels[$validated['reason']] ?? $validated['reason']);
        if ($validated['notes']) {
            $description .= ": {$validated['notes']}";
        }

        ItemLog::logStockChange(
            itemId: $item->id,
            type: 'adjustment',
            quantityChange: $validated['quantity_change'],
            oldStock: $oldStock,
            newStock: $newStock,
            description: $description,
            userId: $request->user()->id,
            referenceType: StockAdjustment::class,
            referenceId: $adjustment->id
        );

        return redirect()->back()->with('success', 'Stock adjustment recorded successfully');
    }

    public function destroy(StockAdjustment $stockAdjustment)
    {
        // Reverse the adjustment
        $item = $stockAdjustment->item;
        $oldStock = $item->stock;
        $item->update(['stock' => $stockAdjustment->old_stock]);

        // Log the reversal
        ItemLog::logStockChange(
            itemId: $item->id,
            type: 'reversed',
            quantityChange: -$stockAdjustment->quantity_change,
            oldStock: $oldStock,
            newStock: $stockAdjustment->old_stock,
            description: "Reversed adjustment #{$stockAdjustment->id}",
            userId: auth()->id(),
            referenceType: StockAdjustment::class,
            referenceId: $stockAdjustment->id
        );

        $stockAdjustment->delete();

        return redirect()->back()->with('success', 'Stock adjustment reversed successfully');
    }
}

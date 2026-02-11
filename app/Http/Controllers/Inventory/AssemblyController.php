<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Assembly;
use App\Models\AssemblyItem;
use App\Models\Item;
use App\Models\ItemLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AssemblyController extends Controller
{
    public function index()
    {
        $assemblies = Assembly::with(['finalItem', 'user', 'items.item'])
            ->orderBy('created_at', 'desc')
            ->paginate(10)
            ->withQueryString()
            ->through(function ($assembly) {
                return [
                    'id' => $assembly->id,
                    'final_item_id' => $assembly->final_item_id,
                    'final_item_name' => $assembly->finalItem->name,
                    'quantity' => $assembly->quantity,
                    'notes' => $assembly->notes,
                    'user_name' => $assembly->user->name,
                    'created_at' => $assembly->created_at->format('M d, Y H:i'),
                    'parts' => $assembly->items->map(function ($part) {
                        return [
                            'id' => $part->id,
                            'part_name' => $part->item->name,
                            'quantity_used' => $part->quantity_used,
                        ];
                    }),
                ];
            });

        $items = Item::orderBy('name')
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'name' => $item->name,
                    'stock' => $item->stock,
                    'is_main_assembly' => $item->is_main_assembly,
                ];
            });

        return Inertia::render('Inventory/Assembly', [
            'assemblies' => $assemblies,
            'items' => $items,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'final_item_id' => ['required', 'exists:items,id'],
            'quantity' => ['required', 'integer', 'min:1'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'parts' => ['required', 'array', 'min:1'],
            'parts.*.item_id' => ['required', 'exists:items,id'],
            'parts.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        $finalItem = Item::findOrFail($validated['final_item_id']);
        $finalItemOldStock = $finalItem->stock;
        $finalItemNewStock = $finalItemOldStock + $validated['quantity'];

        // Verify all parts have sufficient stock and calculate total cost
        $totalPartsCost = 0;
        foreach ($validated['parts'] as $part) {
            $partItem = Item::findOrFail($part['item_id']);
            $requiredQuantity = $part['quantity'] * $validated['quantity'];
            
            if ($partItem->stock < $requiredQuantity) {
                return back()
                    ->withInput()
                    ->withErrors(['stock_error' => "Insufficient stock for {$partItem->name}. Required: {$requiredQuantity}, Available: {$partItem->stock}"]);
            }

            // Calculate cost of parts per unit assembled
            if ($partItem->cost) {
                $totalPartsCost += $partItem->cost * $part['quantity'];
            }
        }

        try {
            DB::transaction(function () use ($validated, $request, $finalItem, $finalItemOldStock, $finalItemNewStock, $totalPartsCost) {
                // Create assembly record
                $assembly = Assembly::create([
                    'final_item_id' => $validated['final_item_id'],
                    'quantity' => $validated['quantity'],
                    'notes' => $validated['notes'],
                    'user_id' => $request->user()->id,
                ]);

                // Process each part
                $partsDescription = [];
                foreach ($validated['parts'] as $part) {
                    $partItem = Item::findOrFail($part['item_id']);
                    $totalQuantityToRemove = $part['quantity'] * $validated['quantity'];
                    $partOldStock = $partItem->stock;
                    $partNewStock = $partOldStock - $totalQuantityToRemove;

                    // Update part stock
                    $partItem->update(['stock' => $partNewStock]);

                    // Create assembly item record
                    AssemblyItem::create([
                        'assembly_id' => $assembly->id,
                        'part_item_id' => $part['item_id'],
                        'quantity_used' => $totalQuantityToRemove,
                    ]);

                    // Log part reduction
                    ItemLog::logStockChange(
                        itemId: $partItem->id,
                        type: 'assembly',
                        quantityChange: -$totalQuantityToRemove,
                        oldStock: $partOldStock,
                        newStock: $partNewStock,
                        description: "Used in assembly of {$validated['quantity']}x {$finalItem->name}",
                        userId: $request->user()->id,
                        referenceType: Assembly::class,
                        referenceId: $assembly->id
                    );

                    $partsDescription[] = "{$totalQuantityToRemove}x {$partItem->name}";
                }

                // Update final item stock and cost
                $finalItem->update([
                    'stock' => $finalItemNewStock,
                    'cost' => $totalPartsCost > 0 ? $totalPartsCost : $finalItem->cost,
                ]);

                // Log final item increase
                ItemLog::logStockChange(
                    itemId: $finalItem->id,
                    type: 'assembly',
                    quantityChange: $validated['quantity'],
                    oldStock: $finalItemOldStock,
                    newStock: $finalItemNewStock,
                    description: "Assembled from: " . implode(", ", $partsDescription),
                    userId: $request->user()->id,
                    referenceType: Assembly::class,
                    referenceId: $assembly->id
                );
            });

            return back()->with('success', 'Assembly completed successfully');
        } catch (\Exception $e) {
            \Log::error('Assembly creation failed: ' . $e->getMessage(), [
                'exception' => $e,
                'user_id' => $request->user()->id,
            ]);
            
            return back()
                ->withInput()
                ->withErrors(['assembly_error' => 'Failed to create assembly: ' . $e->getMessage()]);
        }
    }
}

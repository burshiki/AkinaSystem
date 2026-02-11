<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Item;
use App\Models\ItemLog;
use App\Models\PurchaseOrder;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PurchaseOrderController extends Controller
{
    public function badgeCount(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['count' => 0]);
        }

        if ($user->is_admin) {
            $count = PurchaseOrder::query()
                ->where('status', 'pending')
                ->count();
        } else {
            $count = PurchaseOrder::query()
                ->where('requested_by', $user->id)
                ->whereIn('status', ['approved', 'partially_received'])
                ->count();
        }

        return response()->json(['count' => $count]);
    }
    public function index(): Response
    {
        $purchaseOrders = PurchaseOrder::with(['supplier', 'requestedBy', 'approvedBy', 'items.item'])
            ->orderBy('created_at', 'desc')
            ->paginate(10)
            ->withQueryString()
            ->through(fn($po) => [
                'id' => $po->id,
                'po_number' => $po->po_number,
                'supplier_id' => $po->supplier_id,
                'supplier_name' => $po->supplier?->name ?? 'Unknown Supplier',
                'status' => $po->status,
                'requested_by' => $po->requestedBy->name,
                'approved_by' => $po->approvedBy?->name,
                'approved_at' => $po->approved_at?->format('M d, Y'),
                'received_at' => $po->received_at?->format('M d, Y'),
                'total_amount' => (float) $po->total_amount,
                'notes' => $po->notes,
                'items' => $po->items->map(fn($item) => [
                    'id' => $item->id,
                    'item_id' => $item->item_id,
                    'item_name' => $item->item->name,
                    'quantity' => $item->quantity,
                    'received_quantity' => $item->received_quantity,
                    'unit_price' => (float) $item->unit_price,
                    'subtotal' => (float) $item->subtotal,
                ]),
                'created_at' => $po->created_at->format('M d, Y'),
            ]);

        $items = Item::select('id', 'name', 'cost')
            ->orderBy('name')
            ->get();

        $suppliers = Supplier::select('id', 'name')
            ->orderBy('name')
            ->get();

        return Inertia::render('Inventory/PurchaseOrders', [
            'purchaseOrders' => $purchaseOrders,
            'items' => $items,
            'suppliers' => $suppliers,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'supplier_id' => ['required', 'exists:suppliers,id'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.item_id' => ['required', 'exists:items,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
        ]);

        // Generate PO number
        $lastPO = PurchaseOrder::latest('id')->first();
        $nextNumber = $lastPO ? ((int) substr($lastPO->po_number, 3)) + 1 : 1;
        $poNumber = 'PO-' . str_pad($nextNumber, 6, '0', STR_PAD_LEFT);

        // Calculate total
        $totalAmount = collect($validated['items'])->sum(function ($item) {
            return $item['quantity'] * $item['unit_price'];
        });

        // Create purchase order
        $purchaseOrder = PurchaseOrder::create([
            'po_number' => $poNumber,
            'supplier_id' => $validated['supplier_id'],
            'status' => 'pending',
            'requested_by' => $request->user()->id,
            'total_amount' => $totalAmount,
            'notes' => $validated['notes'],
        ]);

        // Create purchase order items
        foreach ($validated['items'] as $itemData) {
            $purchaseOrder->items()->create([
                'item_id' => $itemData['item_id'],
                'quantity' => $itemData['quantity'],
                'unit_price' => $itemData['unit_price'],
                'subtotal' => $itemData['quantity'] * $itemData['unit_price'],
            ]);
        }

        return redirect()->back()->with('success', 'Purchase order created successfully');
    }

    public function update(Request $request, PurchaseOrder $purchaseOrder)
    {
        // Only allow updates if PO is pending
        if (!$purchaseOrder->isPending()) {
            return redirect()->back()->with('error', 'Cannot update approved or received purchase orders');
        }

        $validated = $request->validate([
            'supplier_id' => ['required', 'exists:suppliers,id'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.item_id' => ['required', 'exists:items,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
        ]);

        // Calculate total
        $totalAmount = collect($validated['items'])->sum(function ($item) {
            return $item['quantity'] * $item['unit_price'];
        });

        // Update purchase order
        $purchaseOrder->update([
            'supplier_id' => $validated['supplier_id'],
            'total_amount' => $totalAmount,
            'notes' => $validated['notes'],
        ]);

        // Delete existing items and create new ones
        $purchaseOrder->items()->delete();
        foreach ($validated['items'] as $itemData) {
            $purchaseOrder->items()->create([
                'item_id' => $itemData['item_id'],
                'quantity' => $itemData['quantity'],
                'unit_price' => $itemData['unit_price'],
                'subtotal' => $itemData['quantity'] * $itemData['unit_price'],
            ]);
        }

        return redirect()->back()->with('success', 'Purchase order updated successfully');
    }

    public function destroy(PurchaseOrder $purchaseOrder)
    {
        // Only allow deletion if PO is pending
        if (!$purchaseOrder->isPending()) {
            return redirect()->back()->with('error', 'Cannot delete approved or received purchase orders');
        }

        $purchaseOrder->delete();

        return redirect()->back()->with('success', 'Purchase order deleted successfully');
    }

    public function approve(Request $request, PurchaseOrder $purchaseOrder)
    {
        // Only admins can approve
        if (!$request->user()->is_admin) {
            return redirect()->back()->with('error', 'Only administrators can approve purchase orders');
        }

        // Only allow approval if PO is pending
        if (!$purchaseOrder->isPending()) {
            return redirect()->back()->with('error', 'Purchase order is not pending');
        }

        $purchaseOrder->update([
            'status' => 'approved',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ]);

        return redirect()->back()->with('success', 'Purchase order approved successfully');
    }

    public function receive(Request $request, PurchaseOrder $purchaseOrder)
    {
        // Only allow receiving if PO is approved or partially received
        if (!$purchaseOrder->canReceiveItems()) {
            return redirect()->back()->with('error', 'Purchase order must be approved first');
        }

        $validated = $request->validate([
            'items' => ['required', 'array'],
            'items.*.id' => ['required', 'exists:purchase_order_items,id'],
            'items.*.received_quantity' => ['required', 'integer', 'min:0'],
        ]);

        $allFullyReceived = true;

        // Update item stocks and received quantities
        foreach ($validated['items'] as $itemData) {
            $poItem = $purchaseOrder->items()->find($itemData['id']);
            
            if (!$poItem) {
                continue;
            }

            // Calculate the actual quantity to add (only new received items)
            $previouslyReceived = $poItem->received_quantity;
            $newReceivedQuantity = $itemData['received_quantity'];
            $quantityToAdd = max(0, $newReceivedQuantity - $previouslyReceived);

            // Update the item stock with cost averaging
            if ($quantityToAdd > 0) {
                $item = $poItem->item;
                $oldStock = $item->stock;
                $oldCost = (float) $item->cost;
                $newUnitPrice = (float) $poItem->unit_price;
                
                // Calculate weighted average cost
                if ($oldStock > 0) {
                    $newAverageCost = (($oldStock * $oldCost) + ($quantityToAdd * $newUnitPrice)) / ($oldStock + $quantityToAdd);
                } else {
                    // If no existing stock, use the new unit price as cost
                    $newAverageCost = $newUnitPrice;
                }
                
                // Update stock and cost
                $item->update([
                    'stock' => $oldStock + $quantityToAdd,
                    'cost' => round($newAverageCost, 2),
                ]);

                // Log stock movement
                ItemLog::logStockChange(
                    itemId: $item->id,
                    type: 'received',
                    quantityChange: $quantityToAdd,
                    oldStock: $oldStock,
                    newStock: $oldStock + $quantityToAdd,
                    description: "Received from PO {$purchaseOrder->po_number}" . ($purchaseOrder->supplier ? " - {$purchaseOrder->supplier->name}" : ''),
                    userId: $request->user()->id,
                    referenceType: PurchaseOrder::class,
                    referenceId: $purchaseOrder->id
                );
            }

            // Update received quantity
            $poItem->update([
                'received_quantity' => $newReceivedQuantity,
            ]);

            // Check if this item is not fully received
            if ($newReceivedQuantity < $poItem->quantity) {
                $allFullyReceived = false;
            }
        }

        // Determine the new status
        $newStatus = $allFullyReceived ? 'received' : 'partially_received';
        $receivedAt = $allFullyReceived ? now() : $purchaseOrder->received_at;

        $purchaseOrder->update([
            'status' => $newStatus,
            'received_at' => $receivedAt,
        ]);

        $message = $allFullyReceived 
            ? 'Purchase order fully received and stock updated'
            : 'Purchase order partially received. Stock updated for received items.';

        return redirect()->back()->with('success', $message);
    }
}

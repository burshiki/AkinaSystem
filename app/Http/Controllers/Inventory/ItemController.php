<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Item;
use App\Models\ItemCategory;
use App\Models\ItemLog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ItemController extends Controller
{
    public function index(): Response
    {
        $items = Item::query()
            ->with('category')
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (Item $item) => [
                'id' => $item->id,
                'name' => $item->name,
                'category' => $item->category?->name,
                'category_id' => $item->category_id,
                'price' => $item->price,
                'cost' => $item->cost,
                'stock' => $item->stock,
                'is_assemblable' => $item->is_assemblable,
                'is_main_assembly' => $item->is_main_assembly,
            ]);

        $categories = ItemCategory::query()
            ->orderBy('name')
            ->get()
            ->map(fn (ItemCategory $category) => [
                'id' => $category->id,
                'name' => $category->name,
            ]);

        return Inertia::render('Inventory/Items', [
            'items' => $items,
            'categories' => $categories,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('items', 'name')],
            'category_id' => ['nullable', 'integer', 'exists:item_categories,id'],
            'price' => ['required', 'numeric', 'min:0'],
            'cost' => ['nullable', 'numeric', 'min:0'],
            'stock' => ['required', 'integer', 'min:0'],
            'is_assemblable' => ['boolean'],
            'is_main_assembly' => ['boolean'],
        ]);

        $item = Item::create($validated);

        // Log initial stock if provided
        if ($validated['stock'] > 0) {
            ItemLog::logStockChange(
                itemId: $item->id,
                type: 'received',
                quantityChange: $validated['stock'],
                oldStock: 0,
                newStock: $validated['stock'],
                description: 'Initial stock',
                userId: $request->user()->id,
            );
        }

        return redirect()->route('inventory.items');
    }

    public function update(Request $request, Item $item): RedirectResponse
    {
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('items', 'name')->ignore($item->id),
            ],
            'category_id' => ['nullable', 'integer', 'exists:item_categories,id'],
            'price' => ['required', 'numeric', 'min:0'],
            'cost' => ['nullable', 'numeric', 'min:0'],
            'stock' => ['required', 'integer', 'min:0'],
            'is_assemblable' => ['boolean'],
            'is_main_assembly' => ['boolean'],
        ]);

        $oldStock = $item->stock;
        $newStock = $validated['stock'];

        $item->update($validated);

        // Log stock change if stock was modified
        if ($oldStock !== $newStock) {
            ItemLog::logStockChange(
                itemId: $item->id,
                type: 'adjustment',
                quantityChange: $newStock - $oldStock,
                oldStock: $oldStock,
                newStock: $newStock,
                description: 'Manual stock adjustment',
                userId: $request->user()->id,
            );
        }

        return redirect()->route('inventory.items');
    }

    public function destroy(Item $item): RedirectResponse
    {
        $item->delete();

        return redirect()->route('inventory.items');
    }
}

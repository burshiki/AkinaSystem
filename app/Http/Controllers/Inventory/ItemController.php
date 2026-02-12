<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Item;
use App\Models\ItemBrand;
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
            ->with('category', 'brand')
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (Item $item) => [
                'id' => $item->id,
                'name' => $item->name,
                'brand_id' => $item->brand_id,
                'brand' => $item->brand?->name,
                'serial_number' => $item->serial_number,
                'sku' => $item->sku,
                'barcode' => $item->barcode,
                'has_warranty' => $item->has_warranty,
                'warranty_months' => $item->warranty_months,
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

        $brands = ItemBrand::query()
            ->orderBy('name')
            ->get()
            ->map(fn (ItemBrand $brand) => [
                'id' => $brand->id,
                'name' => $brand->name,
            ]);

        return Inertia::render('Inventory/Items', [
            'items' => $items,
            'categories' => $categories,
            'brands' => $brands,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('items', 'name')],
            'brand_id' => ['nullable', 'integer', 'exists:item_brands,id'],
            'serial_number' => ['nullable', 'string', 'max:255'],
            'sku' => ['nullable', 'string', 'max:255'],
            'barcode' => ['nullable', 'string', 'max:255'],
            'has_warranty' => ['boolean'],
            'warranty_months' => ['nullable', 'integer', 'min:1'],
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
            'brand_id' => ['nullable', 'integer', 'exists:item_brands,id'],
            'serial_number' => ['nullable', 'string', 'max:255'],
            'sku' => ['nullable', 'string', 'max:255'],
            'barcode' => ['nullable', 'string', 'max:255'],
            'has_warranty' => ['boolean'],
            'warranty_months' => ['nullable', 'integer', 'min:1'],
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

    public function storeBrand(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('item_brands', 'name')],
        ]);

        ItemBrand::create($validated);

        return redirect()->route('inventory.items');
    }
}

<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Item;
use App\Models\ItemCategory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ItemController extends Controller
{
    public function index(): Response
    {
        $items = Item::query()
            ->with('category')
            ->orderBy('name')
            ->get()
            ->map(fn (Item $item) => [
                'id' => $item->id,
                'name' => $item->name,
                'category' => $item->category?->name,
                'category_id' => $item->category_id,
                'price' => $item->price,
                'cost' => $item->cost,
                'stock' => $item->stock,
                'is_assemblable' => $item->is_assemblable,
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
            'name' => ['required', 'string', 'max:255'],
            'category_id' => ['nullable', 'integer', 'exists:item_categories,id'],
            'price' => ['required', 'numeric', 'min:0'],
            'cost' => ['required', 'numeric', 'min:0'],
            'stock' => ['required', 'integer', 'min:0'],
            'is_assemblable' => ['boolean'],
        ]);

        Item::create($validated);

        return redirect()->route('inventory.items');
    }

    public function update(Request $request, Item $item): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'category_id' => ['nullable', 'integer', 'exists:item_categories,id'],
            'price' => ['required', 'numeric', 'min:0'],
            'cost' => ['required', 'numeric', 'min:0'],
            'stock' => ['required', 'integer', 'min:0'],
            'is_assemblable' => ['boolean'],
        ]);

        $item->update($validated);

        return redirect()->route('inventory.items');
    }

    public function destroy(Item $item): RedirectResponse
    {
        $item->delete();

        return redirect()->route('inventory.items');
    }
}

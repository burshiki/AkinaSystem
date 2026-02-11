<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Models\ItemCategory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    public function index(): Response
    {
        $categories = ItemCategory::query()
            ->withCount('items')
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (ItemCategory $category) => [
                'id' => $category->id,
                'name' => $category->name,
                'items_count' => $category->items_count,
            ]);

        return Inertia::render('Inventory/Categories', [
            'categories' => $categories,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        ItemCategory::create($validated);

        return redirect()->route('inventory.categories');
    }

    public function update(Request $request, ItemCategory $category): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $category->update($validated);

        return redirect()->route('inventory.categories');
    }

    public function destroy(ItemCategory $category): RedirectResponse
    {
        $category->delete();

        return redirect()->route('inventory.categories');
    }
}

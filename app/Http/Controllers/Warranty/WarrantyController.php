<?php

namespace App\Http\Controllers\Warranty;

use App\Http\Controllers\Controller;
use App\Models\Warranty;
use Inertia\Inertia;
use Inertia\Response;

class WarrantyController extends Controller
{
    public function index(): Response
    {
        $warranties = Warranty::query()
            ->with(['item', 'customer', 'sale'])
            ->latest('sold_at')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (Warranty $warranty) => [
                'id' => $warranty->id,
                'item' => $warranty->item?->name,
                'customer' => $warranty->customer?->name,
                'sale_id' => $warranty->sale_id,
                'serial_number' => $warranty->serial_number,
                'warranty_months' => $warranty->warranty_months,
                'sold_at' => $warranty->sold_at?->toDateString(),
                'expires_at' => $warranty->expires_at?->toDateString(),
                'is_expired' => $warranty->expires_at?->isPast() ?? false,
            ]);

        return Inertia::render('Warranty/Index', [
            'warranties' => $warranties,
        ]);
    }
}

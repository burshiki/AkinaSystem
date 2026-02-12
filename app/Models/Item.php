<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\ItemBrand;
use App\Models\ItemCategory;

class Item extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'brand_id',
        'sku',
        'barcode',
        'has_warranty',
        'warranty_months',
        'category_id',
        'price',
        'cost',
        'stock',
        'is_assemblable',
        'is_main_assembly',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'cost' => 'decimal:2',
        'stock' => 'integer',
        'warranty_months' => 'integer',
        'is_assemblable' => 'boolean',
        'is_main_assembly' => 'boolean',
        'has_warranty' => 'boolean',
    ];

    public function brand(): BelongsTo
    {
        return $this->belongsTo(ItemBrand::class, 'brand_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ItemCategory::class, 'category_id');
    }
}

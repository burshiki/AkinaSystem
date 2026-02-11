<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockAdjustment extends Model
{
    protected $fillable = [
        'item_id',
        'quantity_change',
        'reason',
        'notes',
        'old_stock',
        'new_stock',
        'user_id',
    ];

    protected $casts = [
        'quantity_change' => 'integer',
        'old_stock' => 'integer',
        'new_stock' => 'integer',
    ];

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function getReasonLabelAttribute(): string
    {
        return match($this->reason) {
            'adjustment' => 'Stock Adjustment',
            'warranty' => 'Warranty Claim',
            'damage' => 'Damaged Goods',
            'internal_use' => 'Internal Use',
            default => $this->reason,
        };
    }
}

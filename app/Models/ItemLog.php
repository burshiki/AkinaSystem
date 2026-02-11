<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ItemLog extends Model
{
    protected $fillable = [
        'item_id',
        'type',
        'quantity_change',
        'old_stock',
        'new_stock',
        'reference_type',
        'reference_id',
        'description',
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

    public function reference(): MorphTo
    {
        return $this->morphTo();
    }

    public function getTypeLabelAttribute(): string
    {
        return match($this->type) {
            'received' => 'Stock Received',
            'adjustment' => 'Stock Adjustment',
            'sale' => 'Sale',
            'assembly' => 'Assembly',
            'reversed' => 'Reversed',
            default => $this->type,
        };
    }

    /**
     * Create a log entry for stock movement
     */
    public static function logStockChange(
        int $itemId,
        string $type,
        int $quantityChange,
        int $oldStock,
        int $newStock,
        ?string $description = null,
        ?int $userId = null,
        ?string $referenceType = null,
        ?int $referenceId = null
    ): self {
        try {
            return self::create([
                'item_id' => $itemId,
                'type' => $type,
                'quantity_change' => $quantityChange,
                'old_stock' => $oldStock,
                'new_stock' => $newStock,
                'description' => $description,
                'user_id' => $userId,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
            ]);
        } catch (\Exception $e) {
            \Log::error('ItemLog::logStockChange failed', [
                'itemId' => $itemId,
                'type' => $type,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }
}

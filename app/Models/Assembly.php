<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Assembly extends Model
{
    protected $fillable = [
        'final_item_id',
        'quantity',
        'notes',
        'user_id',
    ];

    protected $casts = [
        'quantity' => 'integer',
    ];

    public function finalItem(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'final_item_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(AssemblyItem::class);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssemblyItem extends Model
{
    protected $fillable = [
        'assembly_id',
        'part_item_id',
        'quantity_used',
    ];

    protected $casts = [
        'quantity_used' => 'integer',
    ];

    public function assembly(): BelongsTo
    {
        return $this->belongsTo(Assembly::class);
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'part_item_id');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CashRegisterSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'opened_by',
        'closed_by',
        'opening_balance',
        'cash_sales',
        'debt_repaid',
        'expected_cash',
        'actual_cash',
        'status',
        'opened_at',
        'closed_at',
    ];

    protected $casts = [
        'opening_balance' => 'decimal:2',
        'cash_sales' => 'decimal:2',
        'debt_repaid' => 'decimal:2',
        'expected_cash' => 'decimal:2',
        'actual_cash' => 'decimal:2',
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    public function opener(): BelongsTo
    {
        return $this->belongsTo(User::class, 'opened_by');
    }

    public function closer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }
}

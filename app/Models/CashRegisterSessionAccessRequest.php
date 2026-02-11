<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CashRegisterSessionAccessRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'cash_register_session_id',
        'requested_by',
        'status',
        'approved_by',
        'approved_at',
        'used_at',
        'reason',
    ];

    protected $casts = [
        'approved_at' => 'datetime',
        'used_at' => 'datetime',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(CashRegisterSession::class, 'cash_register_session_id');
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}

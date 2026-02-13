<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class MoneyTransaction extends Model
{
    protected $fillable = [
        'type',
        'amount',
        'source_type',
        'source_id',
        'cash_register_session_id',
        'category',
        'description',
        'user_id',
        'reference_type',
        'reference_id',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function cashRegisterSession(): BelongsTo
    {
        return $this->belongsTo(CashRegisterSession::class);
    }

    public function reference(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Log money coming into cash register
     */
    public static function logCashIn(
        float $amount,
        int $sessionId,
        string $category,
        int $userId,
        ?string $description = null,
        ?Model $reference = null
    ): self {
        return self::create([
            'type' => 'in',
            'amount' => $amount,
            'source_type' => 'cash_register',
            'source_id' => $sessionId,
            'cash_register_session_id' => $sessionId,
            'category' => $category,
            'description' => $description,
            'user_id' => $userId,
            'reference_type' => $reference ? get_class($reference) : null,
            'reference_id' => $reference?->id,
        ]);
    }

    /**
     * Log money going out from cash register
     */
    public static function logCashOut(
        float $amount,
        int $sessionId,
        string $category,
        int $userId,
        ?string $description = null,
        ?Model $reference = null
    ): self {
        return self::create([
            'type' => 'out',
            'amount' => $amount,
            'source_type' => 'cash_register',
            'source_id' => $sessionId,
            'cash_register_session_id' => $sessionId,
            'category' => $category,
            'description' => $description,
            'user_id' => $userId,
            'reference_type' => $reference ? get_class($reference) : null,
            'reference_id' => $reference?->id,
        ]);
    }

    /**
     * Log money coming into bank account
     */
    public static function logBankIn(
        float $amount,
        int $bankAccountId,
        string $category,
        int $userId,
        ?string $description = null,
        ?Model $reference = null,
        ?int $cashRegisterSessionId = null
    ): self {
        return self::create([
            'type' => 'in',
            'amount' => $amount,
            'source_type' => 'bank_account',
            'source_id' => $bankAccountId,
            'cash_register_session_id' => $cashRegisterSessionId,
            'category' => $category,
            'description' => $description,
            'user_id' => $userId,
            'reference_type' => $reference ? get_class($reference) : null,
            'reference_id' => $reference?->id,
        ]);
    }

    /**
     * Log money going out from bank account
     */
    public static function logBankOut(
        float $amount,
        int $bankAccountId,
        string $category,
        int $userId,
        ?string $description = null,
        ?Model $reference = null,
        ?int $cashRegisterSessionId = null
    ): self {
        return self::create([
            'type' => 'out',
            'amount' => $amount,
            'source_type' => 'bank_account',
            'source_id' => $bankAccountId,
            'cash_register_session_id' => $cashRegisterSessionId,
            'category' => $category,
            'description' => $description,
            'user_id' => $userId,
            'reference_type' => $reference ? get_class($reference) : null,
            'reference_id' => $reference?->id,
        ]);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'address',
        'notes',
        'debt_balance',
    ];

    protected $casts = [
        'debt_balance' => 'decimal:2',
    ];
}

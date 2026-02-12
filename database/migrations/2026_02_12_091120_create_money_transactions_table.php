<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('money_transactions', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['in', 'out']);
            $table->decimal('amount', 10, 2);
            $table->enum('source_type', ['cash_register', 'bank_account']);
            $table->unsignedBigInteger('source_id')->nullable();
            $table->string('category'); // sale, refund, expense, deposit, withdrawal, transfer, opening_balance, debt_payment
            $table->text('description')->nullable();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->nullableMorphs('reference'); // Can reference Sale, Expense, etc.
            $table->timestamps();

            $table->index(['source_type', 'source_id']);
            $table->index('category');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('money_transactions');
    }
};

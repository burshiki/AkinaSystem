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
        Schema::table('income_expenses', function (Blueprint $table) {
            $table->boolean('is_system_generated')->default(false)->after('transaction_date');
            $table->index(['cash_register_session_id', 'is_system_generated'], 'income_expenses_session_system_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('income_expenses', function (Blueprint $table) {
            $table->dropIndex('income_expenses_session_system_idx');
            $table->dropColumn('is_system_generated');
        });
    }
};

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
        Schema::table('sales', function (Blueprint $table) {
            $table->enum('refund_source', ['cash', 'bank'])->nullable()->after('status');
            $table->foreignId('refund_bank_account_id')->nullable()->after('refund_source')->constrained('bank_accounts')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropForeign(['refund_bank_account_id']);
            $table->dropColumn(['refund_source', 'refund_bank_account_id']);
        });
    }
};

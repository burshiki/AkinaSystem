<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('money_transactions', function (Blueprint $table) {
            $table->foreignId('cash_register_session_id')
                ->nullable()
                ->after('source_id')
                ->constrained()
                ->nullOnDelete();
        });

        DB::table('money_transactions')
            ->where('source_type', 'cash_register')
            ->whereNull('cash_register_session_id')
            ->update(['cash_register_session_id' => DB::raw('source_id')]);
    }

    public function down(): void
    {
        Schema::table('money_transactions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('cash_register_session_id');
        });
    }
};

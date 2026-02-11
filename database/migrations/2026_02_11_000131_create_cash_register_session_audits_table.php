<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cash_register_session_audits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cash_register_session_id')
                ->constrained('cash_register_sessions')
                ->cascadeOnDelete();
            $table->foreignId('changed_by')
                ->constrained('users')
                ->cascadeOnDelete();
            $table->foreignId('approved_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->json('old_values');
            $table->json('new_values');
            $table->text('reason')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_register_session_audits');
    }
};

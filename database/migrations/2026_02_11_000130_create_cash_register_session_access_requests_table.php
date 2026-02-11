<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cash_register_session_access_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cash_register_session_id')
                ->constrained('cash_register_sessions')
                ->cascadeOnDelete();
            $table->foreignId('requested_by')
                ->constrained('users')
                ->cascadeOnDelete();
            $table->string('status', 20)->default('pending');
            $table->foreignId('approved_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('used_at')->nullable();
            $table->text('reason')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_register_session_access_requests');
    }
};

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
        Schema::create('item_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained('items')->cascadeOnDelete();
            $table->enum('type', ['received', 'adjustment', 'sale', 'assembly', 'reversed']);
            $table->integer('quantity_change'); // Can be negative
            $table->integer('old_stock');
            $table->integer('new_stock');
            $table->string('reference_type')->nullable(); // Polymorphic: PurchaseOrder, StockAdjustment, etc.
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->text('description')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['item_id', 'created_at']);
            $table->index(['reference_type', 'reference_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('item_logs');
    }
};

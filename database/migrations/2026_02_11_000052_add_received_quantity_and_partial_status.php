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
        Schema::table('purchase_order_items', function (Blueprint $table) {
            $table->integer('received_quantity')->default(0)->after('quantity');
        });

        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->enum('status', ['pending', 'approved', 'partially_received', 'received'])->default('pending')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('purchase_order_items', function (Blueprint $table) {
            $table->dropColumn('received_quantity');
        });

        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->enum('status', ['pending', 'approved', 'received'])->default('pending')->change();
        });
    }
};

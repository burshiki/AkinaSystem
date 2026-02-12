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
        Schema::table('items', function (Blueprint $table) {
            $table->string('brand')->nullable()->after('name');
            $table->string('serial_number')->nullable()->after('brand');
            $table->string('sku')->nullable()->after('serial_number');
            $table->string('barcode')->nullable()->after('sku');
            $table->boolean('has_warranty')->default(false)->after('barcode');
            $table->integer('warranty_months')->nullable()->after('has_warranty');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->dropColumn(['brand', 'serial_number', 'sku', 'barcode', 'has_warranty', 'warranty_months']);
        });
    }
};

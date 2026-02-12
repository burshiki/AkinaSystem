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
            // Drop the text brand column and add brand_id foreign key
            $table->dropColumn('brand');
            $table->foreignId('brand_id')->nullable()->after('name')->constrained('item_brands')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->dropForeignIdFor('ItemBrand');
            $table->string('brand')->nullable()->after('name');
        });
    }
};

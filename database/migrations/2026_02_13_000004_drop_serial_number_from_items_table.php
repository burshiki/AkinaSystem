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
        if (! Schema::hasColumn('items', 'serial_number')) {
            return;
        }

        Schema::table('items', function (Blueprint $table) {
            $table->dropColumn('serial_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('items', 'serial_number')) {
            return;
        }

        Schema::table('items', function (Blueprint $table) {
            $table->string('serial_number')->nullable()->after('brand_id');
        });
    }
};

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
        Schema::create('assembly_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assembly_id')->constrained('assemblies')->cascadeOnDelete();
            $table->foreignId('part_item_id')->constrained('items')->cascadeOnDelete();
            $table->integer('quantity_used'); // Quantity of this part used in the assembly
            $table->timestamps();

            $table->unique(['assembly_id', 'part_item_id']);
            $table->index('part_item_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assembly_items');
    }
};

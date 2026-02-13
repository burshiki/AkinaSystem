<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE warranties MODIFY serial_number VARCHAR(255) NULL');
    }

    public function down(): void
    {
        DB::statement("UPDATE warranties SET serial_number = CONCAT('NO-SERIAL-', id) WHERE serial_number IS NULL");
        DB::statement('ALTER TABLE warranties MODIFY serial_number VARCHAR(255) NOT NULL');
    }
};

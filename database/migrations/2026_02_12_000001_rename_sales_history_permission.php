<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $tableNames = config('permission.table_names', [
            'permissions' => 'permissions',
        ]);

        $permissionsTable = $tableNames['permissions'] ?? 'permissions';

        if (!Schema::hasTable($permissionsTable)) {
            return;
        }

        $oldName = 'access sales-history';
        $newName = 'access register-history';

        DB::table($permissionsTable)
            ->where('name', $oldName)
            ->update(['name' => $newName]);

        $exists = DB::table($permissionsTable)
            ->where('name', $newName)
            ->exists();

        if (!$exists) {
            DB::table($permissionsTable)->insert([
                'name' => $newName,
                'guard_name' => 'web',
            ]);
        }
    }

    public function down(): void
    {
        $tableNames = config('permission.table_names', [
            'permissions' => 'permissions',
        ]);

        $permissionsTable = $tableNames['permissions'] ?? 'permissions';

        if (!Schema::hasTable($permissionsTable)) {
            return;
        }

        $oldName = 'access sales-history';
        $newName = 'access register-history';

        DB::table($permissionsTable)
            ->where('name', $newName)
            ->update(['name' => $oldName]);
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use App\Models\User;

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

        $permissionName = 'access warranty';

        $exists = DB::table($permissionsTable)
            ->where('name', $permissionName)
            ->exists();

        if (!$exists) {
            DB::table($permissionsTable)->insert([
                'name' => $permissionName,
                'guard_name' => 'web',
            ]);
        }

        User::query()
            ->where('is_admin', true)
            ->each(fn (User $user) => $user->givePermissionTo($permissionName));
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

        DB::table($permissionsTable)
            ->where('name', 'access warranty')
            ->delete();

        User::query()
            ->where('is_admin', true)
            ->each(fn (User $user) => $user->revokePermissionTo('access warranty'));
    }
};

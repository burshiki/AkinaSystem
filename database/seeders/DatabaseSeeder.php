<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        $permissions = collect(config('permissions.modules', []))
            ->keys()
            ->map(fn (string $name) => Permission::findOrCreate($name))
            ->all();

        $user = User::query()->updateOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Louie',
                'password' => bcrypt('password'),
                'email_verified_at' => now(),
                'is_admin' => true,
            ]
        );

        $user->syncPermissions($permissions);
    }
}

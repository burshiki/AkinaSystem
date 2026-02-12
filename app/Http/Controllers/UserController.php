<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;

class UserController extends Controller
{
    public function index(): Response
    {
        $users = User::query()
            ->with('permissions')
            ->orderBy('name')
            ->paginate(15)
            ->through(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_admin' => $user->is_admin,
                'permissions' => $user->getPermissionNames(),
                'created_at' => optional($user->created_at)->toDateString(),
            ]);

        return Inertia::render('Users/Index', [
            'users' => $users,
            'permissions' => $this->permissionOptions(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Users/Create', [
            'permissions' => $this->permissionOptions(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', Password::min(8)],
            'is_admin' => ['boolean'],
            'permissions' => ['array'],
            'permissions.*' => ['string'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'is_admin' => $validated['is_admin'] ?? false,
        ]);

        $user->syncPermissions($this->resolvePermissions($validated));

        return redirect()->route('users.index');
    }

    public function edit(User $user): Response
    {
        return Inertia::render('Users/Edit', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'permissions' => $user->getPermissionNames(),
            ],
            'permissions' => $this->permissionOptions(),
        ]);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email,' . $user->id],
            'password' => ['nullable', 'string', Password::min(8)],
            'is_admin' => ['boolean'],
            'permissions' => ['array'],
            'permissions.*' => ['string'],
        ]);

        $user->update([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'is_admin' => $validated['is_admin'] ?? false,
        ]);

        if (! empty($validated['password'])) {
            $user->update([
                'password' => Hash::make($validated['password']),
            ]);
        }

        $user->syncPermissions($this->resolvePermissions($validated));

        return redirect()->route('users.index');
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        if ($request->user()?->id === $user->id) {
            return back()->withErrors([
                'user' => 'You cannot delete your own account.',
            ]);
        }

        $user->delete();

        return redirect()->route('users.index');
    }

    /**
     * @return array<int, array{name: string, label: string}>
     */
    private function permissionOptions(): array
    {
        $modules = config('permissions.modules', []);

        return collect($modules)
            ->map(fn (string $label, string $name) => [
                'name' => $name,
                'label' => $label,
            ])
            ->values()
            ->all();
    }

    /**
     * @param array<string, mixed> $validated
     * @return array<int, string>
     */
    private function resolvePermissions(array $validated): array
    {
        $allPermissions = collect(config('permissions.modules', []))
            ->keys()
            ->values();

        $selectedPermissions = ($validated['is_admin'] ?? false)
            ? $allPermissions
            : collect($validated['permissions'] ?? [])->values();

        $resolvedPermissions = $selectedPermissions
            ->intersect($allPermissions)
            ->unique()
            ->values();

        $resolvedPermissions->each(
            fn (string $name) => Permission::findOrCreate($name, 'web')
        );

        return $resolvedPermissions->all();
    }
}

import { Head, router, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, SharedData } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Users',
        href: '/users',
    },
];

type UserRow = {
    id: number;
    name: string;
    email: string;
    is_admin: boolean;
    permissions: string[];
    created_at?: string | null;
};

type PageProps = {
    users: UserRow[];
    permissions: PermissionOption[];
};

type PermissionOption = {
    name: string;
    label: string;
};

const formatPermission = (permission: string) => {
    if (!permission.startsWith('access ')) {
        return permission;
    }

    return permission.replace('access ', '').replace(/-/g, ' ');
};

export default function UsersIndex({ users, permissions }: PageProps) {
    const { auth } = usePage<SharedData>().props;
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserRow | null>(null);

    const createForm = useForm({
        name: '',
        email: '',
        password: '',
        is_admin: false,
        permissions: [] as string[],
    });

    const editForm = useForm({
        name: '',
        email: '',
        password: '',
        is_admin: false,
        permissions: [] as string[],
    });

    const permissionSet = useMemo(
        () => new Set(editForm.data.permissions),
        [editForm.data.permissions]
    );

    const handleDelete = (userId: number) => {
        if (!confirm('Delete this user?')) {
            return;
        }

        router.delete(`/users/${userId}`);
    };

    const handleCreateToggle = (open: boolean) => {
        setIsCreateOpen(open);
        if (!open) {
            createForm.reset();
            createForm.clearErrors();
        }
    };

    const handleEditToggle = (open: boolean) => {
        setIsEditOpen(open);
        if (!open) {
            setEditingUser(null);
            editForm.reset();
            editForm.clearErrors();
        }
    };

    const openEditModal = (user: UserRow) => {
        setEditingUser(user);
        setIsEditOpen(true);
    };

    useEffect(() => {
        if (!editingUser) {
            return;
        }

        editForm.setData({
            name: editingUser.name,
            email: editingUser.email,
            password: '',
            is_admin: editingUser.is_admin ?? false,
            permissions: editingUser.permissions ?? [],
        });
    }, [editingUser]);

    const handleCreateSubmit = (event: FormEvent) => {
        event.preventDefault();
        createForm.post('/users', {
            onSuccess: () => handleCreateToggle(false),
        });
    };

    const handleEditSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (!editingUser) {
            return;
        }

        editForm.put(`/users/${editingUser.id}`, {
            onSuccess: () => handleEditToggle(false),
        });
    };

    const toggleCreatePermission = (permission: string, checked: boolean) => {
        createForm.setData(
            'permissions',
            checked
                ? Array.from(
                      new Set([...createForm.data.permissions, permission])
                  )
                : createForm.data.permissions.filter(
                      (item) => item !== permission
                  )
        );
    };

    const toggleEditPermission = (permission: string, checked: boolean) => {
        editForm.setData(
            'permissions',
            checked
                ? Array.from(new Set([...editForm.data.permissions, permission]))
                : editForm.data.permissions.filter((item) => item !== permission)
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Users" />
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Users</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Manage user access per module.
                        </p>
                    </div>
                    <Button onClick={() => handleCreateToggle(true)}>
                        New user
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b text-left text-muted-foreground">
                                <tr>
                                    <th className="py-3 font-medium">Name</th>
                                    <th className="py-3 font-medium">Email</th>
                                    <th className="py-3 font-medium">Admin</th>
                                    <th className="py-3 font-medium">Access</th>
                                    <th className="py-3 text-right font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id} className="border-b last:border-0">
                                        <td className="py-3 font-medium text-foreground">
                                            {user.name}
                                        </td>
                                        <td className="py-3 text-muted-foreground">
                                            {user.email}
                                        </td>
                                        <td className="py-3">
                                            {user.is_admin && (
                                                <Badge variant="default">Admin</Badge>
                                            )}
                                        </td>
                                        <td className="py-3">
                                            <div className="flex flex-wrap gap-2">
                                                {user.permissions.length === 0 ? (
                                                    <Badge variant="outline">No access</Badge>
                                                ) : (
                                                    user.permissions.map((permission) => (
                                                        <Badge key={permission} variant="secondary">
                                                            {formatPermission(permission)}
                                                        </Badge>
                                                    ))
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="outline" size="sm" asChild>
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditModal(user)}
                                                    >
                                                        Edit
                                                    </button>
                                                </Button>
                                                {auth?.user?.id !== user.id && (
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => handleDelete(user.id)}
                                                    >
                                                        Delete
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isCreateOpen} onOpenChange={handleCreateToggle}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Create user</DialogTitle>
                        <DialogDescription>
                            Add a new user and select their module access.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubmit} className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="create-name">Name</Label>
                            <Input
                                id="create-name"
                                value={createForm.data.name}
                                onChange={(event) =>
                                    createForm.setData(
                                        'name',
                                        event.target.value
                                    )
                                }
                                placeholder="Full name"
                            />
                            <InputError message={createForm.errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="create-email">Email</Label>
                            <Input
                                id="create-email"
                                type="email"
                                value={createForm.data.email}
                                onChange={(event) =>
                                    createForm.setData(
                                        'email',
                                        event.target.value
                                    )
                                }
                                placeholder="Email address"
                            />
                            <InputError message={createForm.errors.email} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="create-password">Password</Label>
                            <Input
                                id="create-password"
                                type="password"
                                value={createForm.data.password}
                                onChange={(event) =>
                                    createForm.setData(
                                        'password',
                                        event.target.value
                                    )
                                }
                                placeholder="Temporary password"
                            />
                            <InputError message={createForm.errors.password} />
                        </div>

                        <div className="space-y-3">
                            <div className="text-sm font-medium text-foreground">
                                Module access
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {permissions.map((permission) => (
                                    <label
                                        key={permission.name}
                                        className="flex items-center gap-2 rounded-md border p-3 text-sm"
                                    >
                                        <Checkbox
                                            checked={createForm.data.permissions.includes(
                                                permission.name
                                            )}
                                            onCheckedChange={(checked) =>
                                                toggleCreatePermission(
                                                    permission.name,
                                                    checked === true
                                                )
                                            }
                                        />
                                        <span>{permission.label}</span>
                                    </label>
                                ))}
                            </div>
                            <InputError message={createForm.errors.permissions} />
                        </div>

                        <div className="grid gap-2">
                            <label className="flex items-center gap-2">
                                <Checkbox
                                    checked={createForm.data.is_admin}
                                    onCheckedChange={(checked) =>
                                        createForm.setData('is_admin', checked === true)
                                    }
                                />
                                <span className="text-sm font-medium">Administrator</span>
                            </label>
                            <p className="text-xs text-muted-foreground">
                                Admins have full system access regardless of module permissions.
                            </p>
                            <InputError message={createForm.errors.is_admin} />
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => handleCreateToggle(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createForm.processing}>
                                Save user
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isEditOpen} onOpenChange={handleEditToggle}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit user</DialogTitle>
                        <DialogDescription>
                            Update user details and module access.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEditSubmit} className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-name">Name</Label>
                            <Input
                                id="edit-name"
                                value={editForm.data.name}
                                onChange={(event) =>
                                    editForm.setData('name', event.target.value)
                                }
                                placeholder="Full name"
                            />
                            <InputError message={editForm.errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="edit-email">Email</Label>
                            <Input
                                id="edit-email"
                                type="email"
                                value={editForm.data.email}
                                onChange={(event) =>
                                    editForm.setData('email', event.target.value)
                                }
                                placeholder="Email address"
                            />
                            <InputError message={editForm.errors.email} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="edit-password">Password</Label>
                            <Input
                                id="edit-password"
                                type="password"
                                value={editForm.data.password}
                                onChange={(event) =>
                                    editForm.setData(
                                        'password',
                                        event.target.value
                                    )
                                }
                                placeholder="Leave blank to keep current"
                            />
                            <InputError message={editForm.errors.password} />
                        </div>

                        <div className="space-y-3">
                            <div className="text-sm font-medium text-foreground">
                                Module access
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {permissions.map((permission) => (
                                    <label
                                        key={permission.name}
                                        className="flex items-center gap-2 rounded-md border p-3 text-sm"
                                    >
                                        <Checkbox
                                            checked={permissionSet.has(
                                                permission.name
                                            )}
                                            onCheckedChange={(checked) =>
                                                toggleEditPermission(
                                                    permission.name,
                                                    checked === true
                                                )
                                            }
                                        />
                                        <span>{permission.label}</span>
                                    </label>
                                ))}
                            </div>
                            <InputError message={editForm.errors.permissions} />
                        </div>

                        <div className="grid gap-2">
                            <label className="flex items-center gap-2">
                                <Checkbox
                                    checked={editForm.data.is_admin}
                                    onCheckedChange={(checked) =>
                                        editForm.setData('is_admin', checked === true)
                                    }
                                />
                                <span className="text-sm font-medium">Administrator</span>
                            </label>
                            <p className="text-xs text-muted-foreground">
                                Admins have full system access regardless of module permissions.
                            </p>
                            <InputError message={editForm.errors.is_admin} />
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => handleEditToggle(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={editForm.processing}>
                                Update user
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

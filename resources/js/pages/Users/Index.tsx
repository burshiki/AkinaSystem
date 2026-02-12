import { Head, router, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, SharedData } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import Pagination, { type PaginationData } from '@/components/pagination';

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
    users: PaginationData<UserRow>;
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
    const [searchQuery, setSearchQuery] = useState('');

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
    const allPermissionNames = useMemo(
        () => permissions.map((permission) => permission.name),
        [permissions]
    );

    const filteredUsers = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) {
            return users.data;
        }

        return users.data.filter((user) => {
            const permissionsText = user.permissions.join(' ').toLowerCase();
            return (
                user.name.toLowerCase().includes(query) ||
                user.email.toLowerCase().includes(query) ||
                permissionsText.includes(query)
            );
        });
    }, [searchQuery, users]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (document.visibilityState !== 'visible') {
                return;
            }

            if (isCreateOpen || isEditOpen) {
                return;
            }

            router.reload({ only: ['users', 'permissions'] });
        }, 5000);

        return () => clearInterval(interval);
    }, [isCreateOpen, isEditOpen]);

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
            <div className="space-y-6">
                <div className="border-t">
                    <div className="border-b px-6 py-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
                                <Input
                                    value={searchQuery}
                                    onChange={(event) =>
                                        setSearchQuery(event.target.value)
                                    }
                                    placeholder="Search by name, email, or access"
                                    className="sm:w-72"
                                />
                            </div>
                            <Button onClick={() => handleCreateToggle(true)}>
                                Add User
                            </Button>
                </div>
                    </div>
                    <Table className="min-w-[720px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Access</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers.map((user) => (
                                <TableRow
                                    key={user.id}
                                    className="border-b last:border-0 odd:bg-muted/10"
                                >
                                    <TableCell className="font-medium text-foreground">
                                        {user.name}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {user.email}
                                    </TableCell>
                                    <TableCell>
                                        {user.is_admin ? (
                                            <Badge variant="default">Admin</Badge>
                                        ) : (
                                            <Badge variant="secondary">Standard</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-2">
                                            {user.permissions.length === 0 ? (
                                                <Badge variant="outline">
                                                    No access
                                                </Badge>
                                            ) : (
                                                <>
                                                    {user.permissions
                                                        .slice(0, 3)
                                                        .map((permission) => (
                                                            <Badge
                                                                key={permission}
                                                                variant="secondary"
                                                            >
                                                                {formatPermission(
                                                                    permission
                                                                )}
                                                            </Badge>
                                                        ))}
                                                    {user.permissions.length > 3 && (
                                                        <Badge variant="outline">
                                                            +
                                                            {user.permissions.length - 3}{' '}
                                                            more
                                                        </Badge>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    openEditModal(user)
                                                }
                                            >
                                                Edit
                                            </Button>
                                            {auth?.user?.id !== user.id && (
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleDelete(user.id)
                                                    }
                                                >
                                                    Delete
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {filteredUsers.length === 0 && (
                        <div className="border-t px-6 py-10 text-center text-sm text-muted-foreground">
                            {searchQuery
                                ? 'No users match your search.'
                                : 'No users found. Add your first account to get started.'}
                        </div>
                    )}
                    {!searchQuery && <Pagination data={users} />}
                </div>
            </div>

            <Dialog open={isCreateOpen} onOpenChange={handleCreateToggle}>
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Add User</DialogTitle>
                    </DialogHeader>
                    <hr />
                    <form
                        onSubmit={handleCreateSubmit}
                        className="max-h-[78vh] space-y-6 overflow-y-auto pr-1"
                    >
                        <div className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
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
                                        className={
                                            createForm.errors.name
                                                ? 'border-destructive focus-visible:ring-destructive'
                                                : undefined
                                        }
                                    />
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
                                        className={
                                            createForm.errors.email
                                                ? 'border-destructive focus-visible:ring-destructive'
                                                : undefined
                                        }
                                    />
                                </div>
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
                                    className={
                                        createForm.errors.password
                                            ? 'border-destructive focus-visible:ring-destructive'
                                            : undefined
                                    }
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="text-sm font-medium text-foreground">
                                Access configuration
                            </div>
                            <div
                                className={`max-h-72 overflow-y-auto rounded-md border p-3 ${
                                    createForm.errors.permissions
                                        ? 'ring-1 ring-destructive/60'
                                        : ''
                                }`}
                            >
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {permissions.map((permission) => (
                                        <label
                                            key={permission.name}
                                            className="flex items-center gap-2 rounded-md border bg-background p-3 text-sm"
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
                            </div>

                            <div
                                className={`grid gap-2 ${
                                    createForm.errors.is_admin
                                        ? 'rounded-md ring-1 ring-destructive/60'
                                        : ''
                                }`}
                            >
                                <label className="flex items-center gap-2">
                                    <Checkbox
                                        checked={createForm.data.is_admin}
                                        onCheckedChange={(checked) => {
                                            const isAdmin = checked === true;
                                            createForm.setData(
                                                'is_admin',
                                                isAdmin
                                            );
                                            createForm.setData(
                                                'permissions',
                                                isAdmin ? allPermissionNames : []
                                            );
                                        }}
                                    />
                                    <span className="text-sm font-medium">
                                        Administrator
                                    </span>
                                </label>
                                <p className="text-xs text-muted-foreground">
                                    Admins have full system access regardless of module permissions.
                                </p>
                            </div>
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
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Edit user</DialogTitle>
                        <DialogDescription>
                            Update user details and module access.
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={handleEditSubmit}
                        className="max-h-[78vh] space-y-6 overflow-y-auto pr-1"
                    >
                        <div className="space-y-4">
                            <div className="text-sm font-medium text-foreground">
                                Account details
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-name">Name</Label>
                                    <Input
                                        id="edit-name"
                                        value={editForm.data.name}
                                        onChange={(event) =>
                                            editForm.setData('name', event.target.value)
                                        }
                                        placeholder="Full name"
                                        className={
                                            editForm.errors.name
                                                ? 'border-destructive focus-visible:ring-destructive'
                                                : undefined
                                        }
                                    />
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
                                        className={
                                            editForm.errors.email
                                                ? 'border-destructive focus-visible:ring-destructive'
                                                : undefined
                                        }
                                    />
                                </div>
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
                                    className={
                                        editForm.errors.password
                                            ? 'border-destructive focus-visible:ring-destructive'
                                            : undefined
                                    }
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="text-sm font-medium text-foreground">
                                Access configuration
                            </div>
                            <div
                                className={`max-h-72 overflow-y-auto rounded-md border p-3 ${
                                    editForm.errors.permissions
                                        ? 'ring-1 ring-destructive/60'
                                        : ''
                                }`}
                            >
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {permissions.map((permission) => (
                                        <label
                                            key={permission.name}
                                            className="flex items-center gap-2 rounded-md border bg-background p-3 text-sm"
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
                            </div>

                            <div
                                className={`grid gap-2 ${
                                    editForm.errors.is_admin
                                        ? 'rounded-md ring-1 ring-destructive/60'
                                        : ''
                                }`}
                            >
                                <label className="flex items-center gap-2">
                                    <Checkbox
                                        checked={editForm.data.is_admin}
                                        onCheckedChange={(checked) => {
                                            const isAdmin = checked === true;
                                            editForm.setData(
                                                'is_admin',
                                                isAdmin
                                            );
                                            editForm.setData(
                                                'permissions',
                                                isAdmin ? allPermissionNames : []
                                            );
                                        }}
                                    />
                                    <span className="text-sm font-medium">
                                        Administrator
                                    </span>
                                </label>
                                <p className="text-xs text-muted-foreground">
                                    Admins have full system access regardless of module permissions.
                                </p>
                            </div>
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

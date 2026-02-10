import type { FormEvent } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Users',
        href: '/users',
    },
    {
        title: 'Edit',
        href: '/users/edit',
    },
];

type PermissionOption = {
    name: string;
    label: string;
};

type UserPayload = {
    id: number;
    name: string;
    email: string;
    permissions: string[];
};

type PageProps = {
    user: UserPayload;
    permissions: PermissionOption[];
};

export default function UsersEdit({ user, permissions }: PageProps) {
    const { data, setData, put, processing, errors } = useForm({
        name: user.name,
        email: user.email,
        password: '',
        permissions: user.permissions ?? [],
    });

    const togglePermission = (permission: string, checked: boolean) => {
        setData(
            'permissions',
            checked
                ? Array.from(new Set([...data.permissions, permission]))
                : data.permissions.filter((item) => item !== permission)
        );
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        put(`/users/${user.id}`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit user" />
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Edit user</CardTitle>
                    <Button variant="outline" asChild>
                        <Link href="/users">Back</Link>
                    </Button>
                </CardHeader>
                <CardContent>
                    <form onSubmit={submit} className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(event) =>
                                    setData('name', event.target.value)
                                }
                            />
                            <InputError message={errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={data.email}
                                onChange={(event) =>
                                    setData('email', event.target.value)
                                }
                            />
                            <InputError message={errors.email} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={data.password}
                                onChange={(event) =>
                                    setData('password', event.target.value)
                                }
                                placeholder="Leave blank to keep current password"
                            />
                            <InputError message={errors.password} />
                        </div>

                        <div className="space-y-3">
                            <div className="text-sm font-medium text-foreground">
                                Module access
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {permissions.map((permission) => (
                                    <label
                                        key={permission.name}
                                        className="flex items-center gap-2 rounded-md border p-3 text-sm"
                                    >
                                        <Checkbox
                                            checked={data.permissions.includes(permission.name)}
                                            onCheckedChange={(checked) =>
                                                togglePermission(
                                                    permission.name,
                                                    checked === true
                                                )
                                            }
                                        />
                                        <span>{permission.label}</span>
                                    </label>
                                ))}
                            </div>
                            <InputError message={errors.permissions} />
                        </div>

                        <div className="flex items-center gap-3">
                            <Button type="submit" disabled={processing}>
                                Update user
                            </Button>
                            <Button variant="ghost" asChild>
                                <Link href="/users">Cancel</Link>
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </AppLayout>
    );
}

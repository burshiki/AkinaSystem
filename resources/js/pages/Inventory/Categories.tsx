import { Head, router, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    { title: 'Inventory', href: '/inventory/items' },
    { title: 'Item Category', href: '/inventory/categories' },
];

type CategoryRow = {
    id: number;
    name: string;
    items_count: number;
};

type PageProps = {
    categories: CategoryRow[];
};

export default function InventoryCategories({ categories }: PageProps) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<CategoryRow | null>(null);

    const createForm = useForm({
        name: '',
    });

    const editForm = useForm({
        name: '',
    });

    const handleDelete = (categoryId: number) => {
        if (!confirm('Delete this category? Items in this category will not be deleted.')) {
            return;
        }

        router.delete(`/inventory/categories/${categoryId}`);
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
            setEditingCategory(null);
            editForm.reset();
            editForm.clearErrors();
        }
    };

    const openEditModal = (category: CategoryRow) => {
        setEditingCategory(category);
        setIsEditOpen(true);
    };

    useEffect(() => {
        if (!editingCategory) {
            return;
        }

        editForm.setData({
            name: editingCategory.name,
        });
    }, [editingCategory]);

    const handleCreateSubmit = (event: FormEvent) => {
        event.preventDefault();
        createForm.post('/inventory/categories', {
            onSuccess: () => handleCreateToggle(false),
        });
    };

    const handleEditSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (!editingCategory) {
            return;
        }

        editForm.put(`/inventory/categories/${editingCategory.id}`, {
            onSuccess: () => handleEditToggle(false),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inventory - Item Category" />
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Item Categories</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Manage inventory item categories.
                        </p>
                    </div>
                    <Button onClick={() => handleCreateToggle(true)}>
                        New category
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b text-left text-muted-foreground">
                                <tr>
                                    <th className="py-3 font-medium">Name</th>
                                    <th className="py-3 font-medium">Items</th>
                                    <th className="py-3 text-right font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categories.map((category) => (
                                    <tr key={category.id} className="border-b last:border-0">
                                        <td className="py-3 font-medium text-foreground">
                                            {category.name}
                                        </td>
                                        <td className="py-3">
                                            <Badge variant="secondary">
                                                {category.items_count} items
                                            </Badge>
                                        </td>
                                        <td className="py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    asChild
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openEditModal(category)
                                                        }
                                                    >
                                                        Edit
                                                    </button>
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleDelete(category.id)
                                                    }
                                                >
                                                    Delete
                                                </Button>
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
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create category</DialogTitle>
                        <DialogDescription>
                            Add a new item category.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubmit} className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="create-name">Name</Label>
                            <Input
                                id="create-name"
                                value={createForm.data.name}
                                onChange={(event) =>
                                    createForm.setData('name', event.target.value)
                                }
                                placeholder="Category name"
                            />
                            <InputError message={createForm.errors.name} />
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
                                Save category
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isEditOpen} onOpenChange={handleEditToggle}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit category</DialogTitle>
                        <DialogDescription>Update category details.</DialogDescription>
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
                                placeholder="Category name"
                            />
                            <InputError message={editForm.errors.name} />
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
                                Update category
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

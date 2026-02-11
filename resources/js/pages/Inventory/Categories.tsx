import { Head, Link, router, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    categories: {
        data: CategoryRow[];
        links: Array<{
            url: string | null;
            label: string;
            active: boolean;
        }>;
    };
};

export default function InventoryCategories({ categories }: PageProps) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<CategoryRow | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const createForm = useForm({
        name: '',
    });

    const editForm = useForm({
        name: '',
    });

    const filteredCategories = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) {
            return categories.data;
        }

        return categories.data.filter((category) =>
            category.name.toLowerCase().includes(query)
        );
    }, [categories, searchQuery]);

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

    // Auto-refresh to sync data across users
    useEffect(() => {
        const interval = setInterval(() => {
            // Only refresh if page is visible and no modals are open
            if (document.visibilityState === 'visible' && 
                !isCreateOpen && !isEditOpen) {
                router.reload({ only: ['categories'] });
            }
        }, 5000); // Refresh every 5 seconds

        return () => clearInterval(interval);
    }, [isCreateOpen, isEditOpen]);

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
                                    placeholder="Search categories"
                                    className="sm:w-72"
                                />
                            </div>
                            <Button onClick={() => handleCreateToggle(true)}>
                                Add Category
                            </Button>
                        </div>
                    </div>
                    <Table className="min-w-[520px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Items</TableHead>
                                <TableHead className="text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCategories.map((category) => (
                                <TableRow
                                    key={category.id}
                                    className="border-b last:border-0 odd:bg-muted/10"
                                >
                                    <TableCell className="font-medium text-foreground">
                                        {category.name}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">
                                            {category.items_count} items
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    openEditModal(category)
                                                }
                                            >
                                                Edit
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
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {filteredCategories.length === 0 && (
                        <div className="border-t px-6 py-10 text-center text-sm text-muted-foreground">
                            {searchQuery
                                ? 'No categories match your search.'
                                : 'No categories found. Add your first category to get started.'}
                        </div>
                    )}
                    {categories.links.length > 1 && (
                        <div className="border-t px-6 py-4">
                            <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
                                {categories.links.map((link) => {
                                    if (!link.url) {
                                        return (
                                            <span
                                                key={link.label}
                                                className="rounded-md border px-3 py-1 text-muted-foreground"
                                                dangerouslySetInnerHTML={{
                                                    __html: link.label,
                                                }}
                                            />
                                        );
                                    }

                                    return (
                                        <Link
                                            key={link.label}
                                            href={link.url}
                                            className={
                                                link.active
                                                    ? 'rounded-md border border-primary bg-primary px-3 py-1 text-primary-foreground'
                                                    : 'rounded-md border px-3 py-1 text-foreground hover:bg-muted'
                                            }
                                            dangerouslySetInnerHTML={{
                                                __html: link.label,
                                            }}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={isCreateOpen} onOpenChange={handleCreateToggle}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Category</DialogTitle>
                    </DialogHeader>
                    <hr />
                    <form onSubmit={handleCreateSubmit} className="space-y-6">
                        <div className="space-y-4">
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
                                    placeholder="Category name"
                                    className={
                                        createForm.errors.name
                                            ? 'border-destructive focus-visible:ring-destructive'
                                            : undefined
                                    }
                                />
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
                                Save category
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isEditOpen} onOpenChange={handleEditToggle}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Category</DialogTitle>
                    </DialogHeader>
                    <hr />
                    <form onSubmit={handleEditSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-name">Name</Label>
                                <Input
                                    id="edit-name"
                                    value={editForm.data.name}
                                    onChange={(event) =>
                                        editForm.setData(
                                            'name',
                                            event.target.value
                                        )
                                    }
                                    placeholder="Category name"
                                    className={
                                        editForm.errors.name
                                            ? 'border-destructive focus-visible:ring-destructive'
                                            : undefined
                                    }
                                />
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
                                Update category
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

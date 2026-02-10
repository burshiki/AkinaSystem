import { Head, router, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import InputError from '@/components/input-error';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inventory', href: '/inventory/items' },
    { title: 'Item List', href: '/inventory/items' },
];

type ItemRow = {
    id: number;
    name: string;
    category?: string;
    category_id?: number | null;
    price: string;
    cost: string;
    stock: number;
    is_assemblable: boolean;
};

type CategoryOption = {
    id: number;
    name: string;
};

type PageProps = {
    items: ItemRow[];
    categories: CategoryOption[];
};

export default function InventoryItems({ items, categories }: PageProps) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ItemRow | null>(null);

    const createForm = useForm({
        name: '',
        category_id: '' as string | number,
        price: '',
        cost: '',
        stock: 0,
        is_assemblable: false,
    });

    const editForm = useForm({
        name: '',
        category_id: '' as string | number,
        price: '',
        cost: '',
        stock: 0,
        is_assemblable: false,
    });

    const handleDelete = (itemId: number) => {
        if (!confirm('Delete this item?')) {
            return;
        }

        router.delete(`/inventory/items/${itemId}`);
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
            setEditingItem(null);
            editForm.reset();
            editForm.clearErrors();
        }
    };

    const openEditModal = (item: ItemRow) => {
        setEditingItem(item);
        setIsEditOpen(true);
    };

    useEffect(() => {
        if (!editingItem) {
            return;
        }

        editForm.setData({
            name: editingItem.name,
            category_id: editingItem.category_id ?? '',
            price: editingItem.price,
            cost: editingItem.cost,
            stock: editingItem.stock,
            is_assemblable: editingItem.is_assemblable,
        });
    }, [editingItem]);

    const handleCreateSubmit = (event: FormEvent) => {
        event.preventDefault();
        createForm.post('/inventory/items', {
            onSuccess: () => handleCreateToggle(false),
        });
    };

    const handleEditSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (!editingItem) {
            return;
        }

        editForm.put(`/inventory/items/${editingItem.id}`, {
            onSuccess: () => handleEditToggle(false),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inventory - Item List" />
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Item List</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Manage inventory items and stock.
                        </p>
                    </div>
                    <Button onClick={() => handleCreateToggle(true)}>
                        New item
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b text-left text-muted-foreground">
                                <tr>
                                    <th className="py-3 font-medium">Name</th>
                                    <th className="py-3 font-medium">Category</th>
                                    <th className="py-3 text-right font-medium">Price</th>
                                    <th className="py-3 text-right font-medium">Cost</th>
                                    <th className="py-3 text-right font-medium">Stock</th>
                                    <th className="py-3 text-right font-medium">Assemble?</th>
                                    <th className="py-3 text-right font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => (
                                    <tr key={item.id} className="border-b last:border-0">
                                        <td className="py-3 font-medium text-foreground">
                                            {item.name}
                                        </td>
                                        <td className="py-3 text-muted-foreground">
                                            {item.category ?? '-'}
                                        </td>
                                        <td className="py-3 text-right text-muted-foreground">
                                            ₱{item.price}
                                        </td>
                                        <td className="py-3 text-right text-muted-foreground">
                                            ₱{item.cost}
                                        </td>
                                        <td className="py-3 text-right text-muted-foreground">
                                            {item.stock}
                                        </td>
                                        <td className="py-3 text-right text-muted-foregroun">
                                            {item.is_assemblable ? (
                                                <Badge variant="secondary">Yes</Badge>
                                            ) : (
                                                <Badge variant="outline">No</Badge>
                                            )}
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
                                                            openEditModal(item)
                                                        }
                                                    >
                                                        Edit
                                                    </button>
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleDelete(item.id)
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
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Create item</DialogTitle>
                        <DialogDescription>
                            Add a new inventory item.
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
                                placeholder="Item name"
                            />
                            <InputError message={createForm.errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="create-category">Category</Label>
                            <Select
                                value={
                                    createForm.data.category_id
                                        ? String(createForm.data.category_id)
                                        : ''
                                }
                                onValueChange={(value) =>
                                    createForm.setData(
                                        'category_id',
                                        value ? Number(value) : ''
                                    )
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((category) => (
                                        <SelectItem
                                            key={category.id}
                                            value={String(category.id)}
                                        >
                                            {category.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={createForm.errors.category_id} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="create-price">Price</Label>
                                <Input
                                    id="create-price"
                                    type="number"
                                    step="0.01"
                                    value={createForm.data.price}
                                    onChange={(event) =>
                                        createForm.setData(
                                            'price',
                                            event.target.value
                                        )
                                    }
                                    placeholder="0.00"
                                />
                                <InputError message={createForm.errors.price} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="create-cost">Cost</Label>
                                <Input
                                    id="create-cost"
                                    type="number"
                                    step="0.01"
                                    value={createForm.data.cost}
                                    onChange={(event) =>
                                        createForm.setData('cost', event.target.value)
                                    }
                                    placeholder="0.00"
                                />
                                <InputError message={createForm.errors.cost} />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="create-stock">Initial Stock</Label>
                            <Input
                                id="create-stock"
                                type="number"
                                value={createForm.data.stock}
                                onChange={(event) =>
                                    createForm.setData(
                                        'stock',
                                        Number(event.target.value)
                                    )
                                }
                                placeholder="0"
                            />
                            <InputError message={createForm.errors.stock} />
                        </div>

                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="create-assemblable"
                                checked={createForm.data.is_assemblable}
                                onCheckedChange={(checked) =>
                                    createForm.setData(
                                        'is_assemblable',
                                        checked === true
                                    )
                                }
                            />
                            <Label htmlFor="create-assemblable" className="cursor-pointer">
                                Allow item to be assembled into new products
                            </Label>
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
                                Save item
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isEditOpen} onOpenChange={handleEditToggle}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Edit item</DialogTitle>
                        <DialogDescription>Update item details.</DialogDescription>
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
                                placeholder="Item name"
                            />
                            <InputError message={editForm.errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="edit-category">Category</Label>
                            <Select
                                value={
                                    editForm.data.category_id
                                        ? String(editForm.data.category_id)
                                        : ''
                                }
                                onValueChange={(value) =>
                                    editForm.setData(
                                        'category_id',
                                        value ? Number(value) : ''
                                    )
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((category) => (
                                        <SelectItem
                                            key={category.id}
                                            value={String(category.id)}
                                        >
                                            {category.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={editForm.errors.category_id} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-price">Price</Label>
                                <Input
                                    id="edit-price"
                                    type="number"
                                    step="0.01"
                                    value={editForm.data.price}
                                    onChange={(event) =>
                                        editForm.setData('price', event.target.value)
                                    }
                                    placeholder="0.00"
                                />
                                <InputError message={editForm.errors.price} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-cost">Cost</Label>
                                <Input
                                    id="edit-cost"
                                    type="number"
                                    step="0.01"
                                    value={editForm.data.cost}
                                    onChange={(event) =>
                                        editForm.setData('cost', event.target.value)
                                    }
                                    placeholder="0.00"
                                />
                                <InputError message={editForm.errors.cost} />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="edit-stock">Stock</Label>
                            <Input
                                id="edit-stock"
                                type="number"
                                value={editForm.data.stock}
                                onChange={(event) =>
                                    editForm.setData(
                                        'stock',
                                        Number(event.target.value)
                                    )
                                }
                                placeholder="0"
                            />
                            <InputError message={editForm.errors.stock} />
                        </div>

                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="edit-assemblable"
                                checked={editForm.data.is_assemblable}
                                onCheckedChange={(checked) =>
                                    editForm.setData(
                                        'is_assemblable',
                                        checked === true
                                    )
                                }
                            />
                            <Label htmlFor="edit-assemblable" className="cursor-pointer">
                                Allow item to be assembled into new products
                            </Label>
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
                                Update item
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

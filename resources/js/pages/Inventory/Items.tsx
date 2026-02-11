import { Head, router, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
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
    is_main_assembly: boolean;
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
    const [searchQuery, setSearchQuery] = useState('');

    const createForm = useForm({
        name: '',
        category_id: '' as string | number,
        price: '',
        cost: '',
        stock: 0,
        is_assemblable: false,
        is_main_assembly: false,
    });

    const editForm = useForm({
        name: '',
        category_id: '' as string | number,
        price: '',
        cost: '',
        stock: 0,
        is_assemblable: false,
        is_main_assembly: false,
    });

    const filteredItems = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) {
            return items;
        }

        return items.filter((item) => {
            const category = item.category ?? '';
            return (
                item.name.toLowerCase().includes(query) ||
                category.toLowerCase().includes(query)
            );
        });
    }, [items, searchQuery]);

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
            is_main_assembly: editingItem.is_main_assembly,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
                                    placeholder="Search by name or category"
                                    className="sm:w-72"
                                />
                            </div>
                            <Button onClick={() => handleCreateToggle(true)}>
                                Add Item
                            </Button>
                        </div>
                    </div>
                    <Table className="min-w-[720px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-right">
                                    Price
                                </TableHead>
                                <TableHead className="text-right">Cost</TableHead>
                                <TableHead className="text-right">Stock</TableHead>
                                <TableHead className="text-right">
                                    Assemble?
                                </TableHead>
                                <TableHead className="text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredItems.map((item) => (
                                <TableRow
                                    key={item.id}
                                    className="border-b last:border-0 odd:bg-muted/10"
                                >
                                    <TableCell className="font-medium text-foreground">
                                        {item.name}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {item.category ?? '-'}
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                        ₱{item.price}
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                        {item.cost ? `₱${item.cost}` : '-'}
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                        {item.stock}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {item.is_assemblable ? (
                                            <Badge variant="secondary">Yes</Badge>
                                        ) : (
                                            <Badge variant="outline">No</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openEditModal(item)}
                                            >
                                                Edit
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
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {filteredItems.length === 0 && (
                        <div className="border-t px-6 py-10 text-center text-sm text-muted-foreground">
                            {searchQuery
                                ? 'No items match your search.'
                                : 'No items found. Add your first item to get started.'}
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={isCreateOpen} onOpenChange={handleCreateToggle}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Add Item</DialogTitle>
                    </DialogHeader>
                    <hr />
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
                                className={
                                    createForm.errors.name
                                        ? 'border-destructive focus-visible:ring-destructive'
                                        : undefined
                                }
                            />
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
                                <SelectTrigger
                                    className={
                                        createForm.errors.category_id
                                            ? 'border-destructive focus-visible:ring-destructive'
                                            : undefined
                                    }
                                >
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
                                    className={
                                        createForm.errors.price
                                            ? 'border-destructive focus-visible:ring-destructive'
                                            : undefined
                                    }
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="create-cost">Cost (Optional)</Label>
                                <Input
                                    id="create-cost"
                                    type="number"
                                    step="0.01"
                                    value={createForm.data.cost}
                                    onChange={(event) =>
                                        createForm.setData('cost', event.target.value)
                                    }
                                    placeholder="0.00"
                                    className={
                                        createForm.errors.cost
                                            ? 'border-destructive focus-visible:ring-destructive'
                                            : undefined
                                    }
                                />
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
                                className={
                                    createForm.errors.stock
                                        ? 'border-destructive focus-visible:ring-destructive'
                                        : undefined
                                }
                            />
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

                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="create-main-assembly"
                                checked={createForm.data.is_main_assembly}
                                onCheckedChange={(checked) =>
                                    createForm.setData(
                                        'is_main_assembly',
                                        checked === true
                                    )
                                }
                            />
                            <Label htmlFor="create-main-assembly" className="cursor-pointer">
                                Main assembly (finished product)
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
                        <DialogTitle>Edit Item</DialogTitle>
                    </DialogHeader>
                    <hr />
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
                                className={
                                    editForm.errors.name
                                        ? 'border-destructive focus-visible:ring-destructive'
                                        : undefined
                                }
                            />
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
                                <SelectTrigger
                                    className={
                                        editForm.errors.category_id
                                            ? 'border-destructive focus-visible:ring-destructive'
                                            : undefined
                                    }
                                >
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
                                    className={
                                        editForm.errors.price
                                            ? 'border-destructive focus-visible:ring-destructive'
                                            : undefined
                                    }
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-cost">Cost (Optional)</Label>
                                <Input
                                    id="edit-cost"
                                    type="number"
                                    step="0.01"
                                    value={editForm.data.cost}
                                    onChange={(event) =>
                                        editForm.setData('cost', event.target.value)
                                    }
                                    placeholder="0.00"
                                    className={
                                        editForm.errors.cost
                                            ? 'border-destructive focus-visible:ring-destructive'
                                            : undefined
                                    }
                                />
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
                                className={
                                    editForm.errors.stock
                                        ? 'border-destructive focus-visible:ring-destructive'
                                        : undefined
                                }
                            />
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

                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="edit-main-assembly"
                                checked={editForm.data.is_main_assembly}
                                onCheckedChange={(checked) =>
                                    editForm.setData(
                                        'is_main_assembly',
                                        checked === true
                                    )
                                }
                            />
                            <Label htmlFor="edit-main-assembly" className="cursor-pointer">
                                Main assembly (finished product)
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

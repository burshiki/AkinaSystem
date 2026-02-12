import { Head, Link, router, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
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
    brand_id?: number | null;
    brand?: string | null;
    serial_number?: string | null;
    sku?: string | null;
    barcode?: string | null;
    has_warranty: boolean;
    warranty_months?: number | null;
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

type BrandOption = {
    id: number;
    name: string;
};

type PageProps = {
    items: {
        data: ItemRow[];
        links: Array<{
            url: string | null;
            label: string;
            active: boolean;
        }>;
    };
    categories: CategoryOption[];
    brands: BrandOption[];
};

export default function InventoryItems({ items, categories, brands }: PageProps) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isCreateBrandOpen, setIsCreateBrandOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ItemRow | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const createForm = useForm({
        name: '',
        brand_id: '' as string | number,
        serial_number: '',
        sku: '',
        barcode: '',
        has_warranty: true,
        warranty_months: '',
        category_id: '' as string | number,
        price: '',
        cost: '',
        stock: 0,
        is_assemblable: false,
        is_main_assembly: false,
    });

    const editForm = useForm({
        name: '',
        brand_id: '' as string | number,
        serial_number: '',
        sku: '',
        barcode: '',
        has_warranty: false,
        warranty_months: '',
        category_id: '' as string | number,
        price: '',
        cost: '',
        stock: 0,
        is_assemblable: false,
        is_main_assembly: false,
    });

    const createBrandForm = useForm({
        name: '',
    });

    const filteredItems = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) {
            return items.data;
        }

        return items.data.filter((item) => {
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
            brand_id: editingItem.brand_id ?? '',
            serial_number: editingItem.serial_number ?? '',
            sku: editingItem.sku ?? '',
            barcode: editingItem.barcode ?? '',
            has_warranty: editingItem.has_warranty,
            warranty_months: editingItem.warranty_months ? String(editingItem.warranty_months) : '',
            category_id: editingItem.category_id ?? '',
            price: editingItem.price,
            cost: editingItem.cost,
            stock: editingItem.stock,
            is_assemblable: editingItem.is_assemblable,
            is_main_assembly: editingItem.is_main_assembly,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editingItem]);

    // Auto-refresh to sync data across users
    useEffect(() => {
        const interval = setInterval(() => {
            // Only refresh if page is visible and no modals are open
            if (document.visibilityState === 'visible' && 
                !isCreateOpen && !isEditOpen && !isCreateBrandOpen) {
                router.reload({ only: ['items', 'categories', 'brands'] });
            }
        }, 5000); // Refresh every 5 seconds

        return () => clearInterval(interval);
    }, [isCreateOpen, isEditOpen, isCreateBrandOpen]);

    const handleCreateSubmit = (event: FormEvent) => {
        event.preventDefault();
        createForm.post('/inventory/items', {
            onSuccess: () => handleCreateToggle(false),
        });
    };

    const handleCreateBrandToggle = (open: boolean) => {
        setIsCreateBrandOpen(open);
        if (!open) {
            createBrandForm.reset();
            createBrandForm.clearErrors();
        }
    };

    const handleCreateBrandSubmit = (event: FormEvent) => {
        event.preventDefault();
        
        createBrandForm.post('/inventory/brands', {
            onSuccess: () => {
                // Close dialog and reset form
                setIsCreateBrandOpen(false);
                createBrandForm.reset();
                
                // Reload brands to get the newly created one
                router.reload({ only: ['brands'] });
            },
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
                    <Table className="min-w-180">
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
                    {items.links.length > 1 && (
                        <div className="border-t px-6 py-4">
                            <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
                                {items.links.map((link) => {
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
                            {createForm.errors.name && (
                                <p className="text-xs text-destructive">
                                    {createForm.errors.name}
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="create-brand">Brand</Label>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleCreateBrandToggle(true)}
                                    >
                                        + Add
                                    </Button>
                                </div>
                                <Select
                                    value={
                                        createForm.data.brand_id
                                            ? String(createForm.data.brand_id)
                                            : ''
                                    }
                                    onValueChange={(value) =>
                                        createForm.setData(
                                            'brand_id',
                                            value ? Number(value) : ''
                                        )
                                    }
                                >
                                    <SelectTrigger
                                        className={
                                            createForm.errors.brand_id
                                                ? 'border-destructive focus-visible:ring-destructive'
                                                : undefined
                                        }
                                    >
                                        <SelectValue placeholder="Select brand" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {brands.map((brand) => (
                                            <SelectItem
                                                key={brand.id}
                                                value={String(brand.id)}
                                            >
                                                {brand.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {createForm.errors.brand_id && (
                                    <p className="text-xs text-destructive">
                                        {createForm.errors.brand_id}
                                    </p>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="create-serial">Serial Number</Label>
                                <Input
                                    id="create-serial"
                                    value={createForm.data.serial_number}
                                    onChange={(event) =>
                                        createForm.setData('serial_number', event.target.value)
                                    }
                                    placeholder="Serial number"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="create-sku">SKU</Label>
                                <Input
                                    id="create-sku"
                                    value={createForm.data.sku}
                                    onChange={(event) =>
                                        createForm.setData('sku', event.target.value)
                                    }
                                    placeholder="SKU"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="create-barcode">Barcode</Label>
                                <Input
                                    id="create-barcode"
                                    value={createForm.data.barcode}
                                    onChange={(event) =>
                                        createForm.setData('barcode', event.target.value)
                                    }
                                    placeholder="Barcode"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="create-warranty"
                                checked={createForm.data.has_warranty}
                                onCheckedChange={(checked) =>
                                    createForm.setData(
                                        'has_warranty',
                                        checked === true
                                    )
                                }
                            />
                            <Label htmlFor="create-warranty" className="cursor-pointer">
                                Has warranty
                            </Label>
                        </div>

                        {createForm.data.has_warranty && (
                            <div className="grid gap-2">
                                <Label htmlFor="create-warranty-months">Warranty (months)</Label>
                                <Input
                                    id="create-warranty-months"
                                    type="text"
                                    inputMode="numeric"
                                    pattern="^\d*$"
                                    value={createForm.data.warranty_months}
                                    onChange={(event) =>
                                        createForm.setData(
                                            'warranty_months',
                                            event.target.value
                                        )
                                    }
                                    placeholder="0"
                                    disabled={!createForm.data.has_warranty}
                                />
                            </div>
                        )}

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
                            {createForm.errors.category_id && (
                                <p className="text-xs text-destructive">
                                    {createForm.errors.category_id}
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="create-price">Price</Label>
                                <Input
                                    id="create-price"
                                    type="text"
                                    inputMode="decimal"
                                    pattern="^\d*(\.\d{0,2})?$"
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
                                {createForm.errors.price && (
                                    <p className="text-xs text-destructive">
                                        {createForm.errors.price}
                                    </p>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="create-cost">Cost (Optional)</Label>
                                <Input
                                    id="create-cost"
                                    type="text"
                                    inputMode="decimal"
                                    pattern="^\d*(\.\d{0,2})?$"
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
                                {createForm.errors.cost && (
                                    <p className="text-xs text-destructive">
                                        {createForm.errors.cost}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="create-stock">Initial Stock</Label>
                            <Input
                                id="create-stock"
                                type="text"
                                inputMode="numeric"
                                pattern="^\d*$"
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
                            {createForm.errors.stock && (
                                <p className="text-xs text-destructive">
                                    {createForm.errors.stock}
                                </p>
                            )}
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
                            {editForm.errors.name && (
                                <p className="text-xs text-destructive">
                                    {editForm.errors.name}
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-brand">Brand</Label>
                                <Select
                                    value={editForm.data.brand_id ? String(editForm.data.brand_id) : ''}
                                    onValueChange={(value) =>
                                        editForm.setData(
                                            'brand_id',
                                            value ? Number(value) : ''
                                        )
                                    }
                                >
                                    <SelectTrigger id="edit-brand">
                                        <SelectValue placeholder="Select a brand" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {brands.map((brand) => (
                                            <SelectItem
                                                key={brand.id}
                                                value={String(brand.id)}
                                            >
                                                {brand.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCreateBrandToggle(true)}
                                    className="w-full"
                                >
                                    + Add Brand
                                </Button>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-serial">Serial Number</Label>
                                <Input
                                    id="edit-serial"
                                    value={editForm.data.serial_number}
                                    onChange={(event) =>
                                        editForm.setData('serial_number', event.target.value)
                                    }
                                    placeholder="Serial number"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-sku">SKU</Label>
                                <Input
                                    id="edit-sku"
                                    value={editForm.data.sku}
                                    onChange={(event) =>
                                        editForm.setData('sku', event.target.value)
                                    }
                                    placeholder="SKU"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-barcode">Barcode</Label>
                                <Input
                                    id="edit-barcode"
                                    value={editForm.data.barcode}
                                    onChange={(event) =>
                                        editForm.setData('barcode', event.target.value)
                                    }
                                    placeholder="Barcode"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="edit-warranty"
                                checked={editForm.data.has_warranty}
                                onCheckedChange={(checked) =>
                                    editForm.setData(
                                        'has_warranty',
                                        checked === true
                                    )
                                }
                            />
                            <Label htmlFor="edit-warranty" className="cursor-pointer">
                                Has warranty
                            </Label>
                        </div>

                        {editForm.data.has_warranty && (
                            <div className="grid gap-2">
                                <Label htmlFor="edit-warranty-months">Warranty (months)</Label>
                                <Input
                                    id="edit-warranty-months"
                                    type="text"
                                    inputMode="numeric"
                                    pattern="^\d*$"
                                    value={editForm.data.warranty_months}
                                    onChange={(event) =>
                                        editForm.setData(
                                            'warranty_months',
                                            event.target.value
                                        )
                                    }
                                    placeholder="0"
                                    disabled={!editForm.data.has_warranty}
                                />
                            </div>
                        )}

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
                            {editForm.errors.category_id && (
                                <p className="text-xs text-destructive">
                                    {editForm.errors.category_id}
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-price">Price</Label>
                                <Input
                                    id="edit-price"
                                    type="text"
                                    inputMode="decimal"
                                    pattern="^\d*(\.\d{0,2})?$"
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
                                {editForm.errors.price && (
                                    <p className="text-xs text-destructive">
                                        {editForm.errors.price}
                                    </p>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-cost">Cost (Optional)</Label>
                                <Input
                                    id="edit-cost"
                                    type="text"
                                    inputMode="decimal"
                                    pattern="^\d*(\.\d{0,2})?$"
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
                                {editForm.errors.cost && (
                                    <p className="text-xs text-destructive">
                                        {editForm.errors.cost}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="edit-stock">Stock</Label>
                            <Input
                                id="edit-stock"
                                type="text"
                                inputMode="numeric"
                                pattern="^\d*$"
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
                            {editForm.errors.stock && (
                                <p className="text-xs text-destructive">
                                    {editForm.errors.stock}
                                </p>
                            )}
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

            <Dialog open={isCreateBrandOpen} onOpenChange={setIsCreateBrandOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Brand</DialogTitle>
                    </DialogHeader>
                    <hr />
                    <form onSubmit={handleCreateBrandSubmit} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="brand-name">Brand Name</Label>
                            <Input
                                id="brand-name"
                                value={createBrandForm.data.name}
                                onChange={(event) =>
                                    createBrandForm.setData('name', event.target.value)
                                }
                                placeholder="Enter brand name"
                                className={
                                    createBrandForm.errors.name
                                        ? 'border-destructive focus-visible:ring-destructive'
                                        : undefined
                                }
                            />
                            {createBrandForm.errors.name && (
                                <p className="text-xs text-destructive">
                                    {createBrandForm.errors.name}
                                </p>
                            )}
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsCreateBrandOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createBrandForm.processing}>
                                Add Brand
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

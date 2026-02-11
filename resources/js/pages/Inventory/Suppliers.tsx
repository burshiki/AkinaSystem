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
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
    { title: 'Suppliers', href: '/inventory/suppliers' },
];

type SupplierRow = {
    id: number;
    name: string;
    contact_person?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    notes?: string | null;
    purchase_orders_count: number;
    created_at: string;
};

type PageProps = {
    suppliers: {
        data: SupplierRow[];
        links: Array<{
            url: string | null;
            label: string;
            active: boolean;
        }>;
    };
};

export default function InventorySuppliers({ suppliers }: PageProps) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<SupplierRow | null>(
        null
    );
    const [searchQuery, setSearchQuery] = useState('');

    const createForm = useForm({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        notes: '',
    });

    const editForm = useForm({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        notes: '',
    });

    const filteredSuppliers = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) {
            return suppliers.data;
        }

        return suppliers.data.filter((supplier) =>
            [
                supplier.name,
                supplier.contact_person ?? '',
                supplier.email ?? '',
                supplier.phone ?? '',
            ]
                .join(' ')
                .toLowerCase()
                .includes(query)
        );
    }, [searchQuery, suppliers]);

    // Auto-refresh to sync data across users
    useEffect(() => {
        const interval = setInterval(() => {
            // Only refresh if page is visible and no modals are open
            if (document.visibilityState === 'visible' && 
                !isCreateOpen && !isEditOpen) {
                router.reload({ only: ['suppliers'] });
            }
        }, 5000); // Refresh every 5 seconds

        return () => clearInterval(interval);
    }, [isCreateOpen, isEditOpen]);

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
            setEditingSupplier(null);
            editForm.reset();
            editForm.clearErrors();
        }
    };

    const openEditModal = (supplier: SupplierRow) => {
        setEditingSupplier(supplier);
        setIsEditOpen(true);
    };

    useEffect(() => {
        if (!editingSupplier) return;

        editForm.setData({
            name: editingSupplier.name,
            contact_person: editingSupplier.contact_person ?? '',
            email: editingSupplier.email ?? '',
            phone: editingSupplier.phone ?? '',
            address: editingSupplier.address ?? '',
            notes: editingSupplier.notes ?? '',
        });
    }, [editingSupplier]);

    const handleCreateSubmit = (event: FormEvent) => {
        event.preventDefault();
        createForm.post('/inventory/suppliers', {
            onSuccess: () => handleCreateToggle(false),
        });
    };

    const handleEditSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (!editingSupplier) return;

        editForm.put(`/inventory/suppliers/${editingSupplier.id}`, {
            onSuccess: () => handleEditToggle(false),
        });
    };

    const handleDelete = (supplierId: number) => {
        if (!confirm('Delete this supplier?')) return;

        router.delete(`/inventory/suppliers/${supplierId}`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Suppliers" />
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
                                    placeholder="Search suppliers"
                                    className="sm:w-72"
                                />
                            </div>
                            <Button onClick={() => handleCreateToggle(true)}>
                                Add Supplier
                            </Button>
                        </div>
                    </div>
                    <Table className="min-w-[900px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Contact Person</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Purchase Orders</TableHead>
                                <TableHead className="text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredSuppliers.map((supplier) => (
                                <TableRow
                                    key={supplier.id}
                                    className="border-b last:border-0 odd:bg-muted/10"
                                >
                                    <TableCell className="font-medium text-foreground">
                                        {supplier.name}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {supplier.contact_person || '-'}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {supplier.email || '-'}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {supplier.phone || '-'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">
                                            {supplier.purchase_orders_count} POs
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    openEditModal(supplier)
                                                }
                                            >
                                                Edit
                                            </Button>
                                            {supplier.purchase_orders_count ===
                                                0 && (
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleDelete(
                                                            supplier.id
                                                        )
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
                    {filteredSuppliers.length === 0 && (
                        <div className="border-t px-6 py-10 text-center text-sm text-muted-foreground">
                            {searchQuery
                                ? 'No suppliers match your search.'
                                : 'No suppliers found. Add your first supplier to get started.'}
                        </div>
                    )}
                    {suppliers.links.length > 1 && (
                        <div className="border-t px-6 py-4">
                            <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
                                {suppliers.links.map((link) => {
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

            {/* Create Modal */}
            <Dialog open={isCreateOpen} onOpenChange={handleCreateToggle}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Add Supplier</DialogTitle>
                    </DialogHeader>
                    <hr />
                    <form onSubmit={handleCreateSubmit} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="create-name">
                                Supplier Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="create-name"
                                value={createForm.data.name}
                                onChange={(event) =>
                                    createForm.setData('name', event.target.value)
                                }
                                placeholder="Enter supplier name"
                                className={
                                    createForm.errors.name
                                        ? 'border-destructive focus-visible:ring-destructive'
                                        : undefined
                                }
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="create-contact">
                                Contact Person
                            </Label>
                            <Input
                                id="create-contact"
                                value={createForm.data.contact_person}
                                onChange={(event) =>
                                    createForm.setData(
                                        'contact_person',
                                        event.target.value
                                    )
                                }
                                placeholder="Enter contact person name"
                                className={
                                    createForm.errors.contact_person
                                        ? 'border-destructive focus-visible:ring-destructive'
                                        : undefined
                                }
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
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
                                    placeholder="email@example.com"
                                    className={
                                        createForm.errors.email
                                            ? 'border-destructive focus-visible:ring-destructive'
                                            : undefined
                                    }
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="create-phone">Phone</Label>
                                <Input
                                    id="create-phone"
                                    value={createForm.data.phone}
                                    onChange={(event) =>
                                        createForm.setData(
                                            'phone',
                                            event.target.value
                                        )
                                    }
                                    placeholder="Enter phone number"
                                    className={
                                        createForm.errors.phone
                                            ? 'border-destructive focus-visible:ring-destructive'
                                            : undefined
                                    }
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="create-address">Address</Label>
                            <Textarea
                                id="create-address"
                                value={createForm.data.address}
                                onChange={(event) =>
                                    createForm.setData(
                                        'address',
                                        event.target.value
                                    )
                                }
                                placeholder="Enter full address"
                                rows={2}
                                className={
                                    createForm.errors.address
                                        ? 'border-destructive focus-visible:ring-destructive'
                                        : undefined
                                }
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="create-notes">Notes</Label>
                            <Textarea
                                id="create-notes"
                                value={createForm.data.notes}
                                onChange={(event) =>
                                    createForm.setData('notes', event.target.value)
                                }
                                placeholder="Additional notes or comments"
                                rows={2}
                                className={
                                    createForm.errors.notes
                                        ? 'border-destructive focus-visible:ring-destructive'
                                        : undefined
                                }
                            />
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => handleCreateToggle(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={createForm.processing}
                            >
                                Save Supplier
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={isEditOpen} onOpenChange={handleEditToggle}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Supplier</DialogTitle>
                    </DialogHeader>
                    <hr />
                    <form onSubmit={handleEditSubmit} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-name">
                                Supplier Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="edit-name"
                                value={editForm.data.name}
                                onChange={(event) =>
                                    editForm.setData('name', event.target.value)
                                }
                                placeholder="Enter supplier name"
                                className={
                                    editForm.errors.name
                                        ? 'border-destructive focus-visible:ring-destructive'
                                        : undefined
                                }
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="edit-contact">Contact Person</Label>
                            <Input
                                id="edit-contact"
                                value={editForm.data.contact_person}
                                onChange={(event) =>
                                    editForm.setData(
                                        'contact_person',
                                        event.target.value
                                    )
                                }
                                placeholder="Enter contact person name"
                                className={
                                    editForm.errors.contact_person
                                        ? 'border-destructive focus-visible:ring-destructive'
                                        : undefined
                                }
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-email">Email</Label>
                                <Input
                                    id="edit-email"
                                    type="email"
                                    value={editForm.data.email}
                                    onChange={(event) =>
                                        editForm.setData(
                                            'email',
                                            event.target.value
                                        )
                                    }
                                    placeholder="email@example.com"
                                    className={
                                        editForm.errors.email
                                            ? 'border-destructive focus-visible:ring-destructive'
                                            : undefined
                                    }
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-phone">Phone</Label>
                                <Input
                                    id="edit-phone"
                                    value={editForm.data.phone}
                                    onChange={(event) =>
                                        editForm.setData(
                                            'phone',
                                            event.target.value
                                        )
                                    }
                                    placeholder="Enter phone number"
                                    className={
                                        editForm.errors.phone
                                            ? 'border-destructive focus-visible:ring-destructive'
                                            : undefined
                                    }
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="edit-address">Address</Label>
                            <Textarea
                                id="edit-address"
                                value={editForm.data.address}
                                onChange={(event) =>
                                    editForm.setData(
                                        'address',
                                        event.target.value
                                    )
                                }
                                placeholder="Enter full address"
                                rows={2}
                                className={
                                    editForm.errors.address
                                        ? 'border-destructive focus-visible:ring-destructive'
                                        : undefined
                                }
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="edit-notes">Notes</Label>
                            <Textarea
                                id="edit-notes"
                                value={editForm.data.notes}
                                onChange={(event) =>
                                    editForm.setData('notes', event.target.value)
                                }
                                placeholder="Additional notes or comments"
                                rows={2}
                                className={
                                    editForm.errors.notes
                                        ? 'border-destructive focus-visible:ring-destructive'
                                        : undefined
                                }
                            />
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
                                Update Supplier
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

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
import { Textarea } from '@/components/ui/textarea';

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
    suppliers: SupplierRow[];
};

export default function InventorySuppliers({ suppliers }: PageProps) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<SupplierRow | null>(
        null
    );

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
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Suppliers</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Manage supplier records and contact information.
                        </p>
                    </div>
                    <Button onClick={() => handleCreateToggle(true)}>
                        New Supplier
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b text-left text-muted-foreground">
                                <tr>
                                    <th className="py-3 font-medium">Name</th>
                                    <th className="py-3 font-medium">
                                        Contact Person
                                    </th>
                                    <th className="py-3 font-medium">Email</th>
                                    <th className="py-3 font-medium">Phone</th>
                                    <th className="py-3 font-medium">
                                        Purchase Orders
                                    </th>
                                    <th className="py-3 text-right font-medium">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {suppliers.map((supplier) => (
                                    <tr
                                        key={supplier.id}
                                        className="border-b last:border-0"
                                    >
                                        <td className="py-3 font-medium text-foreground">
                                            {supplier.name}
                                        </td>
                                        <td className="py-3 text-muted-foreground">
                                            {supplier.contact_person || '-'}
                                        </td>
                                        <td className="py-3 text-muted-foreground">
                                            {supplier.email || '-'}
                                        </td>
                                        <td className="py-3 text-muted-foreground">
                                            {supplier.phone || '-'}
                                        </td>
                                        <td className="py-3">
                                            <Badge variant="outline">
                                                {supplier.purchase_orders_count}{' '}
                                                POs
                                            </Badge>
                                        </td>
                                        <td className="py-3 text-right">
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
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Create Modal */}
            <Dialog open={isCreateOpen} onOpenChange={handleCreateToggle}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Create Supplier</DialogTitle>
                        <DialogDescription>
                            Add a new supplier with contact details.
                        </DialogDescription>
                    </DialogHeader>
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
                            />
                            <InputError message={createForm.errors.name} />
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
                            />
                            <InputError
                                message={createForm.errors.contact_person}
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
                                />
                                <InputError message={createForm.errors.email} />
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
                                />
                                <InputError message={createForm.errors.phone} />
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
                            />
                            <InputError message={createForm.errors.address} />
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
                            />
                            <InputError message={createForm.errors.notes} />
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
                        <DialogDescription>
                            Update supplier information.
                        </DialogDescription>
                    </DialogHeader>
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
                            />
                            <InputError message={editForm.errors.name} />
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
                            />
                            <InputError
                                message={editForm.errors.contact_person}
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
                                />
                                <InputError message={editForm.errors.email} />
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
                                />
                                <InputError message={editForm.errors.phone} />
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
                            />
                            <InputError message={editForm.errors.address} />
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
                            />
                            <InputError message={editForm.errors.notes} />
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

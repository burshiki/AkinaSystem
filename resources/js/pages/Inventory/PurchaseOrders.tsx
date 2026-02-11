import { Head, router, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import InputError from '@/components/input-error';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, SharedData } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inventory', href: '/inventory/items' },
    { title: 'Purchase Orders', href: '/inventory/purchase-orders' },
];

type POItem = {
    id?: number;
    item_id: number;
    item_name?: string;
    quantity: number;
    received_quantity?: number;
    unit_price: number;
    subtotal?: number;
};

type PurchaseOrderRow = {
    id: number;
    po_number: string;
    supplier_id: number;
    supplier_name: string;
    status: 'pending' | 'approved' | 'partially_received' | 'received';
    requested_by: string;
    approved_by?: string | null;
    approved_at?: string | null;
    received_at?: string | null;
    total_amount: number;
    notes?: string | null;
    items: POItem[];
    created_at: string;
};

type ItemOption = {
    id: number;
    name: string;
    cost: number;
};

type SupplierOption = {
    id: number;
    name: string;
};

type PageProps = {
    purchaseOrders: PurchaseOrderRow[];
    items: ItemOption[];
    suppliers: SupplierOption[];
};

export default function InventoryPurchaseOrders({
    purchaseOrders,
    items,
    suppliers,
}: PageProps) {
    const { auth } = usePage<SharedData>().props;
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isReceiveOpen, setIsReceiveOpen] = useState(false);
    const [editingPO, setEditingPO] = useState<PurchaseOrderRow | null>(null);
    const [viewingPO, setViewingPO] = useState<PurchaseOrderRow | null>(null);
    const [receivingPO, setReceivingPO] = useState<PurchaseOrderRow | null>(null);

    const createForm = useForm<{
        supplier_id: number;
        notes: string;
        items: POItem[];
    }>({
        supplier_id: 0,
        notes: '',
        items: [{ item_id: 0, quantity: 1, unit_price: 0 }],
    });

    const editForm = useForm<{
        supplier_id: number;
        notes: string;
        items: POItem[];
    }>({
        supplier_id: 0,
        notes: '',
        items: [{ item_id: 0, quantity: 1, unit_price: 0 }],
    });

    const receiveForm = useForm<{
        items: Array<{ id: number; receiving_now: number }>;
    }>({
        items: [],
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
            setEditingPO(null);
            editForm.reset();
            editForm.clearErrors();
        }
    };

    const handleViewToggle = (open: boolean) => {
        setIsViewOpen(open);
        if (!open) {
            setViewingPO(null);
        }
    };

    const handleReceiveToggle = (open: boolean) => {
        setIsReceiveOpen(open);
        if (!open) {
            setReceivingPO(null);
            receiveForm.reset();
            receiveForm.clearErrors();
        }
    };

    const openEditModal = (po: PurchaseOrderRow) => {
        setEditingPO(po);
        setIsEditOpen(true);
    };

    const openViewModal = (po: PurchaseOrderRow) => {
        setViewingPO(po);
        setIsViewOpen(true);
    };

    const openReceiveModal = (po: PurchaseOrderRow) => {
        setReceivingPO(po);
        receiveForm.setData('items', po.items.map(item => ({
            id: item.id!,
            receiving_now: 0,
        })));
        setIsReceiveOpen(true);
    };

    useEffect(() => {
        if (!editingPO) return;

        editForm.setData({
            supplier_id: editingPO.supplier_id,
            notes: editingPO.notes ?? '',
            items: editingPO.items.map((item) => ({
                item_id: item.item_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
            })),
        });
    }, [editingPO]);

    // Auto-refresh to sync data across users
    useEffect(() => {
        const interval = setInterval(() => {
            // Only refresh if page is visible and no modals are open
            if (document.visibilityState === 'visible' && 
                !isCreateOpen && !isEditOpen && !isViewOpen && !isReceiveOpen) {
                router.reload({ only: ['purchaseOrders'], preserveScroll: true });
            }
        }, 5000); // Refresh every 5 seconds

        return () => clearInterval(interval);
    }, [isCreateOpen, isEditOpen, isViewOpen, isReceiveOpen]);

    const handleCreateSubmit = (event: FormEvent) => {
        event.preventDefault();
        createForm.post('/inventory/purchase-orders', {
            onSuccess: () => handleCreateToggle(false),
        });
    };

    const handleEditSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (!editingPO) return;

        editForm.put(`/inventory/purchase-orders/${editingPO.id}`, {
            onSuccess: () => handleEditToggle(false),
        });
    };

    const handleDelete = (poId: number) => {
        if (!confirm('Delete this purchase order?')) return;

        router.delete(`/inventory/purchase-orders/${poId}`);
    };

    const handleApprove = (poId: number) => {
        if (!confirm('Approve this purchase order?')) return;

        router.post(`/inventory/purchase-orders/${poId}/approve`, {}, {
            preserveScroll: true,
            preserveState: false,
        });
    };

    const handleReceive = (poId: number) => {
        const po = purchaseOrders.find(p => p.id === poId);
        if (po) {
            openReceiveModal(po);
        }
    };

    const handleReceiveSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (!receivingPO) return;

        // Convert incremental quantities to cumulative totals for backend
        const itemsWithTotals = receiveForm.data.items.map((formItem, index) => {
            const poItem = receivingPO.items[index];
            return {
                id: formItem.id,
                received_quantity: (poItem.received_quantity || 0) + formItem.receiving_now,
            };
        });

        router.post(`/inventory/purchase-orders/${receivingPO.id}/receive`, 
            { items: itemsWithTotals },
            { onSuccess: () => handleReceiveToggle(false) }
        );
    };

    const addCreateItem = () => {
        createForm.setData('items', [
            ...createForm.data.items,
            { item_id: 0, quantity: 1, unit_price: 0 },
        ]);
    };

    const removeCreateItem = (index: number) => {
        createForm.setData(
            'items',
            createForm.data.items.filter((_, i) => i !== index)
        );
    };

    const updateCreateItem = (
        index: number,
        field: keyof POItem,
        value: string | number
    ) => {
        const updatedItems = [...createForm.data.items];
        updatedItems[index] = { ...updatedItems[index], [field]: value };

        // Auto-fill unit price when item is selected
        if (field === 'item_id') {
            const selectedItem = items.find((item) => item.id === Number(value));
            if (selectedItem) {
                updatedItems[index].unit_price = selectedItem.cost;
            }
        }

        createForm.setData('items', updatedItems);
    };

    const addEditItem = () => {
        editForm.setData('items', [
            ...editForm.data.items,
            { item_id: 0, quantity: 1, unit_price: 0 },
        ]);
    };

    const removeEditItem = (index: number) => {
        editForm.setData(
            'items',
            editForm.data.items.filter((_, i) => i !== index)
        );
    };

    const updateEditItem = (
        index: number,
        field: keyof POItem,
        value: string | number
    ) => {
        const updatedItems = [...editForm.data.items];
        updatedItems[index] = { ...updatedItems[index], [field]: value };

        // Auto-fill unit price when item is selected
        if (field === 'item_id') {
            const selectedItem = items.find((item) => item.id === Number(value));
            if (selectedItem) {
                updatedItems[index].unit_price = selectedItem.cost;
            }
        }

        editForm.setData('items', updatedItems);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <Badge variant="outline">Pending</Badge>;
            case 'approved':
                return <Badge variant="secondary">Approved</Badge>;
            case 'partially_received':
                return <Badge className="bg-orange-500 text-white">Partially Received</Badge>;
            case 'received':
                return <Badge variant="default">Received</Badge>;
            default:
                return null;
        }
    };

    const calculateTotal = (items: POItem[]) => {
        return items.reduce(
            (sum, item) => sum + item.quantity * item.unit_price,
            0
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Purchase Orders" />
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Purchase Orders</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Create and manage supplier purchase orders with
                            approval workflow.
                        </p>
                    </div>
                    <Button onClick={() => handleCreateToggle(true)}>
                        New Purchase Order
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b text-left text-muted-foreground">
                                <tr>
                                    <th className="py-3 font-medium">PO #</th>
                                    <th className="py-3 font-medium">
                                        Supplier
                                    </th>
                                    <th className="py-3 font-medium">Status</th>
                                    <th className="py-3 font-medium">
                                        Requested By
                                    </th>
                                    <th className="py-3 font-medium">
                                        Total Amount
                                    </th>
                                    <th className="py-3 font-medium">Date</th>
                                    <th className="py-3 text-right font-medium">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {purchaseOrders.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="py-8 text-center text-muted-foreground"
                                        >
                                            No purchase orders yet. Click &quot;New
                                            Purchase Order&quot; to create one.
                                        </td>
                                    </tr>
                                ) : (
                                    purchaseOrders.map((po) => (
                                    <tr
                                        key={po.id}
                                        className="border-b last:border-0"
                                    >
                                        <td className="py-3 font-medium text-foreground">
                                            {po.po_number}
                                        </td>
                                        <td className="py-3 text-muted-foreground">
                                            {po.supplier_name}
                                        </td>
                                        <td className="py-3">
                                            {getStatusBadge(po.status)}
                                        </td>
                                        <td className="py-3 text-muted-foreground">
                                            {po.requested_by}
                                        </td>
                                        <td className="py-3 text-foreground">
                                            ₱{po.total_amount.toFixed(2)}
                                        </td>
                                        <td className="py-3 text-muted-foreground">
                                            {po.created_at}
                                        </td>
                                        <td className="py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        openViewModal(po)
                                                    }
                                                >
                                                    View
                                                </Button>
                                                {po.status === 'pending' && (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() =>
                                                                openEditModal(po)
                                                            }
                                                        >
                                                            Edit
                                                        </Button>
                                                        {auth?.user?.is_admin && (
                                                            <Button
                                                                variant="default"
                                                                size="sm"
                                                                onClick={() =>
                                                                    handleApprove(
                                                                        po.id
                                                                    )
                                                                }
                                                            >
                                                                Approve
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() =>
                                                                handleDelete(
                                                                    po.id
                                                                )
                                                            }
                                                        >
                                                            Delete
                                                        </Button>
                                                    </>
                                                )}
                                                {(po.status === 'approved' || po.status === 'partially_received') && (
                                                    <Button
                                                        variant="default"
                                                        size="sm"
                                                        onClick={() =>
                                                            handleReceive(po.id)
                                                        }
                                                    >
                                                        {po.status === 'partially_received' ? 'Receive More' : 'Mark Received'}
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Create Modal */}
            <Dialog open={isCreateOpen} onOpenChange={handleCreateToggle}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Create Purchase Order</DialogTitle>
                        <DialogDescription>
                            Add a new purchase order and select items to order.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubmit} className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="create-supplier">
                                Supplier <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={String(createForm.data.supplier_id || '')}
                                onValueChange={(value) =>
                                    createForm.setData('supplier_id', Number(value))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select supplier" />
                                </SelectTrigger>
                                <SelectContent>
                                    {suppliers.length === 0 ? (
                                        <div className="p-2 text-sm text-muted-foreground">
                                            No suppliers available. Please add a
                                            supplier first.
                                        </div>
                                    ) : (
                                        suppliers.map((supplier) => (
                                            <SelectItem
                                                key={supplier.id}
                                                value={String(supplier.id)}
                                            >
                                                {supplier.name}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                            <InputError
                                message={createForm.errors.supplier_id}
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label>Items</Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addCreateItem}
                                >
                                    Add Item
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {createForm.data.items.map((item, index) => (
                                    <div
                                        key={index}
                                        className="grid grid-cols-12 gap-2 items-start p-3 border rounded-md"
                                    >
                                        <div className="col-span-5">
                                            <Label className="text-xs">
                                                Item
                                            </Label>
                                            <Select
                                                value={String(item.item_id || '')}
                                                onValueChange={(value) =>
                                                    updateCreateItem(
                                                        index,
                                                        'item_id',
                                                        Number(value)
                                                    )
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select item" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {items.map((itemOption) => (
                                                        <SelectItem
                                                            key={itemOption.id}
                                                            value={String(
                                                                itemOption.id
                                                            )}
                                                        >
                                                            {itemOption.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="col-span-2">
                                            <Label className="text-xs">
                                                Quantity
                                            </Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={item.quantity}
                                                onChange={(e) =>
                                                    updateCreateItem(
                                                        index,
                                                        'quantity',
                                                        Number(e.target.value)
                                                    )
                                                }
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <Label className="text-xs">
                                                Unit Price
                                            </Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.unit_price}
                                                onChange={(e) =>
                                                    updateCreateItem(
                                                        index,
                                                        'unit_price',
                                                        Number(e.target.value)
                                                    )
                                                }
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <Label className="text-xs">
                                                Subtotal
                                            </Label>
                                            <div className="py-2 text-sm font-medium">
                                                ₱{(
                                                    item.quantity *
                                                    item.unit_price
                                                ).toFixed(2)}
                                            </div>
                                        </div>
                                        <div className="col-span-1 flex items-end">
                                            {createForm.data.items.length >
                                                1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        removeCreateItem(index)
                                                    }
                                                >
                                                    ×
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <InputError message={createForm.errors.items} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="create-notes">Notes</Label>
                            <Textarea
                                id="create-notes"
                                value={createForm.data.notes}
                                onChange={(event) =>
                                    createForm.setData('notes', event.target.value)
                                }
                                placeholder="Additional notes or instructions"
                                rows={3}
                            />
                            <InputError message={createForm.errors.notes} />
                        </div>

                        <div className="border-t pt-4">
                            <div className="flex justify-between text-lg font-semibold">
                                <span>Total:</span>
                                <span>
                                    ₱{calculateTotal(
                                        createForm.data.items
                                    ).toFixed(2)}
                                </span>
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
                            <Button
                                type="submit"
                                disabled={createForm.processing}
                            >
                                Submit for Approval
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={isEditOpen} onOpenChange={handleEditToggle}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Purchase Order</DialogTitle>
                        <DialogDescription>
                            Update purchase order details (pending orders only).
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEditSubmit} className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-supplier">
                                Supplier <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={String(editForm.data.supplier_id || '')}
                                onValueChange={(value) =>
                                    editForm.setData('supplier_id', Number(value))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select supplier" />
                                </SelectTrigger>
                                <SelectContent>
                                    {suppliers.length === 0 ? (
                                        <div className="p-2 text-sm text-muted-foreground">
                                            No suppliers available. Please add a
                                            supplier first.
                                        </div>
                                    ) : (
                                        suppliers.map((supplier) => (
                                            <SelectItem
                                                key={supplier.id}
                                                value={String(supplier.id)}
                                            >
                                                {supplier.name}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                            <InputError
                                message={editForm.errors.supplier_id}
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label>Items</Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addEditItem}
                                >
                                    Add Item
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {editForm.data.items.map((item, index) => (
                                    <div
                                        key={index}
                                        className="grid grid-cols-12 gap-2 items-start p-3 border rounded-md"
                                    >
                                        <div className="col-span-5">
                                            <Label className="text-xs">
                                                Item
                                            </Label>
                                            <Select
                                                value={String(item.item_id || '')}
                                                onValueChange={(value) =>
                                                    updateEditItem(
                                                        index,
                                                        'item_id',
                                                        Number(value)
                                                    )
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select item" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {items.map((itemOption) => (
                                                        <SelectItem
                                                            key={itemOption.id}
                                                            value={String(
                                                                itemOption.id
                                                            )}
                                                        >
                                                            {itemOption.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="col-span-2">
                                            <Label className="text-xs">
                                                Quantity
                                            </Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={item.quantity}
                                                onChange={(e) =>
                                                    updateEditItem(
                                                        index,
                                                        'quantity',
                                                        Number(e.target.value)
                                                    )
                                                }
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <Label className="text-xs">
                                                Unit Price
                                            </Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.unit_price}
                                                onChange={(e) =>
                                                    updateEditItem(
                                                        index,
                                                        'unit_price',
                                                        Number(e.target.value)
                                                    )
                                                }
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <Label className="text-xs">
                                                Subtotal
                                            </Label>
                                            <div className="py-2 text-sm font-medium">
                                                ₱{(
                                                    item.quantity *
                                                    item.unit_price
                                                ).toFixed(2)}
                                            </div>
                                        </div>
                                        <div className="col-span-1 flex items-end">
                                            {editForm.data.items.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        removeEditItem(index)
                                                    }
                                                >
                                                    ×
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <InputError message={editForm.errors.items} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="edit-notes">Notes</Label>
                            <Textarea
                                id="edit-notes"
                                value={editForm.data.notes}
                                onChange={(event) =>
                                    editForm.setData('notes', event.target.value)
                                }
                                placeholder="Additional notes or instructions"
                                rows={3}
                            />
                            <InputError message={editForm.errors.notes} />
                        </div>

                        <div className="border-t pt-4">
                            <div className="flex justify-between text-lg font-semibold">
                                <span>Total:</span>
                                <span>
                                    ₱{calculateTotal(editForm.data.items).toFixed(2)}
                                </span>
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
                            <Button
                                type="submit"
                                disabled={editForm.processing}
                            >
                                Update Purchase Order
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* View Modal */}
            <Dialog open={isViewOpen} onOpenChange={handleViewToggle}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Purchase Order Details</DialogTitle>
                        <DialogDescription>
                            {viewingPO?.po_number}
                        </DialogDescription>
                    </DialogHeader>
                    {viewingPO && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs text-muted-foreground">
                                        Supplier
                                    </Label>
                                    <div className="font-medium">
                                        {viewingPO.supplier_name}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">
                                        Status
                                    </Label>
                                    <div>{getStatusBadge(viewingPO.status)}</div>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">
                                        Requested By
                                    </Label>
                                    <div className="font-medium">
                                        {viewingPO.requested_by}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">
                                        Created
                                    </Label>
                                    <div className="font-medium">
                                        {viewingPO.created_at}
                                    </div>
                                </div>
                                {viewingPO.approved_by && (
                                    <>
                                        <div>
                                            <Label className="text-xs text-muted-foreground">
                                                Approved By
                                            </Label>
                                            <div className="font-medium">
                                                {viewingPO.approved_by}
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-muted-foreground">
                                                Approved At
                                            </Label>
                                            <div className="font-medium">
                                                {viewingPO.approved_at}
                                            </div>
                                        </div>
                                    </>
                                )}
                                {viewingPO.received_at && (
                                    <div>
                                        <Label className="text-xs text-muted-foreground">
                                            Received At
                                        </Label>
                                        <div className="font-medium">
                                            {viewingPO.received_at}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {viewingPO.notes && (
                                <div>
                                    <Label className="text-xs text-muted-foreground">
                                        Notes
                                    </Label>
                                    <div className="text-sm mt-1">
                                        {viewingPO.notes}
                                    </div>
                                </div>
                            )}

                            <div>
                                <Label className="text-xs text-muted-foreground mb-2 block">
                                    Items
                                </Label>
                                <div className="border rounded-md overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted">
                                            <tr>
                                                <th className="text-left py-2 px-3 font-medium">
                                                    Item
                                                </th>
                                                <th className="text-right py-2 px-3 font-medium">
                                                    Quantity
                                                </th>
                                                <th className="text-right py-2 px-3 font-medium">
                                                    Unit Price
                                                </th>
                                                <th className="text-right py-2 px-3 font-medium">
                                                    Subtotal
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {viewingPO.items.map((item) => (
                                                <tr
                                                    key={item.id}
                                                    className="border-t"
                                                >
                                                    <td className="py-2 px-3">
                                                        {item.item_name}
                                                    </td>
                                                    <td className="text-right py-2 px-3">
                                                        {item.quantity}
                                                    </td>
                                                    <td className="text-right py-2 px-3">
                                                        ₱{item.unit_price}
                                                    </td>
                                                    <td className="text-right py-2 px-3 font-medium">
                                                        ₱{(
                                                            item.quantity *
                                                            item.unit_price
                                                        ).toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="border-t bg-muted">
                                            <tr>
                                                <td
                                                    colSpan={3}
                                                    className="text-right py-2 px-3 font-semibold"
                                                >
                                                    Total:
                                                </td>
                                                <td className="text-right py-2 px-3 font-semibold">
                                                    ₱{viewingPO.total_amount.toFixed(2)}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => handleViewToggle(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Receive Items Modal */}
            <Dialog open={isReceiveOpen} onOpenChange={handleReceiveToggle}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Receive Items</DialogTitle>
                        <DialogDescription>
                            Enter the actual quantity received for each item. Items not fully received will keep the PO open.
                        </DialogDescription>
                    </DialogHeader>
                    {receivingPO && (
                        <form onSubmit={handleReceiveSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <div className="grid grid-cols-12 gap-2 text-sm font-medium border-b pb-2">
                                    <div className="col-span-5">Item</div>
                                    <div className="col-span-2 text-right">Ordered</div>
                                    <div className="col-span-2 text-right">Previous</div>
                                    <div className="col-span-3 text-right">Receive Now</div>
                                </div>
                                {receivingPO.items.map((item, index) => {
                                    const remaining = item.quantity - (item.received_quantity || 0);
                                    return (
                                        <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                                            <div className="col-span-5 text-sm">
                                                {item.item_name}
                                            </div>
                                            <div className="col-span-2 text-right text-sm text-muted-foreground">
                                                {item.quantity}
                                            </div>
                                            <div className="col-span-2 text-right text-sm text-muted-foreground">
                                                {item.received_quantity || 0}
                                            </div>
                                            <div className="col-span-3">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    value={receiveForm.data.items[index]?.receiving_now || 0}
                                                    onChange={(event) => {
                                                        const newItems = [...receiveForm.data.items];
                                                        newItems[index] = {
                                                            ...newItems[index],
                                                            receiving_now: parseInt(event.target.value) || 0,
                                                        };
                                                        receiveForm.setData('items', newItems);
                                                    }}
                                                    placeholder="0"
                                                    className="text-right"
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <InputError message={receiveForm.errors.items} />

                            <div className="border-t pt-4 space-y-2 text-sm">
                                <p className="text-muted-foreground">
                                    <strong>Note:</strong> Stock will be incremented only by the quantity you receive now.
                                    If not all items are fully received, the PO will remain open with "Partially Received" status.
                                </p>
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => handleReceiveToggle(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={receiveForm.processing}
                                >
                                    Confirm Receipt
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

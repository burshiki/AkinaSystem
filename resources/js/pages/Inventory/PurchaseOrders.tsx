import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
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
    purchaseOrders: {
        data: PurchaseOrderRow[];
        links: Array<{
            url: string | null;
            label: string;
            active: boolean;
        }>;
    };
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
    const [searchQuery, setSearchQuery] = useState('');

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

    const filteredPurchaseOrders = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) {
            return purchaseOrders.data;
        }

        return purchaseOrders.data.filter((po) => {
            const status = po.status.replace('_', ' ');
            return (
                po.po_number.toLowerCase().includes(query) ||
                po.supplier_name.toLowerCase().includes(query) ||
                po.requested_by.toLowerCase().includes(query) ||
                status.includes(query)
            );
        });
    }, [purchaseOrders, searchQuery]);


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
        const syncBadgeCount = async () => {
            try {
                const response = await fetch(
                    '/inventory/purchase-orders/badge-count'
                );
                if (!response.ok) return;
                const data = await response.json();
                if (typeof data.count === 'number') {
                    window.dispatchEvent(
                        new CustomEvent('purchase-orders-badge', {
                            detail: { count: data.count },
                        })
                    );
                }
            } catch (error) {
                console.error('Error syncing PO badge count:', error);
            }
        };

        const interval = setInterval(() => {
            // Only refresh if page is visible and no modals are open
            if (document.visibilityState === 'visible' && 
                !isCreateOpen && !isEditOpen && !isViewOpen && !isReceiveOpen) {
                router.reload({ only: ['purchaseOrders'] });
                void syncBadgeCount();
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
        const po = purchaseOrders.data.find(p => p.id === poId);
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
                                    placeholder="Search by PO, supplier, or status"
                                    className="sm:w-72"
                                />
                            </div>
                            <Button onClick={() => handleCreateToggle(true)}>
                                Add Purchase Order
                            </Button>
                        </div>
                    </div>
                    <Table className="min-w-[900px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead>PO #</TableHead>
                                <TableHead>Supplier</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Requested By</TableHead>
                                <TableHead className="text-right">
                                    Total Amount
                                </TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredPurchaseOrders.map((po) => (
                                <TableRow
                                    key={po.id}
                                    className="border-b last:border-0 odd:bg-muted/10"
                                >
                                    <TableCell className="font-medium text-foreground">
                                        {po.po_number}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {po.supplier_name}
                                    </TableCell>
                                    <TableCell>{getStatusBadge(po.status)}</TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {po.requested_by}
                                    </TableCell>
                                    <TableCell className="text-right text-foreground">
                                        ₱{po.total_amount.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {po.created_at}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openViewModal(po)}
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
                                                            handleDelete(po.id)
                                                        }
                                                    >
                                                        Delete
                                                    </Button>
                                                </>
                                            )}
                                            {(po.status === 'approved' ||
                                                po.status === 'partially_received') && (
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleReceive(po.id)
                                                    }
                                                >
                                                    {po.status ===
                                                    'partially_received'
                                                        ? 'Receive More'
                                                        : 'Mark Received'}
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {filteredPurchaseOrders.length === 0 && (
                        <div className="border-t px-6 py-10 text-center text-sm text-muted-foreground">
                            {searchQuery
                                ? 'No purchase orders match your search.'
                                : 'No purchase orders yet. Add your first purchase order to get started.'}
                        </div>
                    )}
                    {purchaseOrders.links.length > 1 && (
                        <div className="border-t px-6 py-4">
                            <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
                                {purchaseOrders.links.map((link) => {
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
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Add Purchase Order</DialogTitle>
                    </DialogHeader>
                    <hr />
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
                                <SelectTrigger
                                    className={
                                        createForm.errors.supplier_id
                                            ? 'border-destructive focus-visible:ring-destructive'
                                            : undefined
                                    }
                                >
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
                        </div>

                        <div
                            className={`space-y-3 ${
                                createForm.errors.items
                                    ? 'rounded-md ring-1 ring-destructive/60'
                                    : ''
                            }`}
                        >
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
                                className={
                                    createForm.errors.notes
                                        ? 'border-destructive focus-visible:ring-destructive'
                                        : undefined
                                }
                            />
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
                    </DialogHeader>
                    <hr />
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
                                <SelectTrigger
                                    className={
                                        editForm.errors.supplier_id
                                            ? 'border-destructive focus-visible:ring-destructive'
                                            : undefined
                                    }
                                >
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
                        </div>

                        <div
                            className={`space-y-3 ${
                                editForm.errors.items
                                    ? 'rounded-md ring-1 ring-destructive/60'
                                    : ''
                            }`}
                        >
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
                                className={
                                    editForm.errors.notes
                                        ? 'border-destructive focus-visible:ring-destructive'
                                        : undefined
                                }
                            />
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
                    </DialogHeader>
                    <hr />
                    {viewingPO && (
                        <div className="space-y-4">
                            <div className="text-sm text-muted-foreground">
                                {viewingPO.po_number}
                            </div>
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
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Item</TableHead>
                                                <TableHead className="text-right">
                                                    Quantity
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    Unit Price
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    Subtotal
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {viewingPO.items.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell>
                                                        {item.item_name}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {item.quantity}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        ₱{item.unit_price}
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">
                                                        ₱{(
                                                            item.quantity *
                                                            item.unit_price
                                                        ).toFixed(2)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    <div className="border-t bg-muted/50 px-4 py-2 text-right text-sm font-semibold">
                                        Total: ₱{viewingPO.total_amount.toFixed(2)}
                                    </div>
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
                    </DialogHeader>
                    <hr />
                    {receivingPO && (
                        <form onSubmit={handleReceiveSubmit} className="space-y-6">
                            <div
                                className={`space-y-2 ${
                                    receiveForm.errors.items
                                        ? 'rounded-md ring-1 ring-destructive/60'
                                        : ''
                                }`}
                            >
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

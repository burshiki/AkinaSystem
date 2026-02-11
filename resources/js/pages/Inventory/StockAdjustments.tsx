import { Head, router, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, SharedData } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
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
import { Textarea } from '@/components/ui/textarea';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inventory', href: '/inventory/items' },
    { title: 'Stock Adjustment', href: '/inventory/stock-adjustments' },
];

type StockAdjustmentRow = {
    id: number;
    item_id: number;
    item_name: string;
    quantity_change: number;
    reason: string;
    reason_label: string;
    notes: string | null;
    old_stock: number;
    new_stock: number;
    user_name: string;
    created_at: string;
};

type ItemOption = {
    id: number;
    name: string;
    stock: number;
};

export default function InventoryStockAdjustments() {
    const { adjustments, items } = usePage<
        SharedData & {
            adjustments: StockAdjustmentRow[];
            items: ItemOption[];
        }
    >().props;

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const createForm = useForm<{
        item_id: number;
        quantity_change: number;
        reason: string;
        notes: string;
    }>({
        item_id: 0,
        quantity_change: 0,
        reason: '',
        notes: '',
    });

    const filteredAdjustments = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) {
            return adjustments;
        }

        return adjustments.filter((adjustment) =>
            [
                adjustment.item_name,
                adjustment.reason_label,
                adjustment.user_name,
                adjustment.created_at,
            ]
                .join(' ')
                .toLowerCase()
                .includes(query)
        );
    }, [adjustments, searchQuery]);

    const handleCreateToggle = (open: boolean) => {
        setIsCreateOpen(open);
        if (!open) {
            createForm.reset();
            createForm.clearErrors();
        }
    };

    const handleCreateSubmit = (event: FormEvent) => {
        event.preventDefault();
        createForm.post('/inventory/stock-adjustments', {
            onSuccess: () => handleCreateToggle(false),
        });
    };

    const handleDelete = (adjustmentId: number) => {
        if (!confirm('Reverse this stock adjustment? This will restore the previous stock level.'))
            return;

        router.delete(`/inventory/stock-adjustments/${adjustmentId}`);
    };

    const getReasonBadge = (reason: string) => {
        switch (reason) {
            case 'adjustment':
                return <Badge variant="secondary">Stock Adjustment</Badge>;
            case 'warranty':
                return <Badge className="bg-blue-500 text-white">Warranty Claim</Badge>;
            case 'damage':
                return <Badge variant="destructive">Damaged Goods</Badge>;
            case 'internal_use':
                return <Badge className="bg-purple-500 text-white">Internal Use</Badge>;
            default:
                return <Badge variant="outline">{reason}</Badge>;
        }
    };

    const selectedItem = items.find(item => item.id === createForm.data.item_id);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inventory - Stock Adjustment" />
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
                                    placeholder="Search by item, reason, or user"
                                    className="sm:w-72"
                                />
                            </div>
                            <Button onClick={() => setIsCreateOpen(true)}>
                                Add Adjustment
                            </Button>
                        </div>
                    </div>
                    <Table className="min-w-[900px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Item</TableHead>
                                <TableHead className="text-right">Change</TableHead>
                                <TableHead className="text-right">Old Stock</TableHead>
                                <TableHead className="text-right">New Stock</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead>By</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredAdjustments.map((adjustment) => (
                                <TableRow
                                    key={adjustment.id}
                                    className="border-b last:border-0 odd:bg-muted/10"
                                >
                                    <TableCell className="text-muted-foreground">
                                        {adjustment.created_at}
                                    </TableCell>
                                    <TableCell className="font-medium text-foreground">
                                        {adjustment.item_name}
                                    </TableCell>
                                    <TableCell
                                        className={`text-right font-medium ${
                                            adjustment.quantity_change > 0
                                                ? 'text-green-600'
                                                : 'text-red-600'
                                        }`}
                                    >
                                        {adjustment.quantity_change > 0 ? '+' : ''}
                                        {adjustment.quantity_change}
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                        {adjustment.old_stock}
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                        {adjustment.new_stock}
                                    </TableCell>
                                    <TableCell>{getReasonBadge(adjustment.reason)}</TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {adjustment.user_name}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                handleDelete(adjustment.id)
                                            }
                                        >
                                            Reverse
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {filteredAdjustments.length === 0 && (
                        <div className="border-t px-6 py-10 text-center text-sm text-muted-foreground">
                            {searchQuery
                                ? 'No adjustments match your search.'
                                : 'No stock adjustments recorded yet.'}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Modal */}
            <Dialog open={isCreateOpen} onOpenChange={handleCreateToggle}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Stock Adjustment</DialogTitle>
                    </DialogHeader>
                    <hr />
                    <form onSubmit={handleCreateSubmit} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="create-item">
                                Item <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={String(createForm.data.item_id || '')}
                                onValueChange={(value) =>
                                    createForm.setData('item_id', Number(value))
                                }
                            >
                                <SelectTrigger
                                    className={
                                        createForm.errors.item_id
                                            ? 'border-destructive focus-visible:ring-destructive'
                                            : undefined
                                    }
                                >
                                    <SelectValue placeholder="Select item" />
                                </SelectTrigger>
                                <SelectContent>
                                    {items.length === 0 ? (
                                        <div className="p-2 text-sm text-muted-foreground">
                                            No items available.
                                        </div>
                                    ) : (
                                        items.map((item) => (
                                            <SelectItem
                                                key={item.id}
                                                value={String(item.id)}
                                            >
                                                {item.name} (Stock: {item.stock})
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                            {selectedItem && (
                                <p className="text-sm text-muted-foreground">
                                    Current stock: {selectedItem.stock}
                                </p>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="create-quantity">
                                Quantity Change <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="create-quantity"
                                type="number"
                                value={createForm.data.quantity_change || ''}
                                onChange={(event) =>
                                    createForm.setData(
                                        'quantity_change',
                                        parseInt(event.target.value) || 0
                                    )
                                }
                                placeholder="Use negative for deductions (e.g., -5)"
                                className={
                                    createForm.errors.quantity_change
                                        ? 'border-destructive focus-visible:ring-destructive'
                                        : undefined
                                }
                            />
                            {selectedItem && createForm.data.quantity_change !== 0 && (
                                <p className="text-sm text-muted-foreground">
                                    New stock will be: {selectedItem.stock + createForm.data.quantity_change}
                                </p>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="create-reason">
                                Reason <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={createForm.data.reason}
                                onValueChange={(value) =>
                                    createForm.setData('reason', value)
                                }
                            >
                                <SelectTrigger
                                    className={
                                        createForm.errors.reason
                                            ? 'border-destructive focus-visible:ring-destructive'
                                            : undefined
                                    }
                                >
                                    <SelectValue placeholder="Select reason" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="adjustment">Stock Adjustment</SelectItem>
                                    <SelectItem value="warranty">Warranty Claim</SelectItem>
                                    <SelectItem value="damage">Damaged Goods</SelectItem>
                                    <SelectItem value="internal_use">Internal Use</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="create-notes">Notes</Label>
                            <Textarea
                                id="create-notes"
                                value={createForm.data.notes}
                                onChange={(event) =>
                                    createForm.setData('notes', event.target.value)
                                }
                                placeholder="Optional notes about this adjustment"
                                rows={3}
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
                                Record Adjustment
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}


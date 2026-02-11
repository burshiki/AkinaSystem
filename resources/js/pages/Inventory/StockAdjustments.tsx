import { Head, router, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, SharedData } from '@/types';
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
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <h1 className="text-xl font-semibold">Stock Adjustment</h1>
                        <p className="text-sm text-muted-foreground">
                            Record manual stock adjustments with reasons.
                        </p>
                    </div>
                    <Button onClick={() => setIsCreateOpen(true)}>
                        New Adjustment
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Adjustment History</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {adjustments.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No stock adjustments recorded yet.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="border-b">
                                        <tr className="text-left text-sm">
                                            <th className="py-3 px-3 font-medium">Date</th>
                                            <th className="py-3 px-3 font-medium">Item</th>
                                            <th className="py-3 px-3 font-medium text-right">Change</th>
                                            <th className="py-3 px-3 font-medium text-right">Old Stock</th>
                                            <th className="py-3 px-3 font-medium text-right">New Stock</th>
                                            <th className="py-3 px-3 font-medium">Reason</th>
                                            <th className="py-3 px-3 font-medium">By</th>
                                            <th className="py-3 px-3 font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {adjustments.map((adjustment) => (
                                            <tr key={adjustment.id} className="border-b">
                                                <td className="py-3 px-3 text-sm">
                                                    {adjustment.created_at}
                                                </td>
                                                <td className="py-3 px-3 text-sm">
                                                    {adjustment.item_name}
                                                </td>
                                                <td className={`py-3 px-3 text-sm text-right font-medium ${
                                                    adjustment.quantity_change > 0 
                                                        ? 'text-green-600' 
                                                        : 'text-red-600'
                                                }`}>
                                                    {adjustment.quantity_change > 0 ? '+' : ''}
                                                    {adjustment.quantity_change}
                                                </td>
                                                <td className="py-3 px-3 text-sm text-right">
                                                    {adjustment.old_stock}
                                                </td>
                                                <td className="py-3 px-3 text-sm text-right">
                                                    {adjustment.new_stock}
                                                </td>
                                                <td className="py-3 px-3 text-sm">
                                                    {getReasonBadge(adjustment.reason)}
                                                </td>
                                                <td className="py-3 px-3 text-sm text-muted-foreground">
                                                    {adjustment.user_name}
                                                </td>
                                                <td className="py-3 px-3">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(adjustment.id)}
                                                    >
                                                        Reverse
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Create Modal */}
            <Dialog open={isCreateOpen} onOpenChange={handleCreateToggle}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>New Stock Adjustment</DialogTitle>
                        <DialogDescription>
                            Adjust item stock levels with a tracking reason.
                        </DialogDescription>
                    </DialogHeader>
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
                                <SelectTrigger>
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
                            <InputError message={createForm.errors.item_id} />
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
                            />
                            <InputError message={createForm.errors.quantity_change} />
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
                                <SelectTrigger>
                                    <SelectValue placeholder="Select reason" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="adjustment">Stock Adjustment</SelectItem>
                                    <SelectItem value="warranty">Warranty Claim</SelectItem>
                                    <SelectItem value="damage">Damaged Goods</SelectItem>
                                    <SelectItem value="internal_use">Internal Use</SelectItem>
                                </SelectContent>
                            </Select>
                            <InputError message={createForm.errors.reason} />
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
                                Record Adjustment
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}


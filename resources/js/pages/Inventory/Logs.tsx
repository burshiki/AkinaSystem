import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, SharedData } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inventory', href: '/inventory/items' },
    { title: 'Item Logs', href: '/inventory/logs' },
];

type ItemLogRow = {
    id: number;
    item_id: number;
    item_name: string;
    type: string;
    type_label: string;
    quantity_change: number;
    old_stock: number;
    new_stock: number;
    description: string | null;
    user_name: string;
    created_at: string;
};

type ItemOption = {
    id: number;
    name: string;
    stock: number;
};

export default function InventoryLogs() {
    const pageProps = usePage<
        SharedData & {
            logs?: ItemLogRow[];
            items?: ItemOption[];
            selectedItemId?: number | null;
        }
    >().props;

    const logs = pageProps.logs || [];
    const items = pageProps.items || [];
    const selectedItemId = pageProps.selectedItemId || null;

    const [filterItemId, setFilterItemId] = useState<number | null>(
        selectedItemId
    );

    const handleFilterChange = (itemId: string) => {
        const id = itemId === 'all' ? null : Number(itemId);
        setFilterItemId(id);
        router.get(
            '/inventory/logs',
            id ? { item_id: id } : {},
            { preserveScroll: true }
        );
    };

    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'received':
                return <Badge className="bg-green-500 text-white">Stock Received</Badge>;
            case 'adjustment':
                return <Badge variant="secondary">Adjustment</Badge>;
            case 'sale':
                return <Badge className="bg-blue-500 text-white">Sale</Badge>;
            case 'assembly':
                return <Badge className="bg-purple-500 text-white">Assembly</Badge>;
            case 'reversed':
                return <Badge variant="destructive">Reversed</Badge>;
            default:
                return <Badge variant="outline">{type}</Badge>;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inventory - Item Logs" />
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <h1 className="text-xl font-semibold">Item Logs</h1>
                        <p className="text-sm text-muted-foreground">
                            Monitor all stock movements and changes.
                        </p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Stock Movement History</CardTitle>
                            <div className="w-64">
                                <Label htmlFor="filter-item" className="sr-only">
                                    Filter by Item
                                </Label>
                                <Select
                                    value={
                                        filterItemId
                                            ? String(filterItemId)
                                            : 'all'
                                    }
                                    onValueChange={handleFilterChange}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Items" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All Items
                                        </SelectItem>
                                        {items.map((item) => (
                                            <SelectItem
                                                key={item.id}
                                                value={String(item.id)}
                                            >
                                                {item.name} (Stock: {item.stock})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {logs.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                {filterItemId
                                    ? 'No logs found for this item.'
                                    : 'No stock movements recorded yet.'}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="border-b">
                                        <tr className="text-left text-sm">
                                            <th className="py-3 px-3 font-medium">
                                                Date & Time
                                            </th>
                                            <th className="py-3 px-3 font-medium">
                                                Item
                                            </th>
                                            <th className="py-3 px-3 font-medium">
                                                Type
                                            </th>
                                            <th className="py-3 px-3 font-medium text-right">
                                                Change
                                            </th>
                                            <th className="py-3 px-3 font-medium text-right">
                                                Old Stock
                                            </th>
                                            <th className="py-3 px-3 font-medium text-right">
                                                New Stock
                                            </th>
                                            <th className="py-3 px-3 font-medium">
                                                Description
                                            </th>
                                            <th className="py-3 px-3 font-medium">
                                                By
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.map((log) => (
                                            <tr
                                                key={log.id}
                                                className="border-b hover:bg-muted/50"
                                            >
                                                <td className="py-3 px-3 text-sm">
                                                    {log.created_at}
                                                </td>
                                                <td className="py-3 px-3 text-sm font-medium">
                                                    {log.item_name}
                                                </td>
                                                <td className="py-3 px-3 text-sm">
                                                    {getTypeBadge(log.type)}
                                                </td>
                                                <td
                                                    className={`py-3 px-3 text-sm text-right font-semibold ${
                                                        log.quantity_change > 0
                                                            ? 'text-green-600'
                                                            : 'text-red-600'
                                                    }`}
                                                >
                                                    {log.quantity_change > 0
                                                        ? '+'
                                                        : ''}
                                                    {log.quantity_change}
                                                </td>
                                                <td className="py-3 px-3 text-sm text-right text-muted-foreground">
                                                    {log.old_stock}
                                                </td>
                                                <td className="py-3 px-3 text-sm text-right font-medium">
                                                    {log.new_stock}
                                                </td>
                                                <td className="py-3 px-3 text-sm text-muted-foreground">
                                                    {log.description || '-'}
                                                </td>
                                                <td className="py-3 px-3 text-sm text-muted-foreground">
                                                    {log.user_name}
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
        </AppLayout>
    );
}


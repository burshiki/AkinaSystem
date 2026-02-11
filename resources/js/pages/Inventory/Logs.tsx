import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, SharedData } from '@/types';
import { Badge } from '@/components/ui/badge';
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
            logs?: {
                data: ItemLogRow[];
                links: Array<{
                    url: string | null;
                    label: string;
                    active: boolean;
                }>;
            };
            items?: ItemOption[];
            selectedItemId?: number | null;
        }
    >().props;

    const logs = pageProps.logs?.data || [];
    const logLinks = pageProps.logs?.links || [];
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
                <div className="border-t">
                    <div className="border-b px-6 py-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="w-full max-w-xs">
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
                    </div>
                    <Table className="min-w-[900px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date & Time</TableHead>
                                <TableHead>Item</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Change</TableHead>
                                <TableHead className="text-right">Old Stock</TableHead>
                                <TableHead className="text-right">New Stock</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>By</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.map((log) => (
                                <TableRow
                                    key={log.id}
                                    className="border-b last:border-0 odd:bg-muted/10"
                                >
                                    <TableCell className="text-muted-foreground">
                                        {log.created_at}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {log.item_name}
                                    </TableCell>
                                    <TableCell>{getTypeBadge(log.type)}</TableCell>
                                    <TableCell
                                        className={`text-right font-semibold ${
                                            log.quantity_change > 0
                                                ? 'text-green-600'
                                                : 'text-red-600'
                                        }`}
                                    >
                                        {log.quantity_change > 0 ? '+' : ''}
                                        {log.quantity_change}
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                        {log.old_stock}
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        {log.new_stock}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {log.description || '-'}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {log.user_name}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {logs.length === 0 && (
                        <div className="border-t px-6 py-10 text-center text-sm text-muted-foreground">
                            {filterItemId
                                ? 'No logs found for this item.'
                                : 'No stock movements recorded yet.'}
                        </div>
                    )}
                    {logLinks.length > 1 && (
                        <div className="border-t px-6 py-4">
                            <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
                                {logLinks.map((link) => {
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
        </AppLayout>
    );
}


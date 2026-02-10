import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inventory', href: '/inventory/items' },
    { title: 'Stock Adjustment', href: '/inventory/stock-adjustments' },
];

export default function InventoryStockAdjustments() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inventory - Stock Adjustment" />
            <div className="space-y-2">
                <h1 className="text-xl font-semibold">Stock Adjustment</h1>
                <p className="text-sm text-muted-foreground">
                    Record manual stock adjustments.
                </p>
            </div>
        </AppLayout>
    );
}

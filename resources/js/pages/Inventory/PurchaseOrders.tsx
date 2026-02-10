import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inventory', href: '/inventory/items' },
    { title: 'Purchase Orders', href: '/inventory/purchase-orders' },
];

export default function InventoryPurchaseOrders() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inventory - Purchase Orders" />
            <div className="space-y-2">
                <h1 className="text-xl font-semibold">Purchase Orders</h1>
                <p className="text-sm text-muted-foreground">
                    Track supplier purchase orders.
                </p>
            </div>
        </AppLayout>
    );
}

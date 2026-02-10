import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inventory', href: '/inventory/items' },
    { title: 'Item Log', href: '/inventory/logs' },
];

export default function InventoryLogs() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inventory - Item Log" />
            <div className="space-y-2">
                <h1 className="text-xl font-semibold">Item Log</h1>
                <p className="text-sm text-muted-foreground">
                    View inventory activity logs.
                </p>
            </div>
        </AppLayout>
    );
}

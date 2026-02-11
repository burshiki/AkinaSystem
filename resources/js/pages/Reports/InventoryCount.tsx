import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Reports', href: '/reports/inventory-count' },
    { title: 'Inventory Count', href: '/reports/inventory-count' },
];

export default function InventoryCount() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inventory Count Report" />
            <div className="p-6">
                <div className="rounded-lg border bg-white p-6 shadow-sm">
                    <h1 className="mb-4 text-2xl font-bold">Inventory Count Report</h1>
                    <p className="text-muted-foreground">Inventory count report content will be displayed here.</p>
                </div>
            </div>
        </AppLayout>
    );
}

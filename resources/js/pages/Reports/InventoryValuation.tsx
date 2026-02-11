import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Reports', href: '/reports/inventory-valuation' },
    { title: 'Inventory Valuation', href: '/reports/inventory-valuation' },
];

export default function InventoryValuation() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inventory Valuation Report" />
            <div className="p-6">
                <div className="rounded-lg border bg-white p-6 shadow-sm">
                    <h1 className="mb-4 text-2xl font-bold">Inventory Valuation Report</h1>
                    <p className="text-muted-foreground">Inventory valuation report content will be displayed here.</p>
                </div>
            </div>
        </AppLayout>
    );
}

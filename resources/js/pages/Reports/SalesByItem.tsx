import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Reports', href: '/reports/sales-by-item' },
    { title: 'Sales by Item', href: '/reports/sales-by-item' },
];

export default function SalesByItem() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Sales by Item Report" />
            <div className="p-6">
                <div className="rounded-lg border bg-white p-6 shadow-sm">
                    <h1 className="mb-4 text-2xl font-bold">Sales by Item Report</h1>
                    <p className="text-muted-foreground">Sales by item report content will be displayed here.</p>
                </div>
            </div>
        </AppLayout>
    );
}

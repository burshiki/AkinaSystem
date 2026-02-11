import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Reports', href: '/reports/sales-summary' },
    { title: 'Sales Summary', href: '/reports/sales-summary' },
];

export default function SalesSummary() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Sales Summary Report" />
            <div className="p-6">
                <div className="rounded-lg border bg-white p-6 shadow-sm">
                    <h1 className="mb-4 text-2xl font-bold">Sales Summary Report</h1>
                    <p className="text-muted-foreground">Sales summary report content will be displayed here.</p>
                </div>
            </div>
        </AppLayout>
    );
}

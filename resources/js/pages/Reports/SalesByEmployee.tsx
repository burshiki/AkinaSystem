import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Reports', href: '/reports/sales-by-employee' },
    { title: 'Sales by Employee', href: '/reports/sales-by-employee' },
];

export default function SalesByEmployee() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Sales by Employee Report" />
            <div className="p-6">
                <div className="rounded-lg border bg-white p-6 shadow-sm">
                    <h1 className="mb-4 text-2xl font-bold">Sales by Employee Report</h1>
                    <p className="text-muted-foreground">Sales by employee report content will be displayed here.</p>
                </div>
            </div>
        </AppLayout>
    );
}

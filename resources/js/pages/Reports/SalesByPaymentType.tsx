import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Reports', href: '/reports/sales-by-payment-type' },
    { title: 'Sales by Payment Type', href: '/reports/sales-by-payment-type' },
];

export default function SalesByPaymentType() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Sales by Payment Type Report" />
            <div className="p-6">
                <div className="rounded-lg border bg-white p-6 shadow-sm">
                    <h1 className="mb-4 text-2xl font-bold">Sales by Payment Type Report</h1>
                    <p className="text-muted-foreground">Sales by payment type report content will be displayed here.</p>
                </div>
            </div>
        </AppLayout>
    );
}

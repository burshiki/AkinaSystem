import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Reports', href: '/reports/receipts' },
    { title: 'Receipts', href: '/reports/receipts' },
];

export default function Receipts() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Receipts Report" />
            <div className="p-6">
                <div className="rounded-lg border bg-white p-6 shadow-sm">
                    <h1 className="mb-4 text-2xl font-bold">Receipts Report</h1>
                    <p className="text-muted-foreground">Receipts report content will be displayed here.</p>
                </div>
            </div>
        </AppLayout>
    );
}

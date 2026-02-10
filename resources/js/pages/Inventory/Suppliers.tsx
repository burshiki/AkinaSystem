import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inventory', href: '/inventory/items' },
    { title: 'Supplier', href: '/inventory/suppliers' },
];

export default function InventorySuppliers() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inventory - Supplier" />
            <div className="space-y-2">
                <h1 className="text-xl font-semibold">Supplier</h1>
                <p className="text-sm text-muted-foreground">
                    Manage supplier records.
                </p>
            </div>
        </AppLayout>
    );
}

import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Inventory', href: '/inventory/items' },
    { title: 'Item Assembly', href: '/inventory/assembly' },
];

export default function InventoryAssembly() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inventory - Item Assembly" />
            <div className="space-y-2">
                <h1 className="text-xl font-semibold">Item Assembly</h1>
                <p className="text-sm text-muted-foreground">
                    Build finished items from components.
                </p>
            </div>
        </AppLayout>
    );
}

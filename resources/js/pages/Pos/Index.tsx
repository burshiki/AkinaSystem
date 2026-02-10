import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import pos from '@/routes/pos';
import type { BreadcrumbItem } from '@/types';
import { Input } from '@/components/ui/input';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'POS',
        href: pos.index().url,
    },
];

export default function PosIndex() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="POS" />
            
        </AppLayout>
    );
}

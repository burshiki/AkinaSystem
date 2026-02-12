import { Head } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import Pagination, { type PaginationData } from '@/components/pagination';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Warranty', href: '/warranty' },
    { title: 'Index', href: '/warranty' },
];

type WarrantyRow = {
    id: number;
    item?: string | null;
    customer?: string | null;
    sale_id: number;
    serial_number: string;
    warranty_months: number;
    sold_at?: string | null;
    expires_at?: string | null;
    is_expired: boolean;
};

type PageProps = {
    warranties: PaginationData<WarrantyRow>;
};

export default function WarrantyIndex({ warranties }: PageProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Warranty" />
            <div className="space-y-6">
                <div className="border-t">
                    <div className="border-b px-6 py-4">
                        <h1 className="text-lg font-semibold">Warranty Records</h1>
                        <p className="text-sm text-muted-foreground">
                            Records generated from POS sales of warranty-enabled items.
                        </p>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Serial Number</TableHead>
                                <TableHead>Item</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Sale #</TableHead>
                                <TableHead>Sold Date</TableHead>
                                <TableHead>Expires</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {warranties.data.map((warranty) => (
                                <TableRow key={warranty.id}>
                                    <TableCell className="font-medium">
                                        {warranty.serial_number}
                                    </TableCell>
                                    <TableCell>{warranty.item ?? '—'}</TableCell>
                                    <TableCell>{warranty.customer ?? 'Walk-in Customer'}</TableCell>
                                    <TableCell>#{warranty.sale_id}</TableCell>
                                    <TableCell>{warranty.sold_at ?? '—'}</TableCell>
                                    <TableCell>{warranty.expires_at ?? '—'}</TableCell>
                                    <TableCell>
                                        {warranty.is_expired ? (
                                            <Badge variant="destructive">Expired</Badge>
                                        ) : (
                                            <Badge variant="default">Active</Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {warranties.data.length === 0 && (
                        <div className="border-t px-6 py-10 text-center text-sm text-muted-foreground">
                            No warranty records yet.
                        </div>
                    )}

                    {warranties.data.length > 0 && <Pagination data={warranties} />}
                </div>
            </div>
        </AppLayout>
    );
}

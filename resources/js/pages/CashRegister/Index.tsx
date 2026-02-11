import { Head, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
    {
        title: 'Cash Register',
        href: '/cash-register',
    },
];

type RegisterSession = {
    id: number;
    opening_balance: string;
    cash_sales: string;
    debt_repaid: string;
    expected_cash: string;
    actual_cash?: string | null;
    opened_at?: string | null;
};

type ItemSaleRow = {
    id: number;
    name: string;
    quantity: number;
    revenue: string;
};

type PageProps = {
    session: RegisterSession | null;
    itemSales: ItemSaleRow[];
};

export default function CashRegisterIndex({ session, itemSales }: PageProps) {
    const page = usePage();
    const errors = page.props.errors as Record<string, string> | undefined;
    
    const openForm = useForm({
        opening_balance: '',
    });

    const closeForm = useForm({
        actual_cash: '',
    });

    const expectedCash = useMemo(() => {
        if (!session) {
            return '0.00';
        }

        return Number(session.expected_cash || 0).toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    }, [session]);

    const handleOpenSubmit = (event: FormEvent) => {
        event.preventDefault();
        openForm.post('/cash-register/open');
    };

    const handleCloseSubmit = (event: FormEvent) => {
        event.preventDefault();
        closeForm.post('/cash-register/close');
    };

    const openingBalance = session
        ? Number(session.opening_balance || 0).toLocaleString('en-PH', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
          })
        : '0.00';

    const cashSales = session
        ? Number(session.cash_sales || 0).toLocaleString('en-PH', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
          })
        : '0.00';

    const debtRepaid = session
        ? Number(session.debt_repaid || 0).toLocaleString('en-PH', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
          })
        : '0.00';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cash Register" />
            <div className="space-y-6 p-6">
                {errors?.error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{errors.error}</AlertDescription>
                    </Alert>
                )}
                
                {!session ? (
                    <Card className="max-w-xl rounded-3xl shadow-lg">
                        <CardHeader className="pb-3">
                            <div className="text-xl font-semibold">
                                Open Register
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Enter the opening cash balance to begin a shift.
                            </p>
                        </CardHeader>
                        <CardContent>
                            <form
                                onSubmit={handleOpenSubmit}
                                className="space-y-5"
                            >
                                <div className="space-y-2.5">
                                    <label
                                        htmlFor="opening-balance"
                                        className="text-sm font-medium"
                                    >
                                        Opening balance
                                    </label>
                                    <Input
                                        id="opening-balance"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={openForm.data.opening_balance}
                                        onChange={(event) =>
                                            openForm.setData(
                                                'opening_balance',
                                                event.target.value
                                            )
                                        }
                                        placeholder="0.00"
                                        className={
                                            openForm.errors.opening_balance
                                                ? 'h-11 border-destructive focus-visible:ring-destructive'
                                                : 'h-11'
                                        }
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    disabled={openForm.processing}
                                    className="h-11"
                                >
                                    Start Session
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-6">
                        <div className="grid gap-6 lg:grid-cols-2">
                            <Card className="rounded-3xl border bg-white shadow-lg">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                                        Live Session Tracking (₱)
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-5">
                                    <div className="flex items-center justify-between rounded-2xl bg-muted/40 px-5 py-4">
                                        <span className="text-sm text-muted-foreground">
                                            Opening Balance
                                        </span>
                                        <span className="text-lg font-semibold">
                                            ₱{openingBalance}
                                        </span>
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="rounded-2xl bg-indigo-50 px-5 py-5">
                                            <div className="text-xs font-semibold uppercase text-indigo-400">
                                                Cash Sales
                                            </div>
                                            <div className="text-lg font-semibold text-indigo-600">
                                                +₱{cashSales}
                                            </div>
                                        </div>
                                        <div className="rounded-2xl bg-emerald-50 px-5 py-5">
                                            <div className="text-xs font-semibold uppercase text-emerald-400">
                                                Debt Repaid
                                            </div>
                                            <div className="text-lg font-semibold text-emerald-600">
                                                +₱{debtRepaid}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="rounded-2xl bg-indigo-600 px-6 py-6 text-white">
                                        <div className="text-xs font-semibold uppercase text-indigo-200">
                                            Expected Cash in Drawer
                                        </div>
                                        <div className="text-2xl font-semibold">
                                            ₱{expectedCash}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="rounded-3xl border bg-white shadow-lg">
                                <CardHeader className="pb-3">
                                    <div className="text-sm font-semibold text-muted-foreground">
                                        Close Register
                                    </div>
                                    <div className="text-xs font-semibold uppercase text-muted-foreground/70">
                                        Synchronize physical drawer cash (₱)
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-5">
                                    <form
                                        onSubmit={handleCloseSubmit}
                                        className="space-y-5"
                                    >
                                        <div>
                                            <div className="text-xs font-semibold uppercase text-muted-foreground/70">
                                                Enter Actual Cash Count (₱)
                                            </div>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={closeForm.data.actual_cash}
                                                onChange={(event) =>
                                                    closeForm.setData(
                                                        'actual_cash',
                                                        event.target.value
                                                    )
                                                }
                                                placeholder="0.00"
                                                className={`mt-3 h-14 text-center text-2xl font-semibold ${
                                                    closeForm.errors.actual_cash
                                                        ? 'border-destructive focus-visible:ring-destructive'
                                                        : ''
                                                }`}
                                            />
                                        </div>
                                        <Button
                                            type="submit"
                                            className="h-12 w-full rounded-full bg-rose-600 text-white hover:bg-rose-700"
                                            disabled={closeForm.processing}
                                        >
                                            Review &amp; Finalize Shift
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="rounded-3xl border bg-white">
                            <CardHeader>
                                <div className="text-sm font-semibold">
                                    Current Session Item Sales (₱)
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Hardware Item</TableHead>
                                            <TableHead className="text-right">
                                                Qty
                                            </TableHead>
                                            <TableHead className="text-right">
                                                Revenue
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {itemSales.length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={3}
                                                    className="text-center text-sm text-muted-foreground"
                                                >
                                                    No sales made in this session
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            itemSales.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell>
                                                        {item.name}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {item.quantity}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        ₱{item.revenue}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

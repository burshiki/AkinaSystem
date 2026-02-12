import { Head, router, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Printer, X } from 'lucide-react';
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
    bank_sales: string;
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

type MoneyFlowRow = {
    id: number;
    type: 'in' | 'out';
    amount: string;
    category: string | null;
    description: string | null;
    user: string;
    created_at: string | null;
};

type PageProps = {
    session: RegisterSession | null;
    itemSales: ItemSaleRow[];
    moneyFlow: MoneyFlowRow[];
};

type ShiftReviewData = {
    session: {
        id: number;
        opening_balance: string;
        cash_sales: string;
        bank_sales: string;
        debt_repaid: string;
        expected_cash: string;
        opened_at: string;
        opened_by: string;
    };
    sales: Array<{
        id: number;
        customer: string;
        payment_method: string;
        total: string;
        created_at: string;
    }>;
    itemSales: Array<{
        id: number;
        name: string;
        quantity: number;
        unit_price: string;
        subtotal: string;
    }>;
    totalSales: number;
};

export default function CashRegisterIndex({ session, itemSales, moneyFlow }: PageProps) {
    const page = usePage();
    const errors = page.props.errors as Record<string, string> | undefined;
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [reviewData, setReviewData] = useState<ShiftReviewData | null>(null);
    const [actualCashInput, setActualCashInput] = useState('');
    const [isLoadingReview, setIsLoadingReview] = useState(false);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [moneyFlowFilter, setMoneyFlowFilter] = useState<
        'all' | 'sale' | 'refund' | 'opening_balance' | 'debt_payment'
    >('all');
    
    const openForm = useForm({
        opening_balance: '',
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

    const bankSales = session
        ? Number(session.bank_sales || 0).toLocaleString('en-PH', {
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

    // Auto-refresh to sync data across users
    useEffect(() => {
        const interval = setInterval(() => {
            // Only refresh if page is visible
            if (document.visibilityState === 'visible') {
                router.reload({ only: ['session', 'itemSales', 'moneyFlow'] });
            }
        }, 5000); // Refresh every 5 seconds

        return () => clearInterval(interval);
    }, []);

    const handleOpenReview = async () => {
        if (!session) return;
        
        setIsLoadingReview(true);
        try {
            const response = await fetch('/cash-register/shift-review');
            const data = await response.json();
            setReviewData(data);
            setActualCashInput('');
            setIsReviewOpen(true);
        } catch (error) {
            console.error('Error fetching shift review:', error);
        } finally {
            setIsLoadingReview(false);
        }
    };

    const handleFinalizeSubmit = (event: FormEvent) => {
        event.preventDefault();

        if (isFinalizing) {
            return;
        }

        const actualCash = actualCashInput.replace(/,/g, '').trim();
        if (!actualCash) {
            return;
        }

        setIsFinalizing(true);
        router.post(
            '/cash-register/finalize',
            { actual_cash: actualCash },
            {
                onSuccess: () => {
                    setIsReviewOpen(false);
                    setReviewData(null);
                    setActualCashInput('');
                },
                onFinish: () => setIsFinalizing(false),
            }
        );
    };

    const calculateVariance = () => {
        if (!reviewData || !actualCashInput) return null;

        const expected = parseFloat(
            reviewData.session.expected_cash.replace(/,/g, '')
        );
        const actual = parseFloat(actualCashInput.replace(/,/g, ''));

        if (Number.isNaN(expected) || Number.isNaN(actual)) {
            return null;
        }

        // Variance = Expected - Actual
        // Positive = Shortage, Negative = Overage
        const variance = expected - actual;

        return {
            expected,
            actual,
            variance,
            isShortage: variance > 0,
            isOverage: variance < 0,
            amount: Math.abs(variance),
        };
    };

    const variance = calculateVariance();

    const filteredMoneyFlow = useMemo(() => {
        if (moneyFlowFilter === 'all') {
            return moneyFlow;
        }

        return moneyFlow.filter((tx) => tx.category === moneyFlowFilter);
    }, [moneyFlow, moneyFlowFilter]);

    const handlePrint = () => {
        if (!reviewData || !variance) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const expectedDisplay = parseFloat(reviewData.session.expected_cash).toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
        const actualDisplay = actualCashInput ? parseFloat(actualCashInput).toLocaleString('en-PH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }) : '0.00';

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Cash Register Shift Report</title>
                <style>
                    body {
                        font-family: 'Courier New', monospace;
                        margin: 20px;
                        max-width: 80mm;
                        color: #333;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 20px;
                        border-bottom: 2px dashed #000;
                        padding-bottom: 10px;
                    }
                    .title {
                        font-size: 18px;
                        font-weight: bold;
                        margin-bottom: 5px;
                    }
                    .subtitle {
                        font-size: 12px;
                        color: #666;
                    }
                    .section {
                        margin-bottom: 20px;
                    }
                    .section-title {
                        font-weight: bold;
                        margin-bottom: 10px;
                        border-bottom: 1px solid #ddd;
                        padding-bottom: 5px;
                    }
                    .row {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 8px;
                        font-size: 13px;
                    }
                    .label {
                        flex: 1;
                    }
                    .value {
                        text-align: right;
                        font-weight: bold;
                    }
                    .summary-row {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 8px;
                        font-size: 14px;
                        font-weight: bold;
                        border-bottom: 2px dashed #000;
                        padding-bottom: 8px;
                    }
                    .variance {
                        margin-top: 10px;
                        padding: 10px;
                        border-radius: 4px;
                        text-align: center;
                    }
                    .variance.positive {
                        background-color: #dcfce7;
                        color: #166534;
                    }
                    .variance.negative {
                        background-color: #fee2e2;
                        color: #991b1b;
                    }
                    .table {
                        width: 100%;
                        margin-bottom: 10px;
                        font-size: 12px;
                    }
                    .table-row {
                        display: grid;
                        grid-template-columns: 2fr 1fr 1fr 1fr;
                        gap: 5px;
                        margin-bottom: 5px;
                        padding: 5px 0;
                        border-bottom: 1px solid #eee;
                    }
                    .table-header {
                        font-weight: bold;
                        border-bottom: 2px solid #000;
                        text-align: right;
                    }
                    .table-header > div:first-child {
                        text-align: left;
                    }
                    .table-row > div:nth-child(n+2) {
                        text-align: right;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 20px;
                        font-size: 11px;
                        color: #999;
                        border-top: 2px dashed #000;
                        padding-top: 10px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="title">SHIFT REPORT</div>
                    <div class="subtitle">Cash Register Session Report</div>
                </div>

                <div class="section">
                    <div class="section-title">SESSION DETAILS</div>
                    <div class="row">
                        <span class="label">Opened By:</span>
                        <span class="value">${reviewData.session.opened_by}</span>
                    </div>
                    <div class="row">
                        <span class="label">Date/Time:</span>
                        <span class="value">${reviewData.session.opened_at}</span>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">CASH DRAWER CALCULATION</div>
                    <div class="row">
                        <span class="label">Opening Balance:</span>
                        <span class="value">₱${reviewData.session.opening_balance}</span>
                    </div>
                    <div class="row">
                        <span class="label">Cash Sales:</span>
                        <span class="value">₱${reviewData.session.cash_sales}</span>
                    </div>
                    <div class="row">
                        <span class="label">Online Bank Sales:</span>
                        <span class="value">₱${reviewData.session.bank_sales}</span>
                    </div>
                    <div class="row">
                        <span class="label">Debt Repaid:</span>
                        <span class="value">₱${reviewData.session.debt_repaid}</span>
                    </div>
                    <div class="summary-row">
                        <span class="label">Expected Cash:</span>
                        <span class="value">₱${expectedDisplay}</span>
                    </div>
                    <div class="summary-row">
                        <span class="label">Actual Cash Count:</span>
                        <span class="value">₱${actualDisplay}</span>
                    </div>
                    ${variance ? `
                    <div class="variance ${variance.isShortage ? 'negative' : 'positive'}">
                        <div>${variance.isShortage ? 'SHORTAGE' : 'OVERAGE'}</div>
                        <div>₱${variance.amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                    ` : ''}
                </div>

                <div class="section">
                    <div class="section-title">ITEM SALES SUMMARY</div>
                    <div class="table">
                        <div class="table-header table-row">
                            <div>Item Name</div>
                            <div>Qty</div>
                            <div>Price</div>
                            <div>Total</div>
                        </div>
                        ${reviewData.itemSales.map(item => `
                        <div class="table-row">
                            <div>${item.name}</div>
                            <div>${item.quantity}</div>
                            <div>₱${item.unit_price}</div>
                            <div>₱${item.subtotal}</div>
                        </div>
                        `).join('')}
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">TRANSACTION COUNT</div>
                    <div class="row">
                        <span class="label">Total Transactions:</span>
                        <span class="value">${reviewData.totalSales}</span>
                    </div>
                </div>

                <div class="footer">
                    Printed: ${new Date().toLocaleString()}
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        
        setTimeout(() => {
            printWindow.print();
        }, 250);
    };

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
                    <Card className="mx-auto w-full max-w-xl rounded-3xl shadow-lg">
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
                                        type="text"
                                        inputMode="decimal"
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
                                    {openForm.errors.opening_balance && (
                                        <p className="text-xs text-destructive">
                                            {openForm.errors.opening_balance}
                                        </p>
                                    )}
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
                                    <div className="grid gap-4 sm:grid-cols-3">
                                        <div className="rounded-2xl bg-indigo-50 px-5 py-5">
                                            <div className="text-xs font-semibold uppercase text-indigo-400">
                                                Cash Sales
                                            </div>
                                            <div className="text-lg font-semibold text-indigo-600">
                                                +₱{cashSales}
                                            </div>
                                        </div>
                                        <div className="rounded-2xl bg-sky-50 px-5 py-5">
                                            <div className="text-xs font-semibold uppercase text-sky-400">
                                                Online Bank Sales
                                            </div>
                                            <div className="text-lg font-semibold text-sky-600">
                                                +₱{bankSales}
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
                                        Review &amp; Finalize Shift
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-5">
                                    <div className="rounded-2xl bg-amber-50 px-5 py-5 text-sm text-amber-800">
                                        Click the button below to review your cash drawer and finalize your shift. You'll be able to count actual cash and confirm before closing.
                                    </div>
                                    <Button
                                        onClick={handleOpenReview}
                                        disabled={isLoadingReview}
                                        className="h-12 w-full rounded-full bg-rose-600 text-white hover:bg-rose-700"
                                    >
                                        {isLoadingReview ? 'Loading...' : 'Review and Finalize Shift'}
                                    </Button>
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

                        <Card className="rounded-3xl border bg-white">
                            <CardHeader>
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="text-sm font-semibold">
                                        Current Session Money Flow (₱)
                                    </div>
                                    <div className="w-full sm:w-56">
                                        <Select
                                            value={moneyFlowFilter}
                                            onValueChange={(value) =>
                                                setMoneyFlowFilter(
                                                    value as
                                                        | 'all'
                                                        | 'sale'
                                                        | 'refund'
                                                        | 'opening_balance'
                                                        | 'debt_payment'
                                                )
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="All categories" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All categories</SelectItem>
                                                <SelectItem value="sale">Sales</SelectItem>
                                                <SelectItem value="debt_payment">Debt Payments</SelectItem>
                                                <SelectItem value="refund">Refunds</SelectItem>
                                                <SelectItem value="opening_balance">Opening Balance</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Type</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>User</TableHead>
                                            <TableHead className="text-right">Time</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredMoneyFlow.length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={6}
                                                    className="text-center text-sm text-muted-foreground"
                                                >
                                                    No money flow found for this filter
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredMoneyFlow.map((tx) => (
                                                <TableRow key={tx.id}>
                                                    <TableCell className="font-medium">
                                                        {tx.type === 'in' ? 'Cash In' : 'Cash Out'}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {tx.type === 'in' ? '+' : '-'}₱{tx.amount}
                                                    </TableCell>
                                                    <TableCell>
                                                        {tx.category || '—'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {tx.description || '—'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {tx.user}
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm text-muted-foreground">
                                                        {tx.created_at || '—'}
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

            {/* Shift Review & Finalize Modal */}
            <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
                <DialogContent className="sm:max-w-5xl">
                    <DialogHeader>
                        <DialogTitle>Shift Review & Finalization</DialogTitle>
                        <DialogDescription>
                            Review session totals, then finalize and close the register.
                        </DialogDescription>
                    </DialogHeader>
                    <hr />
                    <form onSubmit={handleFinalizeSubmit} className="space-y-6">
                        <div className="max-h-[65vh] overflow-y-auto space-y-6 pr-1">
                            {reviewData && (
                                <>
                                    {/* Expected vs Actual */}
                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-lg">Cash Drawer Calculation</h3>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            {/* Expected */}
                                            <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-5">
                                                <div className="text-xs font-semibold uppercase text-indigo-600">Expected Cash</div>
                                                <div className="mt-2 text-2xl font-bold text-indigo-900">
                                                    ₱{reviewData.session.expected_cash}
                                                </div>
                                                <div className="mt-3 space-y-2 text-sm text-indigo-700">
                                                    <div className="flex justify-between">
                                                        <span>Opening:</span>
                                                        <span className="font-medium">₱{reviewData.session.opening_balance}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Cash Sales:</span>
                                                        <span className="font-medium">+₱{reviewData.session.cash_sales}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Online Bank Sales:</span>
                                                        <span className="font-medium">₱{reviewData.session.bank_sales}</span>
                                                    </div>
                                                    <div className="flex justify-between border-t border-indigo-200 pt-2">
                                                        <span>Debt Repaid:</span>
                                                        <span className="font-medium">+₱{reviewData.session.debt_repaid}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Actual */}
                                            <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-5">
                                                <div className="text-xs font-semibold uppercase text-rose-600">Actual Cash Count</div>
                                                <Input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={actualCashInput}
                                                    onChange={(e) => setActualCashInput(e.target.value)}
                                                    placeholder="Enter actual cash count"
                                                    className="mt-2 border-0 bg-white/80 text-2xl font-bold text-rose-900 placeholder:text-rose-400 h-16"
                                                />
                                                {variance && (
                                                    <div className={`mt-3 rounded-lg p-3 text-sm font-medium text-center ${
                                                        variance.isShortage
                                                            ? 'bg-red-100 text-red-900'
                                                            : 'bg-green-100 text-green-900'
                                                    }`}>
                                                        {variance.isShortage ? '⚠ Shortage' : '✓ Overage'}: ₱{variance.amount.toFixed(2)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Item Sales */}
                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-lg">Item Sales Summary</h3>
                                        <div className="rounded-xl border overflow-hidden">
                                            <Table>
                                                <TableHeader className="bg-muted/50">
                                                    <TableRow>
                                                        <TableHead>Item</TableHead>
                                                        <TableHead className="text-right">Qty</TableHead>
                                                        <TableHead className="text-right">Unit Price</TableHead>
                                                        <TableHead className="text-right">Total</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {reviewData.itemSales.map((item) => (
                                                        <TableRow key={item.id}>
                                                            <TableCell className="font-medium">{item.name}</TableCell>
                                                            <TableCell className="text-right">{item.quantity}</TableCell>
                                                            <TableCell className="text-right">₱{item.unit_price}</TableCell>
                                                            <TableCell className="text-right font-medium">₱{item.subtotal}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>

                                    {/* Transactions */}
                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-lg">Transactions ({reviewData.totalSales})</h3>
                                        <div className="rounded-xl border overflow-hidden">
                                            <Table>
                                                <TableHeader className="bg-muted/50">
                                                    <TableRow>
                                                        <TableHead>Customer</TableHead>
                                                        <TableHead>Payment</TableHead>
                                                        <TableHead className="text-right">Amount</TableHead>
                                                        <TableHead className="text-right">Time</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {reviewData.sales.length === 0 ? (
                                                        <TableRow>
                                                            <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-4">
                                                                No transactions recorded
                                                            </TableCell>
                                                        </TableRow>
                                                    ) : (
                                                        reviewData.sales.map((sale) => (
                                                            <TableRow key={sale.id}>
                                                                <TableCell className="font-medium text-sm">{sale.customer}</TableCell>
                                                                <TableCell className="text-sm">
                                                                    <span className="rounded-full bg-muted px-2 py-1 text-xs">
                                                                        {sale.payment_method}
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell className="text-right font-medium">₱{sale.total}</TableCell>
                                                                <TableCell className="text-right text-sm text-muted-foreground">{sale.created_at}</TableCell>
                                                            </TableRow>
                                                        ))
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <DialogFooter className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                            <div className="flex w-full gap-3 sm:w-auto">
                                <Button
                                    type="button"
                                    onClick={handlePrint}
                                    disabled={!actualCashInput}
                                    variant="outline"
                                    className="w-full sm:w-auto"
                                >
                                    <Printer className="mr-2 h-4 w-4" />
                                    Print Report
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => setIsReviewOpen(false)}
                                    variant="ghost"
                                    className="w-full sm:w-auto"
                                >
                                    Cancel
                                </Button>
                            </div>
                            <Button
                                type="submit"
                                disabled={!actualCashInput || isFinalizing}
                                className="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white sm:w-auto"
                            >
                                {isFinalizing ? 'Finalizing...' : 'Finalize & Close Shift'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

import { Head, Link, router, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Register History', href: '/register-history' },
];

type SessionRow = {
    id: number;
    opened_at: string | null;
    closed_at: string | null;
    opened_by: string;
    closed_by: string;
    opening_balance: string;
    cash_sales: string;
    debt_repaid: string;
    expected_cash: string;
    actual_cash: string | null;
    status: string;
    access_status?: string | null;
};

type PendingRequestRow = {
    id: number;
    session_id: number;
    requested_by: string;
    requested_at: string;
    reason: string | null;
};

type SessionDetail = {
    session: {
        id: number;
        opened_at: string | null;
        closed_at: string | null;
        opening_balance: string;
        cash_sales: string;
        debt_repaid: string;
        expected_cash: string;
        actual_cash: string | null;
    };
    sales: Array<{
        id: number;
        parent_sale_id: number | null;
        customer: string;
        payment_method: string;
        total: string;
        created_at: string;
        status: string;
        items: Array<{
            id: number;
            item_id: number;
            name: string;
            quantity: number;
            price: string;
            subtotal: string;
        }>;
    }>;
    itemSales: Array<{
        id: number;
        name: string;
        quantity: number;
        unit_price: string;
        subtotal: string;
    }>;
    totalSales: number;
    bankAccounts: Array<{
        id: number;
        bank_name: string;
        account_name: string;
        account_number: string;
    }>;
    transactions: Array<{
        id: number;
        type: string;
        amount: string;
        category: string;
        description: string | null;
        user: string;
        created_at: string;
    }>;
};

type PageProps = {
    sessions: {
        data: SessionRow[];
        links: Array<{
            url: string | null;
            label: string;
            active: boolean;
        }>;
    };
    pendingRequests: PendingRequestRow[];
    isAdmin: boolean;
};

export default function RegisterHistoryIndex({ sessions, pendingRequests, isAdmin }: PageProps) {
    const { errors } = usePage().props as { errors?: Record<string, string> };
    const [selectedSession, setSelectedSession] = useState<SessionDetail | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isRequestOpen, setIsRequestOpen] = useState(false);
    const [requestReason, setRequestReason] = useState('');
    const [requestSessionId, setRequestSessionId] = useState<number | null>(null);
    const [editReason, setEditReason] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isReturnOpen, setIsReturnOpen] = useState(false);
    const [returnReason, setReturnReason] = useState('');
    const [returnSaleId, setReturnSaleId] = useState<number | null>(null);
    const [returnItems, setReturnItems] = useState<Record<number, number>>({});
    const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
    const [returnError, setReturnError] = useState<string | null>(null);
    const [editFields, setEditFields] = useState({
        opening_balance: '',
        cash_sales: '',
        debt_repaid: '',
        actual_cash: '',
    });
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isRefundSourceOpen, setIsRefundSourceOpen] = useState(false);
    const [refundSource, setRefundSource] = useState<'cash' | 'bank'>('cash');
    const [refundBankAccountId, setRefundBankAccountId] = useState<string>('');
    const [pendingRefund, setPendingRefund] = useState<{ refund_id: number; refund_amount: number } | null>(null);
    const [isSubmittingRefundSource, setIsSubmittingRefundSource] = useState(false);
    const [refundSourceError, setRefundSourceError] = useState<string | null>(null);

    const getCsrfToken = () => {
        const token = document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute('content');

        if (token) {
            return token;
        }

        const cookie = document.cookie
            .split('; ')
            .find((item) => item.startsWith('XSRF-TOKEN='));

        if (!cookie) {
            return '';
        }

        return decodeURIComponent(cookie.split('=')[1]);
    };

    const getXsrfToken = () => {
        const cookie = document.cookie
            .split('; ')
            .find((item) => item.startsWith('XSRF-TOKEN='));

        if (!cookie) {
            return '';
        }

        return decodeURIComponent(cookie.split('=')[1]);
    };

    const selectedSessionId = selectedSession?.session.id ?? null;
    const returnableSales = useMemo(
        () => selectedSession?.sales.filter((sale) => sale.status === 'completed') ?? [],
        [selectedSession]
    );

    const selectedReturnSale = useMemo(
        () => returnableSales.find((sale) => sale.id === returnSaleId) ?? null,
        [returnSaleId, returnableSales]
    );

    const returnedByItem = useMemo(() => {
        if (!selectedSession || !selectedReturnSale) {
            return {} as Record<number, number>;
        }

        return selectedSession.sales
            .filter((sale) => sale.parent_sale_id === selectedReturnSale.id)
            .reduce((acc, sale) => {
                sale.items.forEach((item) => {
                    acc[item.item_id] = (acc[item.item_id] ?? 0) + Math.abs(item.quantity);
                });
                return acc;
            }, {} as Record<number, number>);
    }, [selectedReturnSale, selectedSession]);

    const hasReturnSelection = useMemo(
        () => Object.values(returnItems).some((qty) => qty > 0),
        [returnItems]
    );

    const handleOpenReturn = () => {
        if (returnableSales.length === 0) {
            return;
        }

        setReturnSaleId(returnableSales[0].id);
        setReturnItems({});
        setReturnReason('');
        setReturnError(null);
        setIsReturnOpen(true);
    };

    const handleReturnSaleChange = (saleId: string) => {
        setReturnSaleId(Number(saleId));
        setReturnItems({});
        setReturnError(null);
    };

    const updateReturnItem = (itemId: number, value: string, maxQty: number) => {
        const parsed = Number(value);
        if (Number.isNaN(parsed)) {
            setReturnItems((prev) => ({ ...prev, [itemId]: 0 }));
            return;
        }

        const normalized = Math.min(Math.max(parsed, 0), maxQty);
        setReturnItems((prev) => ({ ...prev, [itemId]: normalized }));
    };

    const handleSubmitReturn = async () => {
        if (!returnSaleId || isSubmittingReturn) return;

        const items = Object.entries(returnItems)
            .filter(([, qty]) => qty > 0)
            .map(([id, qty]) => ({ id: Number(id), quantity: qty }));

        if (items.length === 0 || !returnReason.trim()) return;

        setIsSubmittingReturn(true);
        setReturnError(null);
        try {
            const response = await fetch(`/register-history/sales/${returnSaleId}/return`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'X-XSRF-TOKEN': getXsrfToken(),
                },
                body: JSON.stringify({ reason: returnReason.trim(), items }),
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                setReturnError(payload?.error || 'Return failed. Please try again.');
                return;
            }

            const result = await response.json();
            setPendingRefund({ refund_id: result.refund_id, refund_amount: result.refund_amount });
            setIsReturnOpen(false);
            setIsRefundSourceOpen(true);
            setReturnReason('');
            setReturnItems({});
            setReturnSaleId(null);
        } catch (error) {
            console.error('Return failed', error);
            setReturnError('Return failed. Please try again.');
        } finally {
            setIsSubmittingReturn(false);
        }
    };

    const handleSubmitRefundSource = async () => {
        if (!pendingRefund || isSubmittingRefundSource) return;
        if (refundSource === 'bank' && !refundBankAccountId) {
            setRefundSourceError('Please select a bank account.');
            return;
        }

        setIsSubmittingRefundSource(true);
        setRefundSourceError(null);
        try {
            const response = await fetch(`/register-history/sales/${pendingRefund.refund_id}/refund-source`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'X-XSRF-TOKEN': getXsrfToken(),
                },
                body: JSON.stringify({
                    refund_source: refundSource,
                    bank_account_id: refundSource === 'bank' ? Number(refundBankAccountId) : null,
                }),
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                setRefundSourceError(payload?.error || 'Failed to record refund source.');
                return;
            }

            if (selectedSessionId) {
                await handleOpenSession(selectedSessionId);
            }
            router.reload({ only: ['sessions', 'pendingRequests'] });
            setIsRefundSourceOpen(false);
            setPendingRefund(null);
            setRefundSource('cash');
            setRefundBankAccountId('');
        } catch (error) {
            console.error('Failed to record refund source', error);
            setRefundSourceError('Failed to record refund source. Please try again.');
        } finally {
            setIsSubmittingRefundSource(false);
        }
    };

    const handleOpenRequest = (sessionId: number) => {
        setRequestSessionId(sessionId);
        setRequestReason('');
        setIsRequestOpen(true);
    };

    const handleSubmitRequest = async () => {
        if (!requestSessionId || isSubmittingRequest) return;
        setIsSubmittingRequest(true);

        try {
            await fetch(`/register-history/${requestSessionId}/request-access`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'X-XSRF-TOKEN': getXsrfToken(),
                },
                body: JSON.stringify({ reason: requestReason || null }),
            });

            router.reload({ only: ['sessions', 'pendingRequests'] });
            setIsRequestOpen(false);
        } catch (error) {
            console.error('Request access failed', error);
        } finally {
            setIsSubmittingRequest(false);
        }
    };

    const handleOpenSession = async (sessionId: number) => {
        setIsLoadingDetail(true);
        try {
            const response = await fetch(`/register-history/${sessionId}`);
            if (!response.ok) {
                if (response.status === 403) {
                    handleOpenRequest(sessionId);
                }
                return;
            }

            const data = await response.json();
            setSelectedSession(data);
            setEditFields({
                opening_balance: data.session.opening_balance,
                cash_sales: data.session.cash_sales,
                debt_repaid: data.session.debt_repaid,
                actual_cash: data.session.actual_cash ?? '',
            });
            setEditReason('');
            setIsDetailOpen(true);
        } catch (error) {
            console.error('Failed to load session', error);
        } finally {
            setIsLoadingDetail(false);
        }
    };

    const handleUpdateSession = async () => {
        if (!selectedSessionId || isUpdating) return;
        if (!editReason.trim()) return;

        const normalizeAmount = (value: string) => value.replace(/,/g, '').trim();
        const normalizeOptional = (value: string) => {
            const normalized = normalizeAmount(value);
            return normalized === '' ? null : normalized;
        };

        setIsUpdating(true);
        try {
            await fetch(`/register-history/${selectedSessionId}`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'X-XSRF-TOKEN': getXsrfToken(),
                },
                body: JSON.stringify({
                    opening_balance: normalizeAmount(editFields.opening_balance),
                    cash_sales: normalizeAmount(editFields.cash_sales),
                    debt_repaid: normalizeAmount(editFields.debt_repaid),
                    actual_cash: normalizeOptional(editFields.actual_cash),
                    reason: editReason.trim(),
                }),
            });

            router.reload({ only: ['sessions', 'pendingRequests'] });
            setIsDetailOpen(false);
        } catch (error) {
            console.error('Update failed', error);
        } finally {
            setIsUpdating(false);
        }
    };

    const sessionLinks = sessions.links ?? [];
    const sessionsBySearch = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) {
            return sessions.data;
        }

        return sessions.data.filter((session) => {
            const values = [session.opened_at, session.closed_at]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return values.includes(query);
        });
    }, [searchQuery, sessions.data]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Register History" />
            <div className="space-y-6">
                {errors?.error && (
                    <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {errors.error}
                    </div>
                )}

                {isAdmin && pendingRequests.length > 0 && (
                    <div className="border-t">
                        <div className="border-b px-6 py-4">
                            <div className="text-lg font-semibold">Pending Access Requests</div>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Session</TableHead>
                                    <TableHead>Requested By</TableHead>
                                    <TableHead>Reason</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingRequests.map((request) => (
                                    <TableRow key={request.id}>
                                        <TableCell>Session #{request.session_id}</TableCell>
                                        <TableCell>{request.requested_by}</TableCell>
                                        <TableCell className="max-w-sm text-sm text-muted-foreground">
                                            {request.reason || 'No reason provided'}
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button
                                                size="sm"
                                                onClick={() => router.post(`/register-history/requests/${request.id}/approve`)}
                                            >
                                                Approve
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => router.post(`/register-history/requests/${request.id}/deny`)}
                                            >
                                                Deny
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}

                <div className="border-t">
                    <div className="border-b px-6 py-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
                                <Input
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
                                    placeholder="Search by date"
                                    className="sm:w-72"
                                />
                            </div>
                            <div className="text-lg font-semibold">Closed Register Sessions</div>
                        </div>
                    </div>
                    <Table className="min-w-[720px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Opened</TableHead>
                                <TableHead>Closed</TableHead>
                                <TableHead>Opened By</TableHead>
                                <TableHead>Expected</TableHead>
                                <TableHead>Actual</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sessionsBySearch.map((session) => (
                                <TableRow key={session.id} className="border-b last:border-0 odd:bg-muted/10">
                                    <TableCell>{session.opened_at}</TableCell>
                                    <TableCell>{session.closed_at || '-'}</TableCell>
                                    <TableCell>{session.opened_by}</TableCell>
                                    <TableCell>₱{session.expected_cash}</TableCell>
                                    <TableCell>₱{session.actual_cash ?? '-'}</TableCell>
                                    <TableCell className="text-right">
                                        {isAdmin || session.access_status === 'approved' || session.access_status === 'used' ? (
                                            <Button
                                                size="sm"
                                                onClick={() => handleOpenSession(session.id)}
                                            >
                                                Open
                                            </Button>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleOpenRequest(session.id)}
                                            >
                                                Request Access
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {sessionsBySearch.length === 0 && (
                        <div className="border-t px-6 py-10 text-center text-sm text-muted-foreground">
                            {searchQuery
                                ? 'No register sessions match your search.'
                                : 'No closed register sessions found.'}
                        </div>
                    )}
                    {sessionLinks.length > 1 && (
                        <div className="border-t px-6 py-4">
                            <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
                                {sessionLinks.map((link) => {
                                    if (!link.url) {
                                        return (
                                            <span
                                                key={link.label}
                                                className="rounded-md border px-3 py-1 text-muted-foreground"
                                                dangerouslySetInnerHTML={{
                                                    __html: link.label,
                                                }}
                                            />
                                        );
                                    }

                                    return (
                                        <Link
                                            key={link.label}
                                            href={link.url}
                                            className={
                                                link.active
                                                    ? 'rounded-md border border-primary bg-primary px-3 py-1 text-primary-foreground'
                                                    : 'rounded-md border px-3 py-1 text-foreground hover:bg-muted'
                                            }
                                            dangerouslySetInnerHTML={{
                                                __html: link.label,
                                            }}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={isRequestOpen} onOpenChange={setIsRequestOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Request Access</DialogTitle>
                        <DialogDescription>
                            Ask an administrator to open this closed register session.
                        </DialogDescription>
                    </DialogHeader>
                    <hr />
                    <div className="space-y-3">
                        <Label htmlFor="request-reason">Reason (optional)</Label>
                        <Textarea
                            id="request-reason"
                            value={requestReason}
                            onChange={(event) => setRequestReason(event.target.value)}
                            rows={4}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsRequestOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmitRequest} disabled={isSubmittingRequest}>
                            {isSubmittingRequest ? 'Sending...' : 'Send Request'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="sm:max-w-5xl">
                    <DialogHeader>
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <DialogTitle>
                                            Register Session #{selectedSession?.session.id}
                                        </DialogTitle>
                                        <DialogDescription>
                                            Review and edit closed register details (admin approval required).
                                        </DialogDescription>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleOpenReturn}
                                        disabled={returnableSales.length === 0}
                                    >
                                        Return or adjust sale
                                    </Button>
                                </div>
                            </DialogHeader>
                    <hr />
                    <div className="max-h-[65vh] overflow-y-auto space-y-6 pr-1">
                        {selectedSession && (
                            <>
                                    <div className="grid gap-4 lg:grid-cols-2">
                                        <div className="rounded-2xl border bg-muted/30 p-4">
                                            <div className="text-xs uppercase text-muted-foreground">Opened</div>
                                            <div className="text-lg font-semibold">{selectedSession.session.opened_at}</div>
                                        </div>
                                        <div className="rounded-2xl border bg-muted/30 p-4">
                                            <div className="text-xs uppercase text-muted-foreground">Closed</div>
                                            <div className="text-lg font-semibold">{selectedSession.session.closed_at || '-'}</div>
                                        </div>
                                    </div>

                                    <div className="grid gap-4 lg:grid-cols-2">
                                        <div className="rounded-2xl border bg-white p-5">
                                            <div className="text-sm font-semibold">Edit Cash Totals</div>
                                            <div className="mt-4 space-y-3">
                                                <div>
                                                    <Label>Opening Balance</Label>
                                                    <Input
                                                        value={editFields.opening_balance}
                                                        onChange={(event) =>
                                                            setEditFields((prev) => ({
                                                                ...prev,
                                                                opening_balance: event.target.value,
                                                            }))
                                                        }
                                                    />
                                                </div>
                                                <div>
                                                    <Label>Cash Sales</Label>
                                                    <Input
                                                        value={editFields.cash_sales}
                                                        onChange={(event) =>
                                                            setEditFields((prev) => ({
                                                                ...prev,
                                                                cash_sales: event.target.value,
                                                            }))
                                                        }
                                                    />
                                                </div>
                                                <div>
                                                    <Label>Debt Repaid</Label>
                                                    <Input
                                                        value={editFields.debt_repaid}
                                                        onChange={(event) =>
                                                            setEditFields((prev) => ({
                                                                ...prev,
                                                                debt_repaid: event.target.value,
                                                            }))
                                                        }
                                                    />
                                                </div>
                                                <div>
                                                    <Label>Actual Cash</Label>
                                                    <Input
                                                        value={editFields.actual_cash}
                                                        onChange={(event) =>
                                                            setEditFields((prev) => ({
                                                                ...prev,
                                                                actual_cash: event.target.value,
                                                            }))
                                                        }
                                                    />
                                                </div>
                                                <div>
                                                    <Label>Reason</Label>
                                                    <Textarea
                                                        value={editReason}
                                                        onChange={(event) => setEditReason(event.target.value)}
                                                        rows={3}
                                                    />
                                                </div>
                                                <Button
                                                    onClick={handleUpdateSession}
                                                    disabled={isUpdating || !editReason.trim()}
                                                    className="w-full"
                                                >
                                                    {isUpdating ? 'Saving...' : 'Save Changes'}
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="rounded-2xl border bg-white p-5">
                                            <div className="text-sm font-semibold">Summary</div>
                                            <div className="mt-4 space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span>Expected Cash</span>
                                                    <span className="font-medium">₱{selectedSession.session.expected_cash}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Actual Cash</span>
                                                    <span className="font-medium">₱{selectedSession.session.actual_cash ?? '-'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Transactions</span>
                                                    <span className="font-medium">{selectedSession.totalSales}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

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
                                                    {selectedSession.itemSales.map((item) => (
                                                        <TableRow key={item.id}>
                                                            <TableCell>{item.name}</TableCell>
                                                            <TableCell className="text-right">{item.quantity}</TableCell>
                                                            <TableCell className="text-right">₱{item.unit_price}</TableCell>
                                                            <TableCell className="text-right">₱{item.subtotal}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-lg">Transactions</h3>
                                        <div className="rounded-xl border overflow-hidden">
                                            <Table>
                                                <TableHeader className="bg-muted/50">
                                                    <TableRow>
                                                        <TableHead>Customer</TableHead>
                                                        <TableHead>Payment</TableHead>
                                                        <TableHead>Status</TableHead>
                                                        <TableHead className="text-right">Amount</TableHead>
                                                        <TableHead className="text-right">Time</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {selectedSession.sales.length === 0 ? (
                                                        <TableRow>
                                                            <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-4">
                                                                No transactions recorded
                                                            </TableCell>
                                                        </TableRow>
                                                    ) : (
                                                        selectedSession.sales.map((sale) => (
                                                            <TableRow key={sale.id}>
                                                                <TableCell>{sale.customer}</TableCell>
                                                                <TableCell>{sale.payment_method}</TableCell>
                                                                <TableCell className="text-sm text-muted-foreground">
                                                                    {sale.status}
                                                                </TableCell>
                                                                <TableCell className="text-right">₱{sale.total}</TableCell>
                                                                <TableCell className="text-right text-sm text-muted-foreground">{sale.created_at}</TableCell>
                                                            </TableRow>
                                                        ))
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-lg">Money Flow</h3>
                                        <p className="text-sm text-muted-foreground">Track all money coming in and out of this register</p>
                                        <div className="rounded-xl border overflow-hidden">
                                            <Table>
                                                <TableHeader className="bg-muted/50">
                                                    <TableRow>
                                                        <TableHead>Type</TableHead>
                                                        <TableHead>Category</TableHead>
                                                        <TableHead>Description</TableHead>
                                                        <TableHead>User</TableHead>
                                                        <TableHead className="text-right">Amount</TableHead>
                                                        <TableHead className="text-right">Time</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {selectedSession.transactions.length === 0 ? (
                                                        <TableRow>
                                                            <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-4">
                                                                No money transactions recorded
                                                            </TableCell>
                                                        </TableRow>
                                                    ) : (
                                                        selectedSession.transactions.map((tx) => (
                                                            <TableRow key={tx.id}>
                                                                <TableCell>
                                                                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                                                        tx.type === 'in' 
                                                                            ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400'
                                                                            : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                                                                    }`}>
                                                                        {tx.type === 'in' ? 'IN' : 'OUT'}
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell className="capitalize">{tx.category}</TableCell>
                                                                <TableCell className="text-sm text-muted-foreground">{tx.description || '-'}</TableCell>
                                                                <TableCell className="text-sm">{tx.user}</TableCell>
                                                                <TableCell className="text-right font-medium">
                                                                    {tx.type === 'in' ? '+' : '-'}₱{tx.amount}
                                                                </TableCell>
                                                                <TableCell className="text-right text-sm text-muted-foreground">{tx.created_at}</TableCell>
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
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setIsDetailOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

                    <Dialog open={isReturnOpen} onOpenChange={setIsReturnOpen}>
                        <DialogContent className="sm:max-w-3xl">
                            <DialogHeader>
                                <DialogTitle>Return items from a sale</DialogTitle>
                                <DialogDescription>
                                    Choose a completed sale and enter the quantities to return.
                                </DialogDescription>
                            </DialogHeader>
                            <hr />
                            <div className="space-y-4">
                                {returnError && (
                                    <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                                        {returnError}
                                    </div>
                                )}
                                <div className="grid gap-2">
                                    <Label htmlFor="return-sale">Sale</Label>
                                    <Select
                                        value={returnSaleId ? String(returnSaleId) : undefined}
                                        onValueChange={handleReturnSaleChange}
                                    >
                                        <SelectTrigger id="return-sale">
                                            <SelectValue placeholder="Select a sale" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {returnableSales.map((sale) => (
                                                <SelectItem key={sale.id} value={String(sale.id)}>
                                                    Sale #{sale.id} - {sale.created_at} - ₱{sale.total}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {selectedReturnSale && (
                                    <div className="rounded-xl border">
                                        <Table>
                                            <TableHeader className="bg-muted/50">
                                                <TableRow>
                                                    <TableHead>Item</TableHead>
                                                    <TableHead className="text-right">Sold</TableHead>
                                                    <TableHead className="text-right">Returned</TableHead>
                                                    <TableHead className="text-right">Available</TableHead>
                                                    <TableHead className="text-right">Return Qty</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedReturnSale.items.map((item) => {
                                                    const returned = returnedByItem[item.item_id] ?? 0;
                                                    const available = Math.max(item.quantity - returned, 0);

                                                    return (
                                                        <TableRow key={item.id}>
                                                            <TableCell>{item.name}</TableCell>
                                                            <TableCell className="text-right">{item.quantity}</TableCell>
                                                            <TableCell className="text-right">{returned}</TableCell>
                                                            <TableCell className="text-right">{available}</TableCell>
                                                            <TableCell className="text-right">
                                                                <Input
                                                                    type="number"
                                                                    min={0}
                                                                    max={available}
                                                                    value={returnItems[item.id] ?? ''}
                                                                    onChange={(event) =>
                                                                        updateReturnItem(item.id, event.target.value, available)
                                                                    }
                                                                    className="w-24 text-right"
                                                                />
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}

                                <div className="grid gap-2">
                                    <Label htmlFor="return-reason">Reason</Label>
                                    <Textarea
                                        id="return-reason"
                                        value={returnReason}
                                        onChange={(event) => setReturnReason(event.target.value)}
                                        rows={3}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Add a reason and at least one return quantity to enable processing.
                                    </p>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="ghost" onClick={() => setIsReturnOpen(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSubmitReturn}
                                    disabled={
                                        isSubmittingReturn ||
                                        !returnReason.trim() ||
                                        !hasReturnSelection ||
                                        !selectedReturnSale
                                    }
                                >
                                    {isSubmittingReturn ? 'Processing...' : 'Process return'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Refund Source Modal */}
                    <Dialog open={isRefundSourceOpen} onOpenChange={setIsRefundSourceOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Refund Payment Source</DialogTitle>
                                <DialogDescription>
                                    Where will the refund money of ₱{pendingRefund?.refund_amount.toFixed(2) ?? '0.00'} come from?
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                {refundSourceError && (
                                    <div className="rounded-lg bg-destructive/15 p-3 text-sm text-destructive">
                                        {refundSourceError}
                                    </div>
                                )}

                                <div className="grid gap-2">
                                    <Label>Payment Source</Label>
                                    <Select
                                        value={refundSource}
                                        onValueChange={(value) => {
                                            setRefundSource(value as 'cash' | 'bank');
                                            setRefundBankAccountId('');
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select source" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="cash">Cash Drawer / Register</SelectItem>
                                            <SelectItem value="bank">Bank Account</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {refundSource === 'bank' && (
                                    <div className="grid gap-2">
                                        <Label>Bank Account</Label>
                                        <Select
                                            value={refundBankAccountId}
                                            onValueChange={setRefundBankAccountId}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select bank account" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {selectedSession?.bankAccounts?.map((account) => (
                                                    <SelectItem key={account.id} value={account.id.toString()}>
                                                        {account.bank_name} - {account.account_name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                            <DialogFooter>
                                <Button variant="ghost" onClick={() => setIsRefundSourceOpen(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSubmitRefundSource}
                                    disabled={isSubmittingRefundSource || (refundSource === 'bank' && !refundBankAccountId)}
                                >
                                    {isSubmittingRefundSource ? 'Confirming...' : 'Confirm Source'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
        </AppLayout>
    );
}

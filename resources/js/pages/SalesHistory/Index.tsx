import { Head, router, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Badge } from '@/components/ui/badge';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Sales History', href: '/sales-history' },
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

type PageProps = {
    sessions: SessionRow[];
    pendingRequests: PendingRequestRow[];
    isAdmin: boolean;
};

export default function SalesHistoryIndex({ sessions, pendingRequests, isAdmin }: PageProps) {
    const { errors } = usePage().props as { errors?: Record<string, string> };
    const [selectedSession, setSelectedSession] = useState<SessionDetail | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isRequestOpen, setIsRequestOpen] = useState(false);
    const [requestReason, setRequestReason] = useState('');
    const [requestSessionId, setRequestSessionId] = useState<number | null>(null);
    const [editReason, setEditReason] = useState('');
    const [editFields, setEditFields] = useState({
        opening_balance: '',
        cash_sales: '',
        debt_repaid: '',
        actual_cash: '',
    });
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const selectedSessionId = selectedSession?.session.id ?? null;

    const handleOpenRequest = (sessionId: number) => {
        setRequestSessionId(sessionId);
        setRequestReason('');
        setIsRequestOpen(true);
    };

    const handleSubmitRequest = async () => {
        if (!requestSessionId || isSubmittingRequest) return;
        setIsSubmittingRequest(true);

        try {
            await fetch(`/sales-history/${requestSessionId}/request-access`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document
                        .querySelector('meta[name="csrf-token"]')
                        ?.getAttribute('content') || '',
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
            const response = await fetch(`/sales-history/${sessionId}`);
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
            await fetch(`/sales-history/${selectedSessionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document
                        .querySelector('meta[name="csrf-token"]')
                        ?.getAttribute('content') || '',
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

    const sessionStatusBadge = (status?: string | null) => {
        if (!status) return null;
        if (status === 'approved') return <Badge className="bg-emerald-500 text-white">Approved</Badge>;
        if (status === 'pending') return <Badge className="bg-amber-500 text-white">Pending</Badge>;
        if (status === 'denied') return <Badge variant="destructive">Denied</Badge>;
        if (status === 'used') return <Badge variant="outline">Used</Badge>;
        return <Badge variant="outline">None</Badge>;
    };

    const sessionsBySearch = useMemo(() => sessions, [sessions]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Sales History" />
            <div className="space-y-6 p-6">
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
                                                onClick={() => router.post(`/sales-history/requests/${request.id}/approve`)}
                                            >
                                                Approve
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => router.post(`/sales-history/requests/${request.id}/deny`)}
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
                        <div className="text-lg font-semibold">Closed Register Sessions</div>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Opened</TableHead>
                                <TableHead>Closed</TableHead>
                                <TableHead>Opened By</TableHead>
                                <TableHead>Expected</TableHead>
                                <TableHead>Actual</TableHead>
                                <TableHead>Access</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sessionsBySearch.map((session) => (
                                <TableRow key={session.id}>
                                    <TableCell>{session.opened_at}</TableCell>
                                    <TableCell>{session.closed_at || '-'}</TableCell>
                                    <TableCell>{session.opened_by}</TableCell>
                                    <TableCell>₱{session.expected_cash}</TableCell>
                                    <TableCell>₱{session.actual_cash ?? '-'}</TableCell>
                                    <TableCell>{sessionStatusBadge(session.access_status)}</TableCell>
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
                            No closed register sessions found.
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
                        <DialogTitle>
                            Register Session #{selectedSession?.session.id}
                        </DialogTitle>
                        <DialogDescription>
                            Review and edit closed register details (admin approval required).
                        </DialogDescription>
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
                                                        <TableHead className="text-right">Amount</TableHead>
                                                        <TableHead className="text-right">Time</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {selectedSession.sales.length === 0 ? (
                                                        <TableRow>
                                                            <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-4">
                                                                No transactions recorded
                                                            </TableCell>
                                                        </TableRow>
                                                    ) : (
                                                        selectedSession.sales.map((sale) => (
                                                            <TableRow key={sale.id}>
                                                                <TableCell>{sale.customer}</TableCell>
                                                                <TableCell>{sale.payment_method}</TableCell>
                                                                <TableCell className="text-right">₱{sale.total}</TableCell>
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
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setIsDetailOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

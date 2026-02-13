import { Head, router, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Options', href: '/settings/profile' },
    { title: 'Manage Bank Accounts', href: '/settings/bank-accounts' },
];

type BankAccountRow = {
    id: number;
    bank_name: string;
    account_name: string;
    account_number: string;
    notes?: string | null;
    created_at?: string | null;
};

type BankTransactionRow = {
    id: number;
    bank_account_id: number | null;
    amount: string;
    type: 'in' | 'out';
    category: string;
    customer?: string | null;
    description?: string | null;
    reference_number?: number | null;
    created_at?: string | null;
};

type PageProps = {
    accounts: BankAccountRow[];
    transactions: BankTransactionRow[];
};

export default function ManageBankAccounts({ accounts, transactions }: PageProps) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<BankAccountRow | null>(
        null
    );
    const [viewingAccount, setViewingAccount] = useState<BankAccountRow | null>(
        null
    );
    const [searchQuery, setSearchQuery] = useState('');

    const createForm = useForm({
        bank_name: '',
        account_name: '',
        account_number: '',
        notes: '',
    });

    const editForm = useForm({
        bank_name: '',
        account_name: '',
        account_number: '',
        notes: '',
    });

    const filteredAccounts = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) {
            return accounts;
        }

        return accounts.filter((account) =>
            [
                account.bank_name,
                account.account_name,
                account.account_number,
                account.notes ?? '',
            ]
                .join(' ')
                .toLowerCase()
                .includes(query)
        );
    }, [accounts, searchQuery]);

    const handleCreateToggle = (open: boolean) => {
        setIsCreateOpen(open);
        if (!open) {
            createForm.reset();
            createForm.clearErrors();
        }
    };

    const handleEditToggle = (open: boolean) => {
        setIsEditOpen(open);
        if (!open) {
            setEditingAccount(null);
            editForm.reset();
            editForm.clearErrors();
        }
    };

    const openEditModal = (account: BankAccountRow) => {
        setEditingAccount(account);
        setIsEditOpen(true);
    };

    const openViewModal = (account: BankAccountRow) => {
        setViewingAccount(account);
        setIsViewOpen(true);
    };

    const handleViewToggle = (open: boolean) => {
        setIsViewOpen(open);
        if (!open) {
            setViewingAccount(null);
        }
    };

    const accountTransactions = useMemo(() => {
        if (!viewingAccount) {
            return [];
        }

        return transactions.filter(
            (transaction) => transaction.bank_account_id === viewingAccount.id
        );
    }, [transactions, viewingAccount]);

    useEffect(() => {
        if (!editingAccount) {
            return;
        }

        editForm.setData({
            bank_name: editingAccount.bank_name,
            account_name: editingAccount.account_name,
            account_number: editingAccount.account_number,
            notes: editingAccount.notes ?? '',
        });
    }, [editingAccount]);

    const handleCreateSubmit = (event: FormEvent) => {
        event.preventDefault();
        createForm.post('/settings/bank-accounts', {
            onSuccess: () => handleCreateToggle(false),
        });
    };

    const handleEditSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (!editingAccount) {
            return;
        }

        editForm.put(`/settings/bank-accounts/${editingAccount.id}`, {
            onSuccess: () => handleEditToggle(false),
        });
    };

    const handleDelete = (accountId: number) => {
        if (!confirm('Delete this bank account?')) {
            return;
        }

        router.delete(`/settings/bank-accounts/${accountId}`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Manage Bank Accounts" />
            <div className="space-y-6">
                <div className="border-t">
                    <div className="border-b px-6 py-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
                                <Input
                                    value={searchQuery}
                                    onChange={(event) =>
                                        setSearchQuery(event.target.value)
                                    }
                                    placeholder="Search bank, account, or number"
                                    className="sm:w-72"
                                />
                            </div>
                            <Button onClick={() => handleCreateToggle(true)}>
                                Add Bank Account
                            </Button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <Table className="min-w-[720px]">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Bank</TableHead>
                                    <TableHead>Account Name</TableHead>
                                    <TableHead>Account Number</TableHead>
                                    <TableHead>Notes</TableHead>
                                    <TableHead className="text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredAccounts.map((account) => (
                                    <TableRow
                                        key={account.id}
                                        className="border-b last:border-0 odd:bg-muted/10"
                                    >
                                        <TableCell className="font-medium text-foreground">
                                            {account.bank_name}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {account.account_name}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {account.account_number}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {account.notes || '—'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openViewModal(account)}
                                                    >
                                                        View
                                                    </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openEditModal(account)}
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDelete(account.id)}
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    {filteredAccounts.length === 0 && (
                        <div className="border-t px-6 py-10 text-center text-sm text-muted-foreground">
                            {searchQuery
                                ? 'No bank accounts match your search.'
                                : 'No bank accounts found. Add your first account to get started.'}
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={isCreateOpen} onOpenChange={handleCreateToggle}>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Add Bank Account</DialogTitle>
                        </DialogHeader>
                        <hr />
                        <form
                            onSubmit={handleCreateSubmit}
                            className="space-y-6"
                        >
                            <div className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="create-bank">
                                            Bank Name
                                        </Label>
                                        <Input
                                            id="create-bank"
                                            value={createForm.data.bank_name}
                                            onChange={(event) =>
                                                createForm.setData(
                                                    'bank_name',
                                                    event.target.value
                                                )
                                            }
                                            placeholder="Bank name"
                                            className={
                                                createForm.errors.bank_name
                                                    ? 'border-destructive focus-visible:ring-destructive'
                                                    : undefined
                                            }
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="create-account-name">
                                            Account Name
                                        </Label>
                                        <Input
                                            id="create-account-name"
                                            value={createForm.data.account_name}
                                            onChange={(event) =>
                                                createForm.setData(
                                                    'account_name',
                                                    event.target.value
                                                )
                                            }
                                            placeholder="Account holder"
                                            className={
                                                createForm.errors.account_name
                                                    ? 'border-destructive focus-visible:ring-destructive'
                                                    : undefined
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="create-account-number">
                                        Account Number
                                    </Label>
                                    <Input
                                        id="create-account-number"
                                        value={createForm.data.account_number}
                                        onChange={(event) =>
                                            createForm.setData(
                                                'account_number',
                                                event.target.value
                                            )
                                        }
                                        placeholder="Account number"
                                        className={
                                            createForm.errors.account_number
                                                ? 'border-destructive focus-visible:ring-destructive'
                                                : undefined
                                        }
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="create-notes">Notes</Label>
                                    <Textarea
                                        id="create-notes"
                                        value={createForm.data.notes}
                                        onChange={(event) =>
                                            createForm.setData(
                                                'notes',
                                                event.target.value
                                            )
                                        }
                                        placeholder="Optional notes"
                                        rows={3}
                                        className={
                                            createForm.errors.notes
                                                ? 'border-destructive focus-visible:ring-destructive'
                                                : undefined
                                        }
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => handleCreateToggle(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createForm.processing}
                                >
                                    Save account
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

            <Dialog open={isEditOpen} onOpenChange={handleEditToggle}>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Edit Bank Account</DialogTitle>
                        </DialogHeader>
                        <hr />
                        <form onSubmit={handleEditSubmit} className="space-y-6">
                            <div className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="edit-bank">Bank Name</Label>
                                        <Input
                                            id="edit-bank"
                                            value={editForm.data.bank_name}
                                            onChange={(event) =>
                                                editForm.setData(
                                                    'bank_name',
                                                    event.target.value
                                                )
                                            }
                                            placeholder="Bank name"
                                            className={
                                                editForm.errors.bank_name
                                                    ? 'border-destructive focus-visible:ring-destructive'
                                                    : undefined
                                            }
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="edit-account-name">
                                            Account Name
                                        </Label>
                                        <Input
                                            id="edit-account-name"
                                            value={editForm.data.account_name}
                                            onChange={(event) =>
                                                editForm.setData(
                                                    'account_name',
                                                    event.target.value
                                                )
                                            }
                                            placeholder="Account holder"
                                            className={
                                                editForm.errors.account_name
                                                    ? 'border-destructive focus-visible:ring-destructive'
                                                    : undefined
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="edit-account-number">
                                        Account Number
                                    </Label>
                                    <Input
                                        id="edit-account-number"
                                        value={editForm.data.account_number}
                                        onChange={(event) =>
                                            editForm.setData(
                                                'account_number',
                                                event.target.value
                                            )
                                        }
                                        placeholder="Account number"
                                        className={
                                            editForm.errors.account_number
                                                ? 'border-destructive focus-visible:ring-destructive'
                                                : undefined
                                        }
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="edit-notes">Notes</Label>
                                    <Textarea
                                        id="edit-notes"
                                        value={editForm.data.notes}
                                        onChange={(event) =>
                                            editForm.setData('notes', event.target.value)
                                        }
                                        placeholder="Optional notes"
                                        rows={3}
                                        className={
                                            editForm.errors.notes
                                                ? 'border-destructive focus-visible:ring-destructive'
                                                : undefined
                                        }
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => handleEditToggle(false)}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={editForm.processing}>
                                    Update account
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
            </Dialog>

                <Dialog open={isViewOpen} onOpenChange={handleViewToggle}>
                    <DialogContent className="sm:max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>
                                {viewingAccount
                                    ? `Transactions - ${viewingAccount.bank_name}`
                                    : 'Transactions'}
                            </DialogTitle>
                        </DialogHeader>
                        <hr />
                        <div className="space-y-4">
                            {viewingAccount && (
                                <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                                    <div className="font-semibold">
                                        {viewingAccount.bank_name} - {viewingAccount.account_name}
                                    </div>
                                    <div className="text-muted-foreground">
                                        Account: {viewingAccount.account_number}
                                    </div>
                                </div>
                            )}
                            <div className="overflow-x-auto">
                                <Table className="min-w-[640px]">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Details</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                            <TableHead className="text-right">Reference</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {accountTransactions.map((transaction) => (
                                            <TableRow
                                                key={transaction.id}
                                                className="border-b last:border-0 odd:bg-muted/10"
                                            >
                                                <TableCell>
                                                    {transaction.created_at ?? '—'}
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    <div>{transaction.customer ?? '—'}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {transaction.description ?? '—'}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground capitalize">
                                                    {transaction.category
                                                        ? transaction.category.replace(/_/g, ' ')
                                                        : '—'}
                                                </TableCell>
                                                <TableCell className={`text-right font-semibold ${transaction.type === 'out' ? 'text-destructive' : 'text-emerald-600'}`}>
                                                    {transaction.type === 'out' ? '−' : '+'}{' '}
                                                    ₱
                                                    {Number(transaction.amount ?? 0).toLocaleString('en-PH', {
                                                        minimumFractionDigits: 2,
                                                    })}
                                                </TableCell>
                                                <TableCell className="text-right text-muted-foreground">
                                                    {transaction.reference_number
                                                        ? `#${transaction.reference_number}`
                                                        : '—'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            {accountTransactions.length === 0 && (
                                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                                    No transactions found for this account yet.
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => handleViewToggle(false)}
                            >
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
        </AppLayout>
    );
}

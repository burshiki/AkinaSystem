import { Head, router, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { useMemo, useState, type FormEvent } from 'react';
import Pagination, { type PaginationData } from '@/components/pagination';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Income/Expense',
        href: '/income-expense',
    },
];

type BankAccount = {
    id: number;
    bank_name: string;
    account_name: string;
    account_number: string;
};

type IncomeExpenseRecord = {
    id: number;
    type: 'income' | 'expense';
    category: string;
    description: string | null;
    amount: string;
    source: 'cash_register' | 'bank';
    bank_account: string | null;
    session_id: number | null;
    user: string;
    transaction_date: string;
    created_at: string;
};

type PageProps = {
    records: PaginationData<IncomeExpenseRecord>;
    bankAccounts: BankAccount[];
    hasOpenSession: boolean;
};

export default function IncomeExpenseIndex({ records, bankAccounts, hasOpenSession }: PageProps) {
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<IncomeExpenseRecord | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredRecords = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) {
            return records.data;
        }

        return records.data.filter((record) => 
            record.category.toLowerCase().includes(query) ||
            record.description?.toLowerCase().includes(query) ||
            record.user.toLowerCase().includes(query)
        );
    }, [searchQuery, records]);

    const addForm = useForm({
        type: 'income' as 'income' | 'expense',
        category: '',
        description: '',
        amount: '',
        source: 'cash_register' as 'cash_register' | 'bank',
        bank_account_id: '',
        transaction_date: new Date().toISOString().split('T')[0],
    });

    const editForm = useForm({
        type: 'income' as 'income' | 'expense',
        category: '',
        description: '',
        amount: '',
        transaction_date: '',
    });

    const handleAddSubmit = (event: FormEvent) => {
        event.preventDefault();
        addForm.post('/income-expense', {
            onSuccess: () => {
                setIsAddOpen(false);
                addForm.reset();
            },
        });
    };

    const handleEditSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (!selectedRecord) return;

        editForm.put(`/income-expense/${selectedRecord.id}`, {
            onSuccess: () => {
                setIsEditOpen(false);
                setSelectedRecord(null);
                editForm.reset();
            },
        });
    };

    const handleEdit = (record: IncomeExpenseRecord) => {
        setSelectedRecord(record);
        editForm.setData({
            type: record.type,
            category: record.category,
            description: record.description || '',
            amount: record.amount,
            transaction_date: record.transaction_date,
        });
        setIsEditOpen(true);
    };

    const handleDelete = (record: IncomeExpenseRecord) => {
        setSelectedRecord(record);
        setIsDeleteOpen(true);
    };

    const confirmDelete = () => {
        if (!selectedRecord) return;

        router.delete(`/income-expense/${selectedRecord.id}`, {
            onSuccess: () => {
                setIsDeleteOpen(false);
                setSelectedRecord(null);
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Income/Expense" />
            <div className="space-y-6">
                <div className="border-t border-muted">
                    <div className="border-b border-muted px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Input
                                    type="text"
                                    placeholder="Search income/expense..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-[300px]"
                                />
                            </div>
                            <Button onClick={() => setIsAddOpen(true)}>
                                Add Record
                            </Button>
                        </div>
                    </div>

                    {filteredRecords.length === 0 ? (
                        <div className="border-t border-muted px-6 py-12 text-center">
                            <p className="text-sm text-muted-foreground">
                                {searchQuery ? 'No records found matching your search.' : 'No records found'}
                            </p>
                        </div>
                    ) : (
                        <>
                            <Table className="min-w-[720px]">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Source</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead>Recorded By</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredRecords.map((record) => (
                                        <TableRow key={record.id}>
                                            <TableCell>{record.transaction_date}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={record.type === 'income' ? 'default' : 'destructive'}
                                                >
                                                    {record.type === 'income' ? 'Income' : 'Expense'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-medium">{record.category}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {record.description || '—'}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {record.source === 'cash_register' ? (
                                                    <span className="text-indigo-600">Cash Register</span>
                                                ) : (
                                                    <span className="text-sky-600">{record.bank_account}</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-semibold">
                                                {record.type === 'income' ? '+' : '-'}₱{record.amount}
                                            </TableCell>
                                            <TableCell className="text-sm">{record.user}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleEdit(record)}
                                                    >
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(record)}
                                                    >
                                                        Delete
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <Pagination data={records} />
                        </>
                    )}
                </div>
            </div>

            {/* Add Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Add Income/Expense Record</DialogTitle>
                        <DialogDescription>
                            Record a new income or expense transaction
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddSubmit} className="space-y-4">
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="add-type">Type</Label>
                                <Select
                                    value={addForm.data.type}
                                    onValueChange={(value) =>
                                        addForm.setData('type', value as 'income' | 'expense')
                                    }
                                >
                                    <SelectTrigger id="add-type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="income">Income</SelectItem>
                                        <SelectItem value="expense">Expense</SelectItem>
                                    </SelectContent>
                                </Select>
                                {addForm.errors.type && (
                                    <p className="text-xs text-destructive">{addForm.errors.type}</p>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="add-category">Category</Label>
                                <Input
                                    id="add-category"
                                    value={addForm.data.category}
                                    onChange={(e) => addForm.setData('category', e.target.value)}
                                    placeholder="e.g., Utilities, Sales, etc."
                                />
                                {addForm.errors.category && (
                                    <p className="text-xs text-destructive">{addForm.errors.category}</p>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="add-amount">Amount</Label>
                                <Input
                                    id="add-amount"
                                    type="number"
                                    step="0.01"
                                    value={addForm.data.amount}
                                    onChange={(e) => addForm.setData('amount', e.target.value)}
                                    placeholder="0.00"
                                />
                                {addForm.errors.amount && (
                                    <p className="text-xs text-destructive">{addForm.errors.amount}</p>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="add-source">Source</Label>
                                <Select
                                    value={addForm.data.source}
                                    onValueChange={(value) =>
                                        addForm.setData('source', value as 'cash_register' | 'bank')
                                    }
                                >
                                    <SelectTrigger id="add-source">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cash_register">
                                            Cash Register
                                        </SelectItem>
                                        <SelectItem value="bank">Bank Account</SelectItem>
                                    </SelectContent>
                                </Select>
                                {addForm.errors.source && (
                                    <p className="text-xs text-destructive">{addForm.errors.source}</p>
                                )}
                            </div>

                            {addForm.data.source === 'bank' && (
                                <div className="grid gap-2">
                                    <Label htmlFor="add-bank">Bank Account</Label>
                                    <Select
                                        value={addForm.data.bank_account_id}
                                        onValueChange={(value) => addForm.setData('bank_account_id', value)}
                                    >
                                        <SelectTrigger id="add-bank">
                                            <SelectValue placeholder="Select bank account" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {bankAccounts.map((account) => (
                                                <SelectItem key={account.id} value={String(account.id)}>
                                                    {account.bank_name} - {account.account_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {addForm.errors.bank_account_id && (
                                        <p className="text-xs text-destructive">
                                            {addForm.errors.bank_account_id}
                                        </p>
                                    )}
                                </div>
                            )}

                            {addForm.data.source === 'cash_register' && !hasOpenSession && (
                                <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                                    No cash register session is currently open.
                                </div>
                            )}

                            <div className="grid gap-2">
                                <Label htmlFor="add-date">Transaction Date</Label>
                                <Input
                                    id="add-date"
                                    type="date"
                                    value={addForm.data.transaction_date}
                                    onChange={(e) => addForm.setData('transaction_date', e.target.value)}
                                />
                                {addForm.errors.transaction_date && (
                                    <p className="text-xs text-destructive">
                                        {addForm.errors.transaction_date}
                                    </p>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="add-description">Description (Optional)</Label>
                                <Textarea
                                    id="add-description"
                                    value={addForm.data.description}
                                    onChange={(e) => addForm.setData('description', e.target.value)}
                                    rows={3}
                                />
                                {addForm.errors.description && (
                                    <p className="text-xs text-destructive">{addForm.errors.description}</p>
                                )}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    addForm.processing ||
                                    (addForm.data.source === 'cash_register' && !hasOpenSession)
                                }
                            >
                                {addForm.processing ? 'Adding...' : 'Add Record'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit Record</DialogTitle>
                        <DialogDescription>
                            Update the income or expense record details
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEditSubmit} className="space-y-4">
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-type">Type</Label>
                                <Select
                                    value={editForm.data.type}
                                    onValueChange={(value) =>
                                        editForm.setData('type', value as 'income' | 'expense')
                                    }
                                >
                                    <SelectTrigger id="edit-type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="income">Income</SelectItem>
                                        <SelectItem value="expense">Expense</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-category">Category</Label>
                                <Input
                                    id="edit-category"
                                    value={editForm.data.category}
                                    onChange={(e) => editForm.setData('category', e.target.value)}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-amount">Amount</Label>
                                <Input
                                    id="edit-amount"
                                    type="number"
                                    step="0.01"
                                    value={editForm.data.amount}
                                    onChange={(e) => editForm.setData('amount', e.target.value)}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-date">Transaction Date</Label>
                                <Input
                                    id="edit-date"
                                    type="date"
                                    value={editForm.data.transaction_date}
                                    onChange={(e) => editForm.setData('transaction_date', e.target.value)}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-description">Description</Label>
                                <Textarea
                                    id="edit-description"
                                    value={editForm.data.description}
                                    onChange={(e) => editForm.setData('description', e.target.value)}
                                    rows={3}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsEditOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={editForm.processing}>
                                {editForm.processing ? 'Updating...' : 'Update'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Record</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this record? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setIsDeleteOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="button" variant="destructive" onClick={confirmDelete}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

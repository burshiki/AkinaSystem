import { Head, router, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
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
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import Pagination, { type PaginationData } from '@/components/pagination';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Customers', href: '/customers' },
];

type CustomerRow = {
    id: number;
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    notes?: string | null;
    debt_balance: string;
    created_at?: string | null;
};

type PageProps = {
    customers: PaginationData<CustomerRow>;
};

export default function CustomersIndex({ customers }: PageProps) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isPayDebtOpen, setIsPayDebtOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<CustomerRow | null>(
        null
    );
    const [payingDebtCustomer, setPayingDebtCustomer] = useState<CustomerRow | null>(
        null
    );
    const [searchQuery, setSearchQuery] = useState('');

    const createForm = useForm({
        name: '',
        email: '',
        phone: '',
        address: '',
        notes: '',
    });

    const editForm = useForm({
        name: '',
        email: '',
        phone: '',
        address: '',
        notes: '',
    });

    const payDebtForm = useForm({
        amount: '',
    });

    const filteredCustomers = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) {
            return customers.data;
        }

        return customers.data.filter((customer) => 
            [
                customer.name,
                customer.email ?? '',
                customer.phone ?? '',
                customer.address ?? '',
            ]
                .join(' ')
                .toLowerCase()
                .includes(query)
        );
    }, [customers, searchQuery]);

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
            setEditingCustomer(null);
            editForm.reset();
            editForm.clearErrors();
        }
    };

    const openEditModal = (customer: CustomerRow) => {
        setEditingCustomer(customer);
        setIsEditOpen(true);
    };

    useEffect(() => {
        if (!editingCustomer) {
            return;
        }

        editForm.setData({
            name: editingCustomer.name,
            email: editingCustomer.email ?? '',
            phone: editingCustomer.phone ?? '',
            address: editingCustomer.address ?? '',
            notes: editingCustomer.notes ?? '',
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editingCustomer]);

    // Auto-refresh to sync data across users
    useEffect(() => {
        const interval = setInterval(() => {
            // Only refresh if page is visible and no modals are open
            if (document.visibilityState === 'visible' && 
                !isCreateOpen && !isEditOpen && !isPayDebtOpen) {
                router.reload({ only: ['customers'] });
            }
        }, 5000); // Refresh every 5 seconds

        return () => clearInterval(interval);
    }, [isCreateOpen, isEditOpen, isPayDebtOpen]);

    const handleCreateSubmit = (event: FormEvent) => {
        event.preventDefault();
        createForm.post('/customers', {
            onSuccess: () => handleCreateToggle(false),
        });
    };

    const handleEditSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (!editingCustomer) {
            return;
        }

        editForm.put(`/customers/${editingCustomer.id}`, {
            onSuccess: () => handleEditToggle(false),
        });
    };

    const handleDelete = (customerId: number) => {
        if (!confirm('Delete this customer?')) {
            return;
        }

        router.delete(`/customers/${customerId}`);
    };

    const openPayDebtModal = (customer: CustomerRow) => {
        setPayingDebtCustomer(customer);
        setIsPayDebtOpen(true);
        payDebtForm.reset();
    };

    const handlePayDebtToggle = (open: boolean) => {
        setIsPayDebtOpen(open);
        if (!open) {
            setPayingDebtCustomer(null);
            payDebtForm.reset();
            payDebtForm.clearErrors();
        }
    };

    const handlePayDebtSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (!payingDebtCustomer) {
            return;
        }

        payDebtForm.post(`/customers/${payingDebtCustomer.id}/pay-debt`, {
            onSuccess: () => handlePayDebtToggle(false),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Customers" />
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
                                    placeholder="Search customers"
                                    className="sm:w-72"
                                />
                            </div>
                            <Button onClick={() => handleCreateToggle(true)}>
                                Add Customer
                            </Button>
                        </div>
                    </div>
                    <Table className="min-w-[900px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Address</TableHead>
                                <TableHead className="text-right">Debt Balance</TableHead>
                                <TableHead className="text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCustomers.map((customer) => (
                                <TableRow
                                    key={customer.id}
                                    className="border-b last:border-0 odd:bg-muted/10"
                                >
                                    <TableCell className="font-medium text-foreground">
                                        {customer.name}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {customer.email || '-'}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {customer.phone || '-'}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {customer.address || '-'}
                                    </TableCell>
                                    <TableCell className={`text-right font-semibold ${parseFloat(customer.debt_balance) > 0 ? 'text-rose-600' : 'text-muted-foreground'}`}>
                                        ₱{parseFloat(customer.debt_balance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {parseFloat(customer.debt_balance) > 0 && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openPayDebtModal(customer)}
                                                    className="text-emerald-600 hover:text-emerald-700"
                                                >
                                                    Pay Debt
                                                </Button>
                                            )}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    openEditModal(customer)
                                                }
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() =>
                                                    handleDelete(customer.id)
                                                }
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {filteredCustomers.length === 0 && (
                        <div className="border-t px-6 py-10 text-center text-sm text-muted-foreground">
                            {searchQuery
                                ? 'No customers match your search.'
                                : 'No customers found. Add your first customer to get started.'}
                        </div>
                    )}
                    {!searchQuery && <Pagination data={customers} />}
                </div>
            </div>

            <Dialog open={isCreateOpen} onOpenChange={handleCreateToggle}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Add Customer</DialogTitle>
                    </DialogHeader>
                    <hr />
                    <form onSubmit={handleCreateSubmit} className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="create-name">Name</Label>
                            <Input
                                id="create-name"
                                value={createForm.data.name}
                                onChange={(event) =>
                                    createForm.setData('name', event.target.value)
                                }
                                placeholder="Customer name"
                                className={
                                    createForm.errors.name
                                        ? 'border-destructive focus-visible:ring-destructive'
                                        : undefined
                                }
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="create-email">Email</Label>
                                <Input
                                    id="create-email"
                                    type="email"
                                    value={createForm.data.email}
                                    onChange={(event) =>
                                        createForm.setData('email', event.target.value)
                                    }
                                    placeholder="email@example.com"
                                    className={
                                        createForm.errors.email
                                            ? 'border-destructive focus-visible:ring-destructive'
                                            : undefined
                                    }
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="create-phone">Phone</Label>
                                <Input
                                    id="create-phone"
                                    value={createForm.data.phone}
                                    onChange={(event) =>
                                        createForm.setData('phone', event.target.value)
                                    }
                                    placeholder="Enter phone number"
                                    className={
                                        createForm.errors.phone
                                            ? 'border-destructive focus-visible:ring-destructive'
                                            : undefined
                                    }
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="create-address">Address</Label>
                            <Input
                                id="create-address"
                                value={createForm.data.address}
                                onChange={(event) =>
                                    createForm.setData('address', event.target.value)
                                }
                                placeholder="Customer address"
                                className={
                                    createForm.errors.address
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
                                    createForm.setData('notes', event.target.value)
                                }
                                placeholder="Additional notes"
                                rows={3}
                                className={
                                    createForm.errors.notes
                                        ? 'border-destructive focus-visible:ring-destructive'
                                        : undefined
                                }
                            />
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => handleCreateToggle(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createForm.processing}>
                                Save customer
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isEditOpen} onOpenChange={handleEditToggle}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Customer</DialogTitle>
                    </DialogHeader>
                    <hr />
                    <form onSubmit={handleEditSubmit} className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-name">Name</Label>
                            <Input
                                id="edit-name"
                                value={editForm.data.name}
                                onChange={(event) =>
                                    editForm.setData('name', event.target.value)
                                }
                                placeholder="Customer name"
                                className={
                                    editForm.errors.name
                                        ? 'border-destructive focus-visible:ring-destructive'
                                        : undefined
                                }
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-email">Email</Label>
                                <Input
                                    id="edit-email"
                                    type="email"
                                    value={editForm.data.email}
                                    onChange={(event) =>
                                        editForm.setData('email', event.target.value)
                                    }
                                    placeholder="email@example.com"
                                    className={
                                        editForm.errors.email
                                            ? 'border-destructive focus-visible:ring-destructive'
                                            : undefined
                                    }
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-phone">Phone</Label>
                                <Input
                                    id="edit-phone"
                                    value={editForm.data.phone}
                                    onChange={(event) =>
                                        editForm.setData('phone', event.target.value)
                                    }
                                    placeholder="Enter phone number"
                                    className={
                                        editForm.errors.phone
                                            ? 'border-destructive focus-visible:ring-destructive'
                                            : undefined
                                    }
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="edit-address">Address</Label>
                            <Input
                                id="edit-address"
                                value={editForm.data.address}
                                onChange={(event) =>
                                    editForm.setData('address', event.target.value)
                                }
                                placeholder="Customer address"
                                className={
                                    editForm.errors.address
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
                                placeholder="Additional notes"
                                rows={3}
                                className={
                                    editForm.errors.notes
                                        ? 'border-destructive focus-visible:ring-destructive'
                                        : undefined
                                }
                            />
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
                                Update customer
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isPayDebtOpen} onOpenChange={handlePayDebtToggle}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Pay Debt</DialogTitle>
                    </DialogHeader>
                    <hr />
                    <form onSubmit={handlePayDebtSubmit} className="space-y-6">
                        {payingDebtCustomer && (
                            <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                                <div>
                                    <div className="text-sm font-semibold">Customer</div>
                                    <div className="text-lg">{payingDebtCustomer.name}</div>
                                </div>
                                <div>
                                    <div className="text-sm font-semibold text-muted-foreground">Current Debt Balance</div>
                                    <div className="text-2xl font-semibold text-rose-600">
                                        ₱{parseFloat(payingDebtCustomer.debt_balance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label htmlFor="pay-amount">Payment Amount</Label>
                            <Input
                                id="pay-amount"
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={payingDebtCustomer?.debt_balance}
                                value={payDebtForm.data.amount}
                                onChange={(event) =>
                                    payDebtForm.setData('amount', event.target.value)
                                }
                                placeholder="0.00"
                                className={
                                    payDebtForm.errors.amount
                                        ? 'border-destructive focus-visible:ring-destructive'
                                        : undefined
                                }
                            />
                            {payDebtForm.data.amount && payingDebtCustomer && (
                                <div className="text-sm text-muted-foreground">
                                    Remaining balance: ₱{(parseFloat(payingDebtCustomer.debt_balance) - parseFloat(payDebtForm.data.amount || '0')).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => handlePayDebtToggle(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={payDebtForm.processing} className="bg-emerald-600 hover:bg-emerald-700">
                                Record Payment
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

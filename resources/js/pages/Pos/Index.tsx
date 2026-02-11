import { Head, router, useForm } from '@inertiajs/react';
import { Minus, Plus, Search, Trash2, X } from 'lucide-react';
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import pos from '@/routes/pos';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'POS',
        href: pos.index().url,
    },
];

type ItemRow = {
    id: number;
    name: string;
    category: string;
    category_id?: number | null;
    price: string;
    stock: number;
};

type CategoryRow = {
    id: number;
    name: string;
};

type CustomerRow = {
    id: number;
    name: string;
    email?: string | null;
    phone?: string | null;
    debt_balance: string;
};

type BankAccountRow = {
    id: number;
    bank_name: string;
    account_name: string;
    account_number: string;
};

type CartItem = {
    id: number;
    name: string;
    price: number;
    quantity: number;
    stock: number;
};

type PageProps = {
    items: ItemRow[];
    categories: CategoryRow[];
    customers: CustomerRow[];
    bankAccounts: BankAccountRow[];
};

export default function PosIndex({ items, categories, customers, bankAccounts }: PageProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [customerSearch, setCustomerSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'credit'>('cash');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCreateCustomerOpen, setIsCreateCustomerOpen] = useState(false);
    const [isCollectDebtOpen, setIsCollectDebtOpen] = useState(false);

    const paymentForm = useForm({
        customer_id: null as number | null,
        payment_method: 'cash',
        bank_account_id: '',
        amount_paid: '',
        items: [] as { item_id: number; quantity: number; price: number }[],
    });

    const createCustomerForm = useForm({
        name: '',
        email: '',
        phone: '',
        address: '',
        notes: '',
    });

    const collectDebtForm = useForm({
        customer_id: selectedCustomer?.id ?? null,
        amount: '',
    });

    const filteredCustomers = useMemo(() => {
        const query = customerSearch.trim().toLowerCase();
        if (!query) return customers;
        return customers.filter((customer) =>
            [customer.name, customer.email ?? '', customer.phone ?? '']
                .join(' ')
                .toLowerCase()
                .includes(query)
        );
    }, [customers, customerSearch]);

    const filteredProducts = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return items.filter((product) => {
            const matchesQuery = !query
                ? true
                : product.name.toLowerCase().includes(query) ||
                  product.category.toLowerCase().includes(query);
            const matchesCategory =
                selectedCategory === 'all'
                    ? true
                    : product.category === selectedCategory;
            return matchesQuery && matchesCategory;
        });
    }, [items, searchQuery, selectedCategory]);

    const cartTotal = useMemo(() => {
        return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }, [cart]);

    // Auto-refresh to sync data across users
    useEffect(() => {
        const interval = setInterval(() => {
            // Only refresh if page is visible and no modals are open
            if (
                document.visibilityState === 'visible' &&
                !isPaymentOpen &&
                !isCreateCustomerOpen &&
                !isCollectDebtOpen
            ) {
                router.reload({ only: ['items', 'categories', 'customers'] });
            }
        }, 5000); // Refresh every 5 seconds

        return () => clearInterval(interval);
    }, [isPaymentOpen, isCreateCustomerOpen, isCollectDebtOpen]);

    const addToCart = (product: ItemRow) => {
        const existingItem = cart.find((item) => item.id === product.id);
        if (existingItem) {
            if (existingItem.quantity >= existingItem.stock) return;
            setCart(
                cart.map((item) =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                )
            );
        } else {
            setCart([
                ...cart,
                {
                    id: product.id,
                    name: product.name,
                    price: parseFloat(product.price),
                    quantity: 1,
                    stock: product.stock,
                },
            ]);
        }
    };

    const updateQuantity = (itemId: number, delta: number) => {
        setCart(
            cart
                .map((item) => {
                    if (item.id === itemId) {
                        const newQuantity = item.quantity + delta;
                        if (newQuantity <= 0) return null;
                        if (newQuantity > item.stock) return item;
                        return { ...item, quantity: newQuantity };
                    }
                    return item;
                })
                .filter((item): item is CartItem => item !== null)
        );
    };

    const removeFromCart = (itemId: number) => {
        setCart(cart.filter((item) => item.id !== itemId));
    };

    const handlePayment = (method: 'cash' | 'bank' | 'credit') => {
        if (cart.length === 0) return;
        
        if (method === 'credit' && !selectedCustomer) {
            alert('Please select a customer for credit/debt payments.');
            return;
        }
        
        setPaymentMethod(method);
        if (method !== 'bank') {
            paymentForm.setData('bank_account_id', '');
        }
        setIsPaymentOpen(true);
    };

    const handlePaymentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (isSubmitting) return;

        setIsSubmitting(true);

        router.post('/pos', {
            customer_id: selectedCustomer?.id ?? null,
            payment_method: paymentMethod,
            bank_account_id: paymentMethod === 'bank'
                ? paymentForm.data.bank_account_id || null
                : null,
            amount_paid: paymentMethod === 'cash' ? paymentForm.data.amount_paid : null,
            items: cart.map((item) => ({
                item_id: item.id,
                quantity: item.quantity,
                price: item.price,
            })),
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setCart([]);
                setSelectedCustomer(null);
                setIsPaymentOpen(false);
                paymentForm.reset();
                setIsSubmitting(false);
            },
            onError: (errors) => {
                console.error('Payment error:', errors);
                setIsSubmitting(false);
            },
            onFinish: () => {
                setIsSubmitting(false);
            },
        });
    };

    const handleCreateCustomerSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const customerName = createCustomerForm.data.name;
        
        createCustomerForm.post('/customers', {
            onSuccess: () => {
                // Close dialog and reset form
                setIsCreateCustomerOpen(false);
                setCustomerSearch('');
                createCustomerForm.reset();
                
                // Reload customers and select the newly created one
                router.reload({ only: ['customers'] }, {
                    onSuccess: (props: any) => {
                        const newCustomer = props.customers?.find(
                            (c: CustomerRow) => c.name === customerName
                        );
                        if (newCustomer) {
                            setSelectedCustomer(newCustomer);
                        }
                    }
                });
            },
        });
    };

    const handleCollectDebtSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomer) return;

        router.post('/pos/collect-debt', {
            customer_id: selectedCustomer.id,
            amount: collectDebtForm.data.amount,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setIsCollectDebtOpen(false);
                collectDebtForm.reset();
                router.reload({ only: ['customers'] });
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="POS" />
            <div className="grid gap-6 p-6 lg:grid-cols-[1fr_420px]">
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={searchQuery}
                                onChange={(event) =>
                                    setSearchQuery(event.target.value)
                                }
                                placeholder="Search hardware..."
                                className="h-11 pl-10"
                            />
                        </div>
                        <div className="w-full lg:w-64">
                            <Select
                                value={selectedCategory}
                                onValueChange={setSelectedCategory}
                            >
                                <SelectTrigger className="h-11">
                                    <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {categories.map((category) => (
                                        <SelectItem
                                            key={category.id}
                                            value={category.name}
                                        >
                                            {category.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                        {filteredProducts.map((product) => (
                            <button
                                key={product.id}
                                onClick={() => addToCart(product)}
                                className="group overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                            >
                                <div className="relative h-36 overflow-hidden bg-gradient-to-br from-indigo-50 to-purple-50">
                                    <div className="flex h-full items-center justify-center text-4xl font-bold text-indigo-200">
                                        {product.name.charAt(0)}
                                    </div>
                                </div>
                                <div className="space-y-3 p-5">
                                    <div className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
                                        {product.category}
                                    </div>
                                    <div className="line-clamp-2 text-sm font-semibold">
                                        {product.name}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="text-base font-semibold text-indigo-600">
                                            ₱{parseFloat(product.price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Stock: {product.stock}
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="rounded-3xl border bg-white p-8 shadow-sm">
                        <div className="space-y-5">
                            <div className="relative">
                                <div className="text-xs font-semibold uppercase text-muted-foreground">
                                    Customer
                                </div>
                                {selectedCustomer ? (
                                    <div className="mt-3 flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
                                        <div className="flex-1">
                                            <div className="text-sm font-semibold">{selectedCustomer.name}</div>
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                <span>{selectedCustomer.phone}</span>
                                                {parseFloat(selectedCustomer.debt_balance) > 0 && (
                                                    <span className="font-semibold text-rose-600">
                                                        Debt: ₱{parseFloat(selectedCustomer.debt_balance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSelectedCustomer(null)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="relative">
                                            <Input
                                                placeholder="Search customer..."
                                                className="mt-3 h-11"
                                                value={customerSearch}
                                                onChange={(e) => setCustomerSearch(e.target.value)}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute right-2 top-1/2 -translate-y-1/2"
                                                onClick={() => setIsCreateCustomerOpen(true)}
                                                title="Add new customer"
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        {customerSearch && filteredCustomers.length > 0 && (
                                            <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-white shadow-lg">
                                                {filteredCustomers.map((customer) => (
                                                    <button
                                                        key={customer.id}
                                                        onClick={() => {
                                                            setSelectedCustomer(customer);
                                                            setCustomerSearch('');
                                                        }}
                                                        className="w-full px-4 py-2 text-left text-sm hover:bg-muted"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <div className="font-semibold">{customer.name}</div>
                                                                <div className="text-xs text-muted-foreground">{customer.phone}</div>
                                                            </div>
                                                            {parseFloat(customer.debt_balance) > 0 && (
                                                                <div className="text-xs font-semibold text-rose-600">
                                                                    ₱{parseFloat(customer.debt_balance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            <div className="flex items-center justify-between border-t pt-5">
                                <div className="text-sm font-semibold">
                                    Order Items
                                </div>
                                <div className="rounded-full bg-muted px-3.5 py-1.5 text-xs font-semibold text-muted-foreground">
                                    {cart.length}
                                </div>
                            </div>

                            <div className="max-h-[300px] space-y-3 overflow-y-auto">
                                {cart.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                                        Add items from the left panel to start an order.
                                    </div>
                                ) : (
                                    cart.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex items-center justify-between rounded-lg border bg-muted/30 p-4"
                                        >
                                            <div className="flex-1">
                                                <div className="text-sm font-semibold">
                                                    {item.name}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    ₱{item.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })} × {item.quantity}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1 rounded-lg border bg-white">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 w-7 p-0"
                                                        onClick={() => updateQuantity(item.id, -1)}
                                                    >
                                                        <Minus className="h-3 w-3" />
                                                    </Button>
                                                    <span className="w-8 text-center text-xs font-semibold">
                                                        {item.quantity}
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 w-7 p-0"
                                                        onClick={() => updateQuantity(item.id, 1)}
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0 text-destructive"
                                                    onClick={() => removeFromCart(item.id)}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="space-y-5 border-t pt-5">
                                <div className="flex items-center justify-between">
                                    <div className="text-lg font-semibold">
                                        Total
                                    </div>
                                    <div className="text-2xl font-semibold text-indigo-600">
                                        ₱{cartTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                                <Button
                                    className="h-12 w-full rounded-full bg-emerald-400 text-base font-semibold text-white hover:bg-emerald-500"
                                    onClick={() => handlePayment('cash')}
                                    disabled={cart.length === 0}
                                >
                                    Pay Cash (₱)
                                </Button>
                                <div className="grid grid-cols-2 gap-4">
                                    <Button
                                        variant="outline"
                                        className="h-12 rounded-full"
                                        onClick={() => handlePayment('bank')}
                                        disabled={cart.length === 0}
                                    >
                                        Online Bank
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="h-12 rounded-full text-rose-500"
                                        onClick={() => handlePayment('credit')}
                                        disabled={cart.length === 0}
                                    >
                                        Debt / Credit
                                    </Button>
                                </div>
                                <Button
                                    variant="outline"
                                    className="h-11 w-full rounded-full text-emerald-600"
                                    onClick={() => setIsCollectDebtOpen(true)}
                                    disabled={!selectedCustomer || parseFloat(selectedCustomer.debt_balance) === 0}
                                >
                                    Collect Debt Payment
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Complete Payment</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handlePaymentSubmit} className="space-y-5">
                        <div className="space-y-2.5">
                            <Label>Customer</Label>
                            <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm font-medium">
                                {selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}
                            </div>
                        </div>
                        <div className="space-y-2.5">
                            <Label>Payment Method</Label>
                            <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm font-semibold capitalize">
                                {paymentMethod === 'cash' ? 'Cash' : paymentMethod === 'bank' ? 'Online Bank' : 'Debt / Credit'}
                            </div>
                        </div>
                        <div className="space-y-2.5">
                            <Label>Total Amount</Label>
                            <div className="rounded-lg border bg-muted/30 px-4 py-3 text-lg font-semibold text-indigo-600">
                                ₱{cartTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                        {paymentMethod === 'bank' && (
                            <div className="space-y-2.5">
                                <Label>Bank Account</Label>
                                <Select
                                    value={paymentForm.data.bank_account_id}
                                    onValueChange={(value) =>
                                        paymentForm.setData('bank_account_id', value)
                                    }
                                >
                                    <SelectTrigger className={
                                        paymentForm.errors.bank_account_id
                                            ? 'h-11 border-destructive focus-visible:ring-destructive'
                                            : 'h-11'
                                    }>
                                        <SelectValue placeholder="Select a bank account" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {bankAccounts.map((account) => (
                                            <SelectItem
                                                key={account.id}
                                                value={String(account.id)}
                                            >
                                                {account.bank_name} - {account.account_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {paymentForm.errors.bank_account_id && (
                                    <p className="text-xs text-destructive">
                                        {paymentForm.errors.bank_account_id}
                                    </p>
                                )}
                                {bankAccounts.length === 0 && (
                                    <p className="text-xs text-muted-foreground">
                                        No bank accounts found. Add one in Settings.
                                    </p>
                                )}
                            </div>
                        )}
                        {paymentMethod === 'cash' && (
                            <div className="space-y-2.5">
                                <Label htmlFor="amount-paid">Amount Paid</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="amount-paid"
                                        type="number"
                                        step="0.01"
                                        min={cartTotal}
                                        value={paymentForm.data.amount_paid}
                                        onChange={(e) => paymentForm.setData('amount_paid', e.target.value)}
                                        placeholder="0.00"
                                        className={
                                            paymentForm.errors.amount_paid
                                                ? 'h-11 border-destructive focus-visible:ring-destructive'
                                                : 'h-11'
                                        }
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => paymentForm.setData('amount_paid', cartTotal.toString())}
                                        className="h-11 whitespace-nowrap"
                                    >
                                        Exact Amount
                                    </Button>
                                </div>
                                {paymentForm.data.amount_paid && parseFloat(paymentForm.data.amount_paid) >= cartTotal && (
                                    <div className="text-sm text-muted-foreground">
                                        Change: ₱{(parseFloat(paymentForm.data.amount_paid) - cartTotal).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                    </div>
                                )}
                            </div>
                        )}
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsPaymentOpen(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    isSubmitting ||
                                    (paymentMethod === 'bank' && !paymentForm.data.bank_account_id)
                                }
                            >
                                {isSubmitting ? 'Processing...' : 'Complete Sale'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isCreateCustomerOpen} onOpenChange={setIsCreateCustomerOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add New Customer</DialogTitle>
                    </DialogHeader>
                    <hr />
                    <form onSubmit={handleCreateCustomerSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="create-name">Name</Label>
                            <Input
                                id="create-name"
                                value={createCustomerForm.data.name}
                                onChange={(e) =>
                                    createCustomerForm.setData('name', e.target.value)
                                }
                                placeholder="Customer name"
                                className={
                                    createCustomerForm.errors.name
                                        ? 'border-destructive focus-visible:ring-destructive'
                                        : undefined
                                }
                            />
                            {createCustomerForm.errors.name && (
                                <p className="text-xs text-destructive">
                                    {createCustomerForm.errors.name}
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="create-email">Email</Label>
                                <Input
                                    id="create-email"
                                    type="email"
                                    value={createCustomerForm.data.email}
                                    onChange={(e) =>
                                        createCustomerForm.setData('email', e.target.value)
                                    }
                                    placeholder="email@example.com"
                                    className={
                                        createCustomerForm.errors.email
                                            ? 'border-destructive focus-visible:ring-destructive'
                                            : undefined
                                    }
                                />
                                {createCustomerForm.errors.email && (
                                    <p className="text-xs text-destructive">
                                        {createCustomerForm.errors.email}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="create-phone">Phone</Label>
                                <Input
                                    id="create-phone"
                                    value={createCustomerForm.data.phone}
                                    onChange={(e) =>
                                        createCustomerForm.setData('phone', e.target.value)
                                    }
                                    placeholder="Phone number"
                                    className={
                                        createCustomerForm.errors.phone
                                            ? 'border-destructive focus-visible:ring-destructive'
                                            : undefined
                                    }
                                />
                                {createCustomerForm.errors.phone && (
                                    <p className="text-xs text-destructive">
                                        {createCustomerForm.errors.phone}
                                    </p>
                                )}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                    setIsCreateCustomerOpen(false);
                                    createCustomerForm.reset();
                                }}
                                disabled={createCustomerForm.processing}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={createCustomerForm.processing}
                            >
                                {createCustomerForm.processing ? 'Creating...' : 'Create Customer'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isCollectDebtOpen} onOpenChange={setIsCollectDebtOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Collect Debt Payment</DialogTitle>
                    </DialogHeader>
                    <hr />
                    <form onSubmit={handleCollectDebtSubmit} className="space-y-5">
                        {selectedCustomer && (
                            <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                                <div>
                                    <div className="text-sm font-semibold">
                                        Customer
                                    </div>
                                    <div className="text-lg font-semibold">
                                        {selectedCustomer.name}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-sm font-semibold text-muted-foreground">
                                        Outstanding Debt
                                    </div>
                                    <div className="text-2xl font-semibold text-rose-600">
                                        ₱
                                        {parseFloat(selectedCustomer.debt_balance).toLocaleString(
                                            'en-PH',
                                            { minimumFractionDigits: 2 }
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="debt-amount">Payment Amount</Label>
                            <Input
                                id="debt-amount"
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={
                                    selectedCustomer
                                        ? parseFloat(selectedCustomer.debt_balance)
                                        : 0
                                }
                                value={collectDebtForm.data.amount}
                                onChange={(e) =>
                                    collectDebtForm.setData('amount', e.target.value)
                                }
                                placeholder="0.00"
                                className={
                                    collectDebtForm.errors.amount
                                        ? 'border-destructive focus-visible:ring-destructive'
                                        : undefined
                                }
                            />
                            {collectDebtForm.errors.amount && (
                                <p className="text-xs text-destructive">
                                    {collectDebtForm.errors.amount}
                                </p>
                            )}
                            {collectDebtForm.data.amount &&
                                selectedCustomer &&
                                parseFloat(collectDebtForm.data.amount) > 0 && (
                                    <div className="text-sm text-muted-foreground">
                                        Remaining balance: ₱
                                        {(
                                            parseFloat(selectedCustomer.debt_balance) -
                                            parseFloat(collectDebtForm.data.amount)
                                        ).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                    </div>
                                )}
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                    setIsCollectDebtOpen(false);
                                    collectDebtForm.reset();
                                }}
                                disabled={collectDebtForm.processing}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={collectDebtForm.processing}
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                {collectDebtForm.processing
                                    ? 'Processing...'
                                    : 'Record Payment'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

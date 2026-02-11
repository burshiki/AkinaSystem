import { Head } from '@inertiajs/react';
import { useEffect } from 'react';

type ReceiptItem = {
    name: string;
    quantity: number;
    price: string;
    subtotal: string;
};

type ReceiptSale = {
    id: number;
    created_at?: string | null;
    payment_method: string;
    subtotal: string;
    total: string;
    amount_paid: string;
    change_given: string;
    customer: string;
    cashier: string;
    bank_account?: string | null;
};

type PageProps = {
    company: string;
    sale: ReceiptSale;
    items: ReceiptItem[];
};

export default function Receipt({ company, sale, items }: PageProps) {
    useEffect(() => {
        const timer = setTimeout(() => window.print(), 200);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="min-h-screen bg-white p-6 text-sm">
            <Head title={`Receipt #${sale.id}`} />
            <div className="mx-auto w-full max-w-sm">
                <div className="border-b border-dashed pb-4 text-center">
                    <div className="text-lg font-bold">{company}</div>
                    <div className="text-xs text-muted-foreground">
                        Receipt #{sale.id}
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {sale.created_at ?? ''}
                    </div>
                </div>

                <div className="space-y-2 border-b border-dashed py-4 text-xs">
                    <div className="flex justify-between">
                        <span>Customer</span>
                        <span>{sale.customer}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Cashier</span>
                        <span>{sale.cashier}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Payment</span>
                        <span className="capitalize">{sale.payment_method}</span>
                    </div>
                    {sale.payment_method === 'bank' && sale.bank_account && (
                        <div className="flex justify-between">
                            <span>Bank</span>
                            <span>{sale.bank_account}</span>
                        </div>
                    )}
                </div>

                <div className="space-y-2 py-4">
                    {items.map((item, index) => (
                        <div key={`${item.name}-${index}`} className="text-xs">
                            <div className="flex justify-between">
                                <span className="font-medium">{item.name}</span>
                                <span>
                                    ₱{parseFloat(item.subtotal).toLocaleString('en-PH', {
                                        minimumFractionDigits: 2,
                                    })}
                                </span>
                            </div>
                            <div className="flex justify-between text-[11px] text-muted-foreground">
                                <span>
                                    {item.quantity} x ₱
                                    {parseFloat(item.price).toLocaleString('en-PH', {
                                        minimumFractionDigits: 2,
                                    })}
                                </span>
                                <span></span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="space-y-2 border-t border-dashed pt-4 text-xs">
                    <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>
                            ₱{parseFloat(sale.subtotal).toLocaleString('en-PH', {
                                minimumFractionDigits: 2,
                            })}
                        </span>
                    </div>
                    <div className="flex justify-between font-semibold">
                        <span>Total</span>
                        <span>
                            ₱{parseFloat(sale.total).toLocaleString('en-PH', {
                                minimumFractionDigits: 2,
                            })}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span>Amount Paid</span>
                        <span>
                            ₱{parseFloat(sale.amount_paid).toLocaleString('en-PH', {
                                minimumFractionDigits: 2,
                            })}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span>Change</span>
                        <span>
                            ₱{parseFloat(sale.change_given).toLocaleString('en-PH', {
                                minimumFractionDigits: 2,
                            })}
                        </span>
                    </div>
                </div>

                <div className="border-t border-dashed pt-4 text-center text-[11px] text-muted-foreground">
                    Thank you for your purchase.
                </div>
            </div>
        </div>
    );
}

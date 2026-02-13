<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;
use App\Models\BankAccount;
use App\Models\CashRegisterSession;
use App\Models\Customer;
use App\Models\Item;
use App\Models\ItemCategory;
use App\Models\ItemLog;
use App\Models\MoneyTransaction;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Warranty;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PosController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $openSession = CashRegisterSession::query()
            ->where('status', 'open')
            ->where('opened_by', $request->user()->id)
            ->exists();

        if (!$openSession) {
            return redirect()->route('cash-register.index')->with('error', 'You do not have an open register session. Please open the register first.');
        }

        $items = Item::query()
            ->with('category')
            ->where('stock', '>', 0)
            ->orderBy('name')
            ->get()
            ->map(fn (Item $item) => [
                'id' => $item->id,
                'name' => $item->name,
                'category' => $item->category?->name ?? 'Uncategorized',
                'category_id' => $item->category_id,
                'price' => $item->price,
                'stock' => $item->stock,
                'has_warranty' => $item->has_warranty,
                'warranty_months' => $item->warranty_months,
            ]);

        $categories = ItemCategory::query()
            ->orderBy('name')
            ->get()
            ->map(fn (ItemCategory $category) => [
                'id' => $category->id,
                'name' => $category->name,
            ]);

        $customers = Customer::query()
            ->orderBy('name')
            ->get()
            ->map(fn (Customer $customer) => [
                'id' => $customer->id,
                'name' => $customer->name,
                'email' => $customer->email,
                'phone' => $customer->phone,
                'debt_balance' => $customer->debt_balance,
            ]);

        $bankAccounts = BankAccount::query()
            ->orderBy('bank_name')
            ->orderBy('account_name')
            ->get()
            ->map(fn (BankAccount $account) => [
                'id' => $account->id,
                'bank_name' => $account->bank_name,
                'account_name' => $account->account_name,
                'account_number' => $account->account_number,
            ]);

        return Inertia::render('Pos/Index', [
            'items' => $items,
            'categories' => $categories,
            'customers' => $customers,
            'bankAccounts' => $bankAccounts,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => ['nullable', 'exists:customers,id'],
            'payment_method' => ['required', 'in:cash,bank,credit'],
            'bank_account_id' => ['required_if:payment_method,bank', 'nullable', 'exists:bank_accounts,id'],
            'amount_paid' => ['required_if:payment_method,cash', 'nullable', 'numeric', 'min:0'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.item_id' => ['required', 'exists:items,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.price' => ['required', 'numeric', 'min:0'],
            'items.*.serial_numbers' => ['nullable', 'array'],
            'items.*.serial_numbers.*' => ['nullable', 'string', 'max:255'],
        ]);

        // Require customer for credit payments
        if ($validated['payment_method'] === 'credit' && !$validated['customer_id']) {
            return back()->withErrors(['customer_id' => 'A customer must be selected for credit/debt payments.']);
        }

        $openSession = CashRegisterSession::query()
            ->where('status', 'open')
            ->where('opened_by', $request->user()->id)
            ->latest('opened_at')
            ->first();

        if (!$openSession) {
            return back()->withErrors(['error' => 'No open cash register session']);
        }

        $subtotal = collect($validated['items'])->sum(fn ($item) => $item['price'] * $item['quantity']);
        $total = $subtotal;

        $amountPaid = $validated['payment_method'] === 'cash'
            ? (float) $validated['amount_paid']
            : $total;

        $changeGiven = $validated['payment_method'] === 'cash'
            ? max(0, $amountPaid - $total)
            : 0;

        $sale = DB::transaction(function () use ($validated, $request, $openSession, $subtotal, $total, $amountPaid, $changeGiven) {
            $sale = Sale::create([
                'customer_id' => $validated['customer_id'],
                'user_id' => $request->user()->id,
                'cash_register_session_id' => $openSession->id,
                'bank_account_id' => $validated['payment_method'] === 'bank'
                    ? $validated['bank_account_id']
                    : null,
                'payment_method' => $validated['payment_method'],
                'subtotal' => $subtotal,
                'total' => $total,
                'amount_paid' => $amountPaid,
                'change_given' => $changeGiven,
                'status' => 'completed',
            ]);

            foreach ($validated['items'] as $itemData) {
                $item = Item::findOrFail($itemData['item_id']);
                $quantity = $itemData['quantity'];
                $price = $itemData['price'];
                $itemSubtotal = $price * $quantity;
                $serialNumbers = collect($itemData['serial_numbers'] ?? [])
                    ->map(fn (mixed $serial) => trim((string) $serial))
                    ->values();

                if ($item->has_warranty) {
                    $filledSerials = $serialNumbers
                        ->filter(fn (string $serial) => $serial !== '')
                        ->values();

                    if ($filledSerials->isNotEmpty()) {
                        $normalizedSerials = $filledSerials
                            ->map(fn (string $serial) => mb_strtolower($serial));

                        if ($normalizedSerials->unique()->count() !== $normalizedSerials->count()) {
                            throw ValidationException::withMessages([
                                'items' => "{$item->name} has duplicate serial number entries.",
                            ]);
                        }

                        // Check for serial numbers already registered in warranties for this item
                        $existingSerials = Warranty::query()
                            ->where('item_id', $item->id)
                            ->whereIn('serial_number', $filledSerials->all())
                            ->pluck('serial_number');

                        if ($existingSerials->isNotEmpty()) {
                            throw ValidationException::withMessages([
                                'items' => "{$item->name}: serial number(s) " . $existingSerials->implode(', ') . " already registered under an existing warranty.",
                            ]);
                        }
                    }
                }

                $saleItem = SaleItem::create([
                    'sale_id' => $sale->id,
                    'item_id' => $item->id,
                    'quantity' => $quantity,
                    'price' => $price,
                    'subtotal' => $itemSubtotal,
                ]);

                $oldStock = $item->stock;
                $newStock = $oldStock - $quantity;
                $item->update(['stock' => $newStock]);

                ItemLog::logStockChange(
                    itemId: $item->id,
                    type: 'sale',
                    quantityChange: -$quantity,
                    oldStock: $oldStock,
                    newStock: $newStock,
                    description: "Sold via POS (Sale #{$sale->id})",
                    userId: $request->user()->id,
                    referenceType: Sale::class,
                    referenceId: $sale->id
                );

                if ($item->has_warranty && $item->warranty_months && $item->warranty_months > 0) {
                    $soldAt = $sale->created_at ?? now();

                    $serialEntries = $serialNumbers->count() === $quantity
                        ? $serialNumbers
                        : $serialNumbers->pad($quantity, '');

                    foreach (range(0, $quantity - 1) as $index) {
                        $serialNumber = $serialEntries->get($index);
                        $serialValue = $serialNumber === '' ? null : $serialNumber;

                        Warranty::create([
                            'sale_id' => $sale->id,
                            'sale_item_id' => $saleItem->id,
                            'item_id' => $item->id,
                            'customer_id' => $validated['customer_id'] ?? null,
                            'serial_number' => $serialValue,
                            'warranty_months' => (int) $item->warranty_months,
                            'sold_at' => $soldAt,
                            'expires_at' => $soldAt->copy()->addMonthsNoOverflow((int) $item->warranty_months),
                        ]);
                    }
                }
            }

            if ($validated['payment_method'] === 'cash') {
                $openSession->increment('cash_sales', $total);
                
                // Log cash transaction
                MoneyTransaction::logCashIn(
                    amount: (float) $total,
                    sessionId: $openSession->id,
                    category: 'sale',
                    userId: $request->user()->id,
                    description: "Sale #{$sale->id}",
                    reference: $sale
                );
            } elseif ($validated['payment_method'] === 'credit' && $validated['customer_id']) {
                // Increment customer's debt balance
                Customer::where('id', $validated['customer_id'])->increment('debt_balance', $total);
            } elseif ($validated['payment_method'] === 'bank' && $validated['bank_account_id']) {
                // Log bank transaction
                MoneyTransaction::logBankIn(
                    amount: (float) $total,
                    bankAccountId: $validated['bank_account_id'],
                    category: 'sale',
                    userId: $request->user()->id,
                    description: "Sale #{$sale->id}",
                    reference: $sale,
                    cashRegisterSessionId: $openSession->id
                );
            }

            return $sale;
        });

        return redirect()->route('pos.index')->with('last_sale_id', $sale->id);
    }

    /**
     * Show a printable receipt for a sale.
     */
    public function receipt(Sale $sale): Response
    {
        $sale->load(['items.item', 'customer', 'bankAccount', 'user']);

        $items = $sale->items->map(fn (SaleItem $item) => [
            'name' => $item->item?->name ?? 'Item',
            'quantity' => $item->quantity,
            'price' => $item->price,
            'subtotal' => $item->subtotal,
        ]);

        return Inertia::render('Pos/Receipt', [
            'company' => config('app.name'),
            'sale' => [
                'id' => $sale->id,
                'created_at' => $sale->created_at?->format('M d, Y h:i A'),
                'payment_method' => $sale->payment_method,
                'subtotal' => $sale->subtotal,
                'total' => $sale->total,
                'amount_paid' => $sale->amount_paid,
                'change_given' => $sale->change_given,
                'customer' => $sale->customer?->name ?? 'Walk-in Customer',
                'cashier' => $sale->user?->name ?? 'Staff',
                'bank_account' => $sale->bankAccount
                    ? sprintf('%s - %s', $sale->bankAccount->bank_name, $sale->bankAccount->account_name)
                    : null,
            ],
            'items' => $items,
        ]);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }

    /**
     * Collect debt payment from customer
     */
    public function collectDebt(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => ['required', 'exists:customers,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'payment_method' => ['required', 'in:cash,bank'],
            'bank_account_id' => ['required_if:payment_method,bank', 'nullable', 'exists:bank_accounts,id'],
        ]);

        $customer = Customer::findOrFail($validated['customer_id']);

        // Ensure payment amount doesn't exceed debt balance
        if ($validated['amount'] > $customer->debt_balance) {
            return back()->withErrors([
                'amount' => "Payment amount cannot exceed debt balance of ₱{$customer->debt_balance}",
            ]);
        }

        $openSession = CashRegisterSession::query()
            ->where('status', 'open')
            ->where('opened_by', $request->user()->id)
            ->latest('opened_at')
            ->first();

        if (!$openSession) {
            return back()->withErrors(['error' => 'No open cash register session']);
        }

        DB::transaction(function () use ($customer, $validated, $openSession, $request) {
            $customer->decrement('debt_balance', $validated['amount']);
            $openSession->increment('debt_repaid', $validated['amount']);
            
            // Log debt payment transaction - use appropriate source type
            if ($validated['payment_method'] === 'bank') {
                // Bank debt payment - log to bank account and tag session
                MoneyTransaction::logBankIn(
                    amount: (float) $validated['amount'],
                    bankAccountId: (int) $validated['bank_account_id'],
                    category: 'debt_payment',
                    userId: $request->user()->id,
                    description: "Debt payment from {$customer->name} via bank transfer",
                    reference: $customer,
                    cashRegisterSessionId: $openSession->id
                );
            } else {
                // Count cash debt payments toward session cash totals
                $openSession->increment('cash_sales', $validated['amount']);
                // Cash debt payment - log to cash register
                MoneyTransaction::logCashIn(
                    amount: (float) $validated['amount'],
                    sessionId: $openSession->id,
                    category: 'debt_payment',
                    userId: $request->user()->id,
                    description: "Debt payment from {$customer->name} via cash",
                    reference: $customer
                );
            }
        });

        return redirect()->route('pos.index')->with('success', "Debt payment of ₱{$validated['amount']} recorded for {$customer->name}");
    }
}

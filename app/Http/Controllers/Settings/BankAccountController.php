<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\BankAccount;
use App\Models\Customer;
use App\Models\MoneyTransaction;
use App\Models\Sale;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BankAccountController extends Controller
{
    public function index(): Response
    {
        $accounts = BankAccount::query()
            ->orderBy('bank_name')
            ->orderBy('account_name')
            ->get()
            ->map(fn (BankAccount $account) => [
                'id' => $account->id,
                'bank_name' => $account->bank_name,
                'account_name' => $account->account_name,
                'account_number' => $account->account_number,
                'notes' => $account->notes,
                'created_at' => $account->created_at?->format('M d, Y'),
            ]);

        $transactions = MoneyTransaction::query()
            ->where('source_type', 'bank_account')
            ->orderByDesc('created_at')
            ->with(['reference' => fn (MorphTo $morphTo) => $morphTo->morphWith([
                Sale::class => ['customer'],
                Customer::class => [],
            ])])
            ->get()
            ->map(function (MoneyTransaction $transaction) {
                $customerName = null;
                $referenceNumber = null;

                if ($transaction->reference instanceof Sale) {
                    $customerName = $transaction->reference->customer?->name ?? 'Walk-in Customer';
                    $referenceNumber = $transaction->reference->id;
                } elseif ($transaction->reference instanceof Customer) {
                    $customerName = $transaction->reference->name;
                }

                return [
                    'id' => $transaction->id,
                    'bank_account_id' => $transaction->source_id,
                    'customer' => $customerName,
                    'description' => $transaction->description,
                    'category' => $transaction->category,
                    'type' => $transaction->type,
                    'amount' => (string) $transaction->amount,
                    'reference_number' => $referenceNumber,
                    'created_at' => $transaction->created_at?->format('M d, Y h:i A'),
                ];
            });

        return Inertia::render('Options/bank-accounts', [
            'accounts' => $accounts,
            'transactions' => $transactions,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'bank_name' => ['required', 'string', 'max:255'],
            'account_name' => ['required', 'string', 'max:255'],
            'account_number' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        BankAccount::create($validated);

        return redirect()->route('settings.bank-accounts.index');
    }

    public function update(Request $request, BankAccount $bankAccount): RedirectResponse
    {
        $validated = $request->validate([
            'bank_name' => ['required', 'string', 'max:255'],
            'account_name' => ['required', 'string', 'max:255'],
            'account_number' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $bankAccount->update($validated);

        return redirect()->route('settings.bank-accounts.index');
    }

    public function destroy(BankAccount $bankAccount): RedirectResponse
    {
        $bankAccount->delete();

        return redirect()->route('settings.bank-accounts.index');
    }
}

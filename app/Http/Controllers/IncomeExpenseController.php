<?php

namespace App\Http\Controllers;

use App\Models\BankAccount;
use App\Models\CashRegisterSession;
use App\Models\IncomeExpense;
use App\Models\MoneyTransaction;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class IncomeExpenseController extends Controller
{
    public function index(): Response
    {
        $records = IncomeExpense::query()
            ->with(['user:id,name', 'bankAccount:id,bank_name,account_name', 'cashRegisterSession'])
            ->orderBy('transaction_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate(15)
            ->through(fn ($record) => [
                'id' => $record->id,
                'type' => $record->type,
                'category' => $record->category,
                'description' => $record->description,
                'amount' => number_format($record->amount, 2),
                'source' => $record->source,
                'bank_account' => $record->bankAccount 
                    ? sprintf('%s - %s', $record->bankAccount->bank_name, $record->bankAccount->account_name)
                    : null,
                'session_id' => $record->cash_register_session_id,
                'user' => $record->user?->name ?? 'Unknown',
                'transaction_date' => $record->transaction_date?->format('M d, Y'),
                'created_at' => $record->created_at?->format('M d, Y H:i'),
            ]);

        $bankAccounts = BankAccount::query()
            ->orderBy('bank_name')
            ->orderBy('account_name')
            ->get()
            ->map(fn ($account) => [
                'id' => $account->id,
                'bank_name' => $account->bank_name,
                'account_name' => $account->account_name,
                'account_number' => $account->account_number,
            ]);

        $openSession = CashRegisterSession::query()
            ->where('status', 'open')
            ->first();

        return Inertia::render('IncomeExpense/Index', [
            'records' => $records,
            'bankAccounts' => $bankAccounts,
            'hasOpenSession' => $openSession !== null,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'type' => ['required', 'in:income,expense'],
            'category' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'source' => ['required', 'in:cash_register,bank'],
            'bank_account_id' => ['required_if:source,bank', 'nullable', 'exists:bank_accounts,id'],
            'transaction_date' => ['required', 'date'],
        ]);

        if ($validated['source'] === 'cash_register') {
            $openSession = CashRegisterSession::query()
                ->where('status', 'open')
                ->first();

            if (!$openSession) {
                return back()->withErrors(['source' => 'No open cash register session found.']);
            }

            $validated['cash_register_session_id'] = $openSession->id;
        }

        DB::transaction(function () use ($validated, $request) {
            $record = IncomeExpense::create([
                ...$validated,
                'user_id' => $request->user()->id,
            ]);

            // Log transaction in MoneyTransaction table
            if ($validated['source'] === 'cash_register') {
                $method = $validated['type'] === 'income' ? 'logCashIn' : 'logCashOut';
                MoneyTransaction::$method(
                    amount: (float) $validated['amount'],
                    sessionId: $validated['cash_register_session_id'],
                    category: $validated['category'],
                    userId: $request->user()->id,
                    description: $validated['description'] ?? $validated['category'],
                    reference: $record
                );
            } else {
                $method = $validated['type'] === 'income' ? 'logBankIn' : 'logBankOut';
                MoneyTransaction::$method(
                    amount: (float) $validated['amount'],
                    bankAccountId: $validated['bank_account_id'],
                    category: $validated['category'],
                    userId: $request->user()->id,
                    description: $validated['description'] ?? $validated['category'],
                    reference: $record
                );
            }
        });

        return back()->with('success', 'Record added successfully.');
    }

    public function update(Request $request, IncomeExpense $incomeExpense): RedirectResponse
    {
        $validated = $request->validate([
            'type' => ['required', 'in:income,expense'],
            'category' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'transaction_date' => ['required', 'date'],
        ]);

        $incomeExpense->update($validated);

        return back()->with('success', 'Record updated successfully.');
    }

    public function destroy(IncomeExpense $incomeExpense): RedirectResponse
    {
        $incomeExpense->delete();

        return back()->with('success', 'Record deleted successfully.');
    }
}

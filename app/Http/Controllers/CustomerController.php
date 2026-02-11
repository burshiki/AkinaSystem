<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    public function index(): Response
    {
        $customers = Customer::query()
            ->orderBy('name')
            ->get()
            ->map(fn (Customer $customer) => [
                'id' => $customer->id,
                'name' => $customer->name,
                'email' => $customer->email,
                'phone' => $customer->phone,
                'address' => $customer->address,
                'notes' => $customer->notes,
                'debt_balance' => $customer->debt_balance,
                'created_at' => $customer->created_at?->format('M d, Y'),
            ]);

        return Inertia::render('Customers/Index', [
            'customers' => $customers,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        Customer::create($validated);

        return redirect()->route('customers.index');
    }

    public function update(Request $request, Customer $customer): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $customer->update($validated);

        return redirect()->route('customers.index');
    }

    public function destroy(Customer $customer): RedirectResponse
    {
        $customer->delete();

        return redirect()->route('customers.index');
    }

    public function payDebt(Request $request, Customer $customer): RedirectResponse
    {
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01', 'max:' . $customer->debt_balance],
        ]);

        $customer->decrement('debt_balance', $validated['amount']);

        // Optionally track this in cash register session
        $openSession = \App\Models\CashRegisterSession::query()
            ->where('status', 'open')
            ->where('opened_by', $request->user()->id)
            ->first();

        if ($openSession) {
            $openSession->increment('debt_repaid', $validated['amount']);
        }

        return redirect()->route('customers.index');
    }
}

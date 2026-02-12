<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Income & Expense Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
        h1 { margin: 0 0 8px 0; }
        .muted { color: #6b7280; font-size: 13px; margin-bottom: 16px; }
        .summary { display: flex; gap: 16px; margin: 16px 0; }
        .card { border: 1px solid #d1d5db; border-radius: 6px; padding: 10px 12px; min-width: 180px; }
        .label { font-size: 12px; color: #6b7280; margin-bottom: 4px; }
        .value { font-weight: 700; font-size: 18px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 13px; text-align: left; }
        th { background: #f3f4f6; }
        .right { text-align: right; }
        .income { color: #047857; font-weight: 600; }
        .expense { color: #b91c1c; font-weight: 600; }
        @media print {
            body { margin: 8px; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="no-print" style="margin-bottom: 12px;">
        <button onclick="window.print()">Print</button>
    </div>

    <h1>Income & Expense Report</h1>
    <div class="muted">
        @if($startDate || $endDate)
            Date Range:
            {{ $startDate ? \Illuminate\Support\Carbon::parse($startDate)->format('M d, Y') : 'Beginning' }}
            -
            {{ $endDate ? \Illuminate\Support\Carbon::parse($endDate)->format('M d, Y') : 'Present' }}
        @else
            Date Range: All records
        @endif
    </div>

    <div class="summary">
        <div class="card">
            <div class="label">Total Income</div>
            <div class="value income">₱{{ number_format($totalIncome, 2) }}</div>
        </div>
        <div class="card">
            <div class="label">Total Expense</div>
            <div class="value expense">₱{{ number_format($totalExpense, 2) }}</div>
        </div>
        <div class="card">
            <div class="label">Net Total</div>
            <div class="value">₱{{ number_format($netTotal, 2) }}</div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Category</th>
                <th>Description</th>
                <th>Source</th>
                <th>Recorded By</th>
                <th class="right">Amount</th>
            </tr>
        </thead>
        <tbody>
            @forelse($records as $record)
                <tr>
                    <td>{{ optional($record->transaction_date)->format('M d, Y') }}</td>
                    <td>{{ ucfirst($record->type) }}</td>
                    <td>{{ $record->category }}</td>
                    <td>{{ $record->description ?: '—' }}</td>
                    <td>
                        @if($record->source === 'cash_register')
                            Cash Register
                        @else
                            {{ optional($record->bankAccount)->bank_name }} - {{ optional($record->bankAccount)->account_name }}
                        @endif
                    </td>
                    <td>{{ optional($record->user)->name ?: 'Unknown' }}</td>
                    <td class="right {{ $record->type === 'income' ? 'income' : 'expense' }}">
                        {{ $record->type === 'income' ? '+' : '-' }}₱{{ number_format((float) $record->amount, 2) }}
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="7" style="text-align:center;">No records found for the selected date range.</td>
                </tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>

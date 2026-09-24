<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Entry;
use Carbon\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function balanceSheet(): Response
    {
        $reportDate = Carbon::today()->toDateString();
        $accounts = Account::query()->whereIn('type', ['Asset', 'Liability', 'Equity'])->orderBy('type')->orderBy('name')->get();

        $balances = [];

        foreach ($accounts as $account) {
            $total = Entry::query()
                ->where('account_id', $account->id)
                ->whereHas('transaction', fn ($query) => $query->whereDate('date', '<=', $reportDate))
                ->sum('amount');

            $balances[$account->id] = (float) $total;
        }

        $assets = collect($balances)->filter(fn ($value, $id) => $accounts->firstWhere('id', $id)?->type === 'Asset')->sum();
        $liabilities = collect($balances)->filter(fn ($value, $id) => $accounts->firstWhere('id', $id)?->type === 'Liability')->sum();
        $equity = collect($balances)->filter(fn ($value, $id) => $accounts->firstWhere('id', $id)?->type === 'Equity')->sum();

        return Inertia::render('reports/balance-sheet', [
            'reportDate' => $reportDate,
            'accounts' => $accounts->map(fn (Account $account) => [
                'id' => $account->id,
                'name' => $account->name,
                'type' => $account->type,
                'balance' => (float) ($balances[$account->id] ?? 0),
            ])->all(),
            'totals' => [
                'assets' => (float) $assets,
                'liabilities' => (float) $liabilities,
                'equity' => (float) $equity,
            ],
        ]);
    }

    public function cashFlow(): Response
    {
        $start = Carbon::today()->subDays(30)->toDateString();
        $end = Carbon::today()->toDateString();

        $cashEntries = Entry::query()
            ->with('account', 'transaction')
            ->whereHas('account', fn ($query) => $query->where('type', 'Asset'))
            ->whereHas('transaction', fn ($query) => $query->whereBetween('date', [$start, $end]))
            ->get();

        $cashIn = $cashEntries->filter(fn (Entry $entry) => $entry->amount > 0)->sum('amount');
        $cashOut = $cashEntries->filter(fn (Entry $entry) => $entry->amount < 0)->sum(fn (Entry $entry) => abs($entry->amount));

        return Inertia::render('reports/cash-flow', [
            'startDate' => $start,
            'endDate' => $end,
            'totals' => [
                'cashIn' => (float) $cashIn,
                'cashOut' => (float) $cashOut,
                'netCashFlow' => (float) ($cashIn - $cashOut),
            ],
            'entries' => $cashEntries->map(fn (Entry $entry) => [
                'id' => $entry->id,
                'date' => $entry->transaction?->date?->format('Y-m-d'),
                'description' => $entry->transaction?->description,
                'account' => $entry->account?->name,
                'amount' => (float) $entry->amount,
            ])->all(),
        ]);
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Entry;
use App\Models\Transaction;
use App\Rules\BalancedTransaction;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class LedgerController extends Controller
{
    public function index(Request $request): Response
    {
        $accounts = Account::query()
            ->orderBy('type')
            ->orderBy('name')
            ->get(['id', 'name', 'type', 'parent_id']);

        $selectedAccountId = $request->integer('account');
        $selectedAccountId = $accounts->contains('id', $selectedAccountId) ? $selectedAccountId : null;

        $ledgerRows = $selectedAccountId === null
            ? collect()
            : Transaction::query()
                ->whereHas('entries', fn ($query) => $query->where('account_id', $selectedAccountId))
                ->with('entries.account:id,name')
                ->orderByDesc('date')
                ->orderByDesc('id')
                ->limit(10)
                ->get()
                ->reverse()
                ->values();

        $page = max(1, $request->integer('page', 1));
        $transactions = Transaction::query()
            ->with('entries.account')
            ->latest('date')
            ->simplePaginate(20, ['*'], 'page', $page);

        return Inertia::render('ledger/index', [
            'selectedAccountId' => $selectedAccountId,
            'ledgerRows' => $ledgerRows->map(function (Transaction $transaction) use ($selectedAccountId) {
                $currentEntry = $transaction->entries->firstWhere('account_id', $selectedAccountId);
                $counterpartEntry = $transaction->entries->first(fn (Entry $entry) => $entry->account_id !== $selectedAccountId);

                return [
                    'id' => $transaction->id,
                    'date' => $transaction->date->format('Y-m-d'),
                    'description' => $transaction->description,
                    'amount' => (float) $currentEntry->amount,
                    'memo' => $currentEntry->memo,
                    'counterpartAccountId' => $counterpartEntry?->account_id,
                    'counterpartSearch' => $counterpartEntry?->account?->name ?? '',
                    'entries' => $transaction->entries->map(fn (Entry $entry) => [
                        'account_id' => $entry->account_id,
                        'amount' => (float) $entry->amount,
                        'memo' => $entry->memo,
                    ])->all(),
                ];
            })->all(),
            'accounts' => $accounts->map(fn (Account $account) => [
                'id' => $account->id,
                'name' => $account->name,
                'type' => $account->type,
                'parent_id' => $account->parent_id,
            ])->all(),
            'recentTransactions' => collect($transactions->items())->map(fn (Transaction $transaction) => [
                'id' => $transaction->id,
                'date' => $transaction->date->format('Y-m-d'),
                'description' => $transaction->description,
                'entries' => $transaction->entries->map(fn (Entry $entry) => [
                    'id' => $entry->id,
                    'account' => $entry->account?->name,
                    'amount' => (float) $entry->amount,
                ])->all(),
            ])->all(),
            'currentPage' => $transactions->currentPage(),
            'hasMoreTransactions' => $transactions->hasMorePages(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'date' => ['required', 'date'],
            'description' => ['required', 'string', 'max:255'],
            'entries' => ['required', 'array', 'min:2', new BalancedTransaction],
            'entries.*.account_id' => ['required', 'exists:accounts,id'],
            'entries.*.amount' => ['required', 'numeric'],
            'entries.*.memo' => ['nullable', 'string', 'max:255'],
        ]);

        DB::transaction(function () use ($validated): void {
            $transaction = Transaction::query()->create([
                'date' => $validated['date'],
                'description' => $validated['description'],
            ]);

            foreach ($validated['entries'] as $entryData) {
                $transaction->entries()->create([
                    'account_id' => $entryData['account_id'],
                    'amount' => $entryData['amount'],
                    'memo' => $entryData['memo'] ?? null,
                ]);
            }
        });

        return Redirect::route('ledger.index', [
            'account' => $validated['entries'][0]['account_id'],
        ]);
    }

    public function update(Request $request, Transaction $transaction): RedirectResponse
    {
        $validated = $request->validate([
            'current_account_id' => ['required', 'integer', 'exists:accounts,id'],
            'date' => ['required', 'date'],
            'description' => ['required', 'string', 'max:255'],
            'entries' => ['required', 'array', 'min:2', new BalancedTransaction],
            'entries.*.account_id' => ['required', 'exists:accounts,id'],
            'entries.*.amount' => ['required', 'numeric'],
            'entries.*.memo' => ['nullable', 'string', 'max:255'],
        ]);

        abort_unless(
            $transaction->entries()->where('account_id', $validated['current_account_id'])->exists(),
            404,
        );

        DB::transaction(function () use ($transaction, $validated): void {
            $transaction->update([
                'date' => $validated['date'],
                'description' => $validated['description'],
            ]);
            $transaction->entries()->delete();

            foreach ($validated['entries'] as $entryData) {
                $transaction->entries()->create([
                    'account_id' => $entryData['account_id'],
                    'amount' => $entryData['amount'],
                    'memo' => $entryData['memo'] ?? null,
                ]);
            }
        });

        return Redirect::route('ledger.index', [
            'account' => $validated['current_account_id'],
        ]);
    }

    public function destroy(Request $request, Transaction $transaction): RedirectResponse
    {
        DB::transaction(function () use ($transaction): void {
            foreach ($transaction->entries as $entry) {
                $entry->delete();
            }

            $transaction->delete();
        });

        $accountId = $request->integer('account');

        return Redirect::route('ledger.index', $accountId > 0 ? ['account' => $accountId] : []);
    }
}

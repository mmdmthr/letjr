<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Entry;
use App\Models\Transaction;
use App\Rules\BalancedTransaction;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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

        $page = max(1, $request->integer('page', 1));
        $transactions = Transaction::query()
            ->with('entries.account')
            ->latest('date')
            ->simplePaginate(20, ['*'], 'page', $page);

        return Inertia::render('ledger/index', [
            'selectedAccountId' => $selectedAccountId,
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

        return Redirect::route('ledger.index');
    }

    public function destroy(Transaction $transaction): RedirectResponse
    {
        foreach ($transaction->entries as $entry) {
            $entry->delete();
        }

        $transaction->delete();

        return Redirect::route('ledger.index');
    }
}

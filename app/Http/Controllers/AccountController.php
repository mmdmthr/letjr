<?php

namespace App\Http\Controllers;

use App\Enums\AccountType;
use App\Models\Account;
use App\Models\Entry;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class AccountController extends Controller
{
    public function index(): Response
    {
        $allAccounts = Account::query()
            ->orderBy('name')
            ->get()
            ->all();

        $accounts = collect($allAccounts)->groupBy('parent_id');
        $accountBalances = Entry::query()
            ->whereIn('account_id', collect($allAccounts)->pluck('id'))
            ->whereHas('transaction', fn ($query) => $query->whereDate('date', '<=', Carbon::today()))
            ->selectRaw('account_id, SUM(amount) as balance')
            ->groupBy('account_id')
            ->pluck('balance', 'account_id')
            ->map(fn (mixed $balance): float => (float) $balance);

        $rootDefinitions = [
            ['name' => 'Assets', 'type' => AccountType::ASSET->value],
            ['name' => 'Liabilities', 'type' => AccountType::LIABILITY->value],
            ['name' => 'Equity', 'type' => AccountType::EQUITY->value],
            ['name' => 'Income', 'type' => AccountType::REVENUE->value],
            ['name' => 'Expenses', 'type' => AccountType::EXPENSE->value],
        ];

        $serializeAccount = function (Account $account) use (&$serializeAccount, $accounts, $accountBalances): array {
            $children = $accounts
                ->get($account->id, collect())
                ->sortBy('name')
                ->map($serializeAccount)
                ->values()
                ->all();

            return [
                'id' => $account->id,
                'name' => $account->name,
                'type' => $account->type,
                'parent_id' => $account->parent_id,
                'balance' => (float) ($accountBalances->get($account->id, 0) + collect($children)->sum('balance')),
                'children' => $children,
            ];
        };

        $rootAccounts = collect($rootDefinitions)->map(function (array $root) use ($accounts, $allAccounts, $accountBalances, $serializeAccount): array {
            $rootAccount = collect($allAccounts)->first(fn (Account $account) => $account->parent_id === null
                && $account->name === $root['name']
                && $account->type === $root['type']
            );

            $children = $accounts
                ->get($rootAccount?->id, collect())
                ->merge($accounts->get(null, collect())->filter(fn (Account $account) => $account->type === $root['type']
                    && $account->id !== $rootAccount?->id
                ))
                ->sortBy('name')
                ->map($serializeAccount)
                ->values()
                ->all();

            return [
                'id' => $rootAccount?->id,
                'name' => $root['name'],
                'type' => $root['type'],
                'parent_id' => null,
                'balance' => (float) (($rootAccount instanceof Account ? $accountBalances->get($rootAccount->id, 0) : 0) + collect($children)->sum('balance')),
                'children' => $children,
            ];
        })->all();

        return Inertia::render('accounts/index', [
            'accounts' => $rootAccounts,
            'accountTypes' => array_map(fn (AccountType $type) => $type->value, AccountType::cases()),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', 'in:'.implode(',', array_map(fn (AccountType $type) => $type->value, AccountType::cases()))],
            'parent_id' => ['nullable', 'exists:accounts,id'],
        ]);

        Account::query()->create($validated);

        return Redirect::route('accounts.index');
    }
}

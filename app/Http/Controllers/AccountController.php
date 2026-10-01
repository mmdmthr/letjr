<?php

namespace App\Http\Controllers;

use App\Enums\AccountType;
use App\Models\Account;
use App\Models\Entry;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AccountController extends Controller
{
    public function index(): Response
    {
        $accounts = Account::query()
            ->orderBy('name')
            ->get();

        $accountsByParent = $accounts->groupBy('parent_id');

        $accountBalances = Entry::query()
            ->whereIn('account_id', $accounts->pluck('id'))
            ->whereHas(
                'transaction',
                fn ($query) => $query->whereDate('date', '<=', Carbon::today())
            )
            ->selectRaw('account_id, SUM(amount) as balance')
            ->groupBy('account_id')
            ->pluck('balance', 'account_id')
            ->map(fn (mixed $balance): float => (float) $balance);

        $serializeAccount = function (Account $account) use (
            &$serializeAccount,
            $accountsByParent,
            $accountBalances
        ): array {
            $children = $accountsByParent
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
                'balance' => (float) (
                    $accountBalances->get($account->id, 0)
                    + collect($children)->sum('balance')
                ),
                'children' => $children,
            ];
        };

        $rootAccounts = $accountsByParent
            ->get(null, collect())
            ->sortBy('name')
            ->map($serializeAccount)
            ->values()
            ->all();

        return Inertia::render('accounts/index', [
            'accounts' => $rootAccounts,
            'accountTypes' => array_map(
                fn (AccountType $type) => [
                    'value' => $type->value,
                    'label' => ucfirst($type->value),
                ],
                AccountType::cases()
            ),
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

    public function update(Request $request, Account $account): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', 'in:'.implode(',', array_map(fn (AccountType $type) => $type->value, AccountType::cases()))],
            'parent_id' => ['nullable', 'exists:accounts,id', Rule::notIn([$account->id])],
        ]);

        $account->update($validated);

        return Redirect::route('accounts.index');
    }

    public function destroy(Account $account): RedirectResponse
    {
        if ($account->children()->exists()) {
            return Redirect::route('accounts.index')
                ->withErrors(['account' => 'Accounts with child accounts cannot be deleted.']);
        }

        $account->delete();

        return Redirect::route('accounts.index');
    }
}

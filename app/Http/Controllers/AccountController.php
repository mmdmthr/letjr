<?php

namespace App\Http\Controllers;

use App\Enums\AccountType;
use App\Models\Account;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class AccountController extends Controller
{
    public function index(): Response
    {
        $accounts = Account::query()
            ->with('children')
            ->orderBy('type')
            ->orderBy('name')
            ->get();

        return Inertia::render('accounts/index', [
            'accounts' => $accounts->map(fn (Account $account) => [
                'id' => $account->id,
                'name' => $account->name,
                'type' => $account->type,
                'parent_id' => $account->parent_id,
                'children' => $account->children->map(fn (Account $child) => [
                    'id' => $child->id,
                    'name' => $child->name,
                    'type' => $child->type,
                    'parent_id' => $child->parent_id,
                ])->all(),
            ])->all(),
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

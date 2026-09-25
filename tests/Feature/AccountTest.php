<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Entry;
use App\Models\Transaction;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountTest extends TestCase
{
    use RefreshDatabase;

    public function test_accounts_are_returned_as_an_ordered_tree(): void
    {
        $user = User::factory()->create();
        $asset = Account::query()->create(['name' => 'Assets', 'type' => 'Asset']);
        $wallet = Account::query()->create([
            'name' => 'Wallet',
            'type' => 'Cash',
            'parent_id' => $asset->id,
        ]);
        $dining = Account::query()->create(['name' => 'Dining', 'type' => 'Expense']);
        $liabilities = Account::query()->create(['name' => 'Liabilities', 'type' => 'Liability']);
        $equity = Account::query()->create(['name' => 'Equity', 'type' => 'Equity']);
        Account::query()->create(['name' => 'Income', 'type' => 'Revenue']);
        Account::query()->create(['name' => 'Expenses', 'type' => 'Expense']);

        $transaction = Transaction::query()->create([
            'date' => Carbon::today(),
            'description' => 'Opening balances',
        ]);
        Entry::query()->create(['transaction_id' => $transaction->id, 'account_id' => $wallet->id, 'amount' => 100]);
        Entry::query()->create(['transaction_id' => $transaction->id, 'account_id' => $dining->id, 'amount' => 25]);
        Entry::query()->create(['transaction_id' => $transaction->id, 'account_id' => $equity->id, 'amount' => -125]);

        $response = $this->actingAs($user)->get(route('accounts.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('accounts/index')
            ->where('accounts.0.name', 'Assets')
            ->where('accounts.0.balance', 100)
            ->where('accounts.0.children.0.name', 'Wallet')
            ->where('accounts.0.children.0.balance', 100)
            ->where('accounts.1.name', 'Liabilities')
            ->where('accounts.2.name', 'Equity')
            ->where('accounts.2.balance', -125)
            ->where('accounts.3.name', 'Income')
            ->where('accounts.4.name', 'Expenses')
            ->where('accounts.4.balance', 25)
            ->has('accounts', 5));
    }
}

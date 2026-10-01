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
        Account::query()->create(['name' => 'Income', 'type' => 'Income']);
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

    public function test_account_can_be_updated(): void
    {
        $user = User::factory()->create();
        $parent = Account::query()->create(['name' => 'Assets', 'type' => 'asset']);
        $account = Account::query()->create(['name' => 'Cash', 'type' => 'asset']);

        $response = $this->actingAs($user)->patch(route('accounts.update', $account), [
            'name' => 'Wallet',
            'type' => 'asset',
            'parent_id' => $parent->id,
        ]);

        $response->assertRedirect(route('accounts.index'));
        $this->assertDatabaseHas('accounts', [
            'id' => $account->id,
            'name' => 'Wallet',
            'parent_id' => $parent->id,
        ]);
    }

    public function test_account_cannot_be_its_own_parent(): void
    {
        $user = User::factory()->create();
        $account = Account::query()->create(['name' => 'Cash', 'type' => 'asset']);

        $response = $this->actingAs($user)->patch(route('accounts.update', $account), [
            'name' => 'Cash',
            'type' => 'asset',
            'parent_id' => (string) $account->id,
        ]);

        $response->assertSessionHasErrors('parent_id');
        $this->assertDatabaseHas('accounts', [
            'id' => $account->id,
            'parent_id' => null,
        ]);
    }

    public function test_account_can_be_deleted(): void
    {
        $user = User::factory()->create();
        $account = Account::query()->create(['name' => 'Cash', 'type' => 'asset']);

        $response = $this->actingAs($user)->delete(route('accounts.destroy', $account));

        $response->assertRedirect(route('accounts.index'));
        $this->assertDatabaseMissing('accounts', ['id' => $account->id]);
    }

    public function test_account_with_children_cannot_be_deleted(): void
    {
        $user = User::factory()->create();
        $parent = Account::query()->create(['name' => 'Assets', 'type' => 'asset']);
        Account::query()->create([
            'name' => 'Cash',
            'type' => 'asset',
            'parent_id' => $parent->id,
        ]);

        $response = $this->actingAs($user)->delete(route('accounts.destroy', $parent));

        $response->assertSessionHasErrors('account');
        $this->assertDatabaseHas('accounts', ['id' => $parent->id]);
    }
}

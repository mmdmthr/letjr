<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Transaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithoutMiddleware;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class LedgerStoreTest extends TestCase
{
    use RefreshDatabase;
    use WithoutMiddleware;

    public function test_ledger_can_be_opened_with_a_selected_account(): void
    {
        $account = Account::query()->create([
            'name' => 'Cash',
            'type' => 'asset',
        ]);

        $this->get(route('ledger.index', ['account' => $account->id]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ledger/index')
                ->where('selectedAccountId', $account->id),
            );
    }

    public function test_transaction_can_be_created_via_ledger_endpoint(): void
    {
        $cash = Account::query()->create([
            'name' => 'Cash',
            'type' => 'asset',
        ]);

        $income = Account::query()->create([
            'name' => 'Income',
            'type' => 'income',
        ]);

        $response = $this->post(route('ledger.store'), [
            'date' => '2026-09-24',
            'description' => 'Service invoice',
            'entries' => [
                ['account_id' => $cash->id, 'amount' => 1250, 'memo' => 'received cash'],
                ['account_id' => $income->id, 'amount' => -1250, 'memo' => 'income earned'],
            ],
        ]);

        $response->assertRedirect(route('ledger.index'));
        $this->assertDatabaseHas(Transaction::class, [
            'description' => 'Service invoice',
        ]);

        $this->assertDatabaseHas('entries', [
            'account_id' => $cash->id,
            'amount' => '1250.00',
        ]);
    }

    public function test_ledger_indexes_latest_transactions_with_cursor_metadata(): void
    {
        $cash = Account::query()->create(['name' => 'Cash', 'type' => 'asset']);
        $income = Account::query()->create(['name' => 'Income', 'type' => 'income']);

        for ($i = 0; $i < 25; $i++) {
            $transaction = Transaction::query()->create([
                'date' => now()->subDays($i)->toDateString(),
                'description' => "Transaction {$i}",
            ]);

            $transaction->entries()->create(['account_id' => $cash->id, 'amount' => 10, 'memo' => 'debit']);
            $transaction->entries()->create(['account_id' => $income->id, 'amount' => -10, 'memo' => 'credit']);
        }

        $this->get(route('ledger.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ledger/index')
                ->where('currentPage', 1)
                ->where('hasMoreTransactions', true)
            );
    }

    public function test_transaction_can_be_deleted_via_ledger_endpoint(): void
    {
        $cash = Account::query()->create(['name' => 'Cash', 'type' => 'asset']);
        $income = Account::query()->create(['name' => 'Income', 'type' => 'income']);
        $transaction = Transaction::query()->create([
            'date' => '2026-09-24',
            'description' => 'Delete me',
        ]);
        $transaction->entries()->create(['account_id' => $cash->id, 'amount' => 100, 'memo' => 'debit']);
        $transaction->entries()->create(['account_id' => $income->id, 'amount' => -100, 'memo' => 'credit']);

        app(\App\Http\Controllers\LedgerController::class)->destroy($transaction);

        $this->assertDatabaseMissing(Transaction::class, ['id' => $transaction->id]);
    }
}

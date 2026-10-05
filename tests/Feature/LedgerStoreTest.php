<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Transaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class LedgerStoreTest extends TestCase
{
    use RefreshDatabase;

    public function test_ledger_can_be_opened_with_a_selected_account(): void
    {
        $account = Account::query()->create([
            'name' => 'Cash',
            'type' => 'asset',
        ]);

        $this->get(route('ledger.index', ['account' => $account->id]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('ledger/index')
                ->where('selectedAccountId', $account->id)
                ->has('ledgerRows', 0),
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

        $response->assertRedirect(route('ledger.index', ['account' => $cash->id]));
        $this->assertDatabaseHas(Transaction::class, [
            'description' => 'Service invoice',
        ]);

        $this->assertDatabaseHas('entries', [
            'account_id' => $cash->id,
            'amount' => '1250.00',
        ]);

        $transaction = Transaction::query()->where('description', 'Service invoice')->firstOrFail();

        $this->get(route('ledger.index', ['account' => $cash->id]))
            ->assertInertia(fn (Assert $page) => $page
                ->has('ledgerRows', 1)
                ->where('ledgerRows.0.id', $transaction->id)
                ->where('ledgerRows.0.amount', 1250)
                ->where('ledgerRows.0.counterpartSearch', 'Income'),
            );
    }

    public function test_unbalanced_transaction_creation_is_rejected_without_persisting_a_record(): void
    {
        $cash = Account::query()->create(['name' => 'Cash', 'type' => 'asset']);
        $income = Account::query()->create(['name' => 'Income', 'type' => 'income']);

        $this->from(route('ledger.index'))->post(route('ledger.store'), [
            'date' => '2026-09-24',
            'description' => 'Unbalanced transaction',
            'entries' => [
                ['account_id' => $cash->id, 'amount' => 1250, 'memo' => null],
                ['account_id' => $income->id, 'amount' => -1000, 'memo' => null],
            ],
        ])->assertSessionHasErrors('entries');

        $this->assertDatabaseMissing(Transaction::class, [
            'description' => 'Unbalanced transaction',
        ]);
    }

    public function test_ledger_rows_show_the_latest_ten_for_the_selected_account_in_chronological_order(): void
    {
        $cash = Account::query()->create(['name' => 'Cash', 'type' => 'asset']);
        $income = Account::query()->create(['name' => 'Income', 'type' => 'income']);
        $travel = Account::query()->create(['name' => 'Travel', 'type' => 'expense']);
        $transactions = [];

        for ($i = 0; $i < 12; $i++) {
            $transaction = Transaction::query()->create([
                'date' => now()->subDays($i)->toDateString(),
                'description' => "Transaction {$i}",
            ]);
            $transaction->entries()->create(['account_id' => $cash->id, 'amount' => 10, 'memo' => "cash {$i}"]);
            $transaction->entries()->create(['account_id' => $income->id, 'amount' => -10, 'memo' => "income {$i}"]);
            $transactions[] = $transaction;
        }

        $unrelated = Transaction::query()->create([
            'date' => now()->toDateString(),
            'description' => 'Travel transaction',
        ]);
        $unrelated->entries()->create(['account_id' => $travel->id, 'amount' => 25, 'memo' => 'travel']);
        $unrelated->entries()->create(['account_id' => $income->id, 'amount' => -25, 'memo' => 'reimbursement']);

        $this->get(route('ledger.index', ['account' => $cash->id]))
            ->assertInertia(fn (Assert $page) => $page
                ->has('ledgerRows', 10)
                ->where('ledgerRows.0.id', $transactions[9]->id)
                ->where('ledgerRows.0.amount', 10)
                ->where('ledgerRows.9.id', $transactions[0]->id)
                ->where('ledgerRows.9.counterpartAccountId', $income->id),
            );

        $this->get(route('ledger.index', ['account' => $travel->id]))
            ->assertInertia(fn (Assert $page) => $page
                ->has('ledgerRows', 1)
                ->where('ledgerRows.0.id', $unrelated->id),
            );
    }

    public function test_creating_an_eleventh_newest_transaction_keeps_the_latest_ten_rows(): void
    {
        $cash = Account::query()->create(['name' => 'Cash', 'type' => 'asset']);
        $income = Account::query()->create(['name' => 'Income', 'type' => 'income']);
        $transactions = [];

        for ($i = 0; $i < 10; $i++) {
            $transaction = Transaction::query()->create([
                'date' => now()->subDays($i + 1)->toDateString(),
                'description' => "Transaction {$i}",
            ]);
            $transaction->entries()->create(['account_id' => $cash->id, 'amount' => 10, 'memo' => null]);
            $transaction->entries()->create(['account_id' => $income->id, 'amount' => -10, 'memo' => null]);
            $transactions[] = $transaction;
        }

        $this->post(route('ledger.store'), [
            'date' => now()->toDateString(),
            'description' => 'Newest transaction',
            'entries' => [
                ['account_id' => $cash->id, 'amount' => 25, 'memo' => null],
                ['account_id' => $income->id, 'amount' => -25, 'memo' => null],
            ],
        ])->assertRedirect(route('ledger.index', ['account' => $cash->id]));

        $newestTransaction = Transaction::query()
            ->where('description', 'Newest transaction')
            ->firstOrFail();

        $this->get(route('ledger.index', ['account' => $cash->id]))
            ->assertInertia(fn (Assert $page) => $page
                ->has('ledgerRows', 10)
                ->where('ledgerRows.0.id', $transactions[8]->id)
                ->where('ledgerRows.9.id', $newestTransaction->id),
            );
    }

    public function test_deleting_an_oldest_displayed_record_refills_the_latest_ten(): void
    {
        $cash = Account::query()->create(['name' => 'Cash', 'type' => 'asset']);
        $income = Account::query()->create(['name' => 'Income', 'type' => 'income']);
        $transactions = [];

        for ($i = 0; $i < 11; $i++) {
            $transaction = Transaction::query()->create([
                'date' => now()->subDays($i)->toDateString(),
                'description' => "Transaction {$i}",
            ]);
            $transaction->entries()->create(['account_id' => $cash->id, 'amount' => 10, 'memo' => null]);
            $transaction->entries()->create(['account_id' => $income->id, 'amount' => -10, 'memo' => null]);
            $transactions[] = $transaction;
        }

        $this->delete(route('ledger.destroy', [
            'transaction' => $transactions[9]->id,
            'account' => $cash->id,
        ]))
            ->assertRedirect(route('ledger.index', ['account' => $cash->id]));

        $this->get(route('ledger.index', ['account' => $cash->id]))
            ->assertInertia(fn (Assert $page) => $page
                ->has('ledgerRows', 10)
                ->where('ledgerRows.0.id', $transactions[10]->id)
                ->where('ledgerRows.9.id', $transactions[0]->id),
            );
    }

    public function test_deleting_the_newest_record_refills_the_latest_ten(): void
    {
        $cash = Account::query()->create(['name' => 'Cash', 'type' => 'asset']);
        $income = Account::query()->create(['name' => 'Income', 'type' => 'income']);
        $transactions = [];

        for ($i = 0; $i < 11; $i++) {
            $transaction = Transaction::query()->create([
                'date' => now()->subDays($i)->toDateString(),
                'description' => "Transaction {$i}",
            ]);
            $transaction->entries()->create(['account_id' => $cash->id, 'amount' => 10, 'memo' => null]);
            $transaction->entries()->create(['account_id' => $income->id, 'amount' => -10, 'memo' => null]);
            $transactions[] = $transaction;
        }

        $this->delete(route('ledger.destroy', [
            'transaction' => $transactions[0]->id,
            'account' => $cash->id,
        ]))->assertRedirect(route('ledger.index', ['account' => $cash->id]));

        $this->get(route('ledger.index', ['account' => $cash->id]))
            ->assertInertia(fn (Assert $page) => $page
                ->has('ledgerRows', 10)
                ->where('ledgerRows.0.id', $transactions[10]->id)
                ->where('ledgerRows.9.id', $transactions[1]->id),
            );
    }

    public function test_transaction_can_be_updated_without_losing_other_balanced_entries(): void
    {
        $cash = Account::query()->create(['name' => 'Cash', 'type' => 'asset']);
        $income = Account::query()->create(['name' => 'Income', 'type' => 'income']);
        $equity = Account::query()->create(['name' => 'Equity', 'type' => 'equity']);
        $transaction = Transaction::query()->create([
            'date' => '2026-09-24',
            'description' => 'Original transaction',
        ]);
        $transaction->entries()->create(['account_id' => $cash->id, 'amount' => 100, 'memo' => 'old']);
        $transaction->entries()->create(['account_id' => $income->id, 'amount' => -90, 'memo' => 'old']);
        $transaction->entries()->create(['account_id' => $equity->id, 'amount' => -10, 'memo' => 'unchanged']);

        $this->patch(route('ledger.update', $transaction), [
            'current_account_id' => $cash->id,
            'date' => '2026-09-25',
            'description' => 'Updated transaction',
            'entries' => [
                ['account_id' => $cash->id, 'amount' => 120, 'memo' => 'updated'],
                ['account_id' => $income->id, 'amount' => -110, 'memo' => 'updated'],
                ['account_id' => $equity->id, 'amount' => -10, 'memo' => 'unchanged'],
            ],
        ])
            ->assertRedirect(route('ledger.index', ['account' => $cash->id]));

        $this->assertDatabaseHas(Transaction::class, [
            'id' => $transaction->id,
            'date' => '2026-09-25 00:00:00',
            'description' => 'Updated transaction',
        ]);
        $this->assertDatabaseHas('entries', [
            'transaction_id' => $transaction->id,
            'account_id' => $equity->id,
            'amount' => '-10.00',
            'memo' => 'unchanged',
        ]);
        $this->assertDatabaseHas('entries', [
            'transaction_id' => $transaction->id,
            'account_id' => $cash->id,
            'amount' => '120.00',
            'memo' => 'updated',
        ]);
    }

    public function test_invalid_transaction_update_keeps_the_saved_record_unchanged(): void
    {
        $cash = Account::query()->create(['name' => 'Cash', 'type' => 'asset']);
        $income = Account::query()->create(['name' => 'Income', 'type' => 'income']);
        $transaction = Transaction::query()->create([
            'date' => '2026-09-24',
            'description' => 'Original transaction',
        ]);
        $transaction->entries()->create(['account_id' => $cash->id, 'amount' => 100, 'memo' => 'old']);
        $transaction->entries()->create(['account_id' => $income->id, 'amount' => -100, 'memo' => 'old']);

        $this->from(route('ledger.index'))->patch(route('ledger.update', $transaction), [
            'current_account_id' => $cash->id,
            'date' => '2026-09-25',
            'description' => 'Invalid transaction',
            'entries' => [
                ['account_id' => $cash->id, 'amount' => 120, 'memo' => null],
                ['account_id' => $income->id, 'amount' => -100, 'memo' => null],
            ],
        ])->assertSessionHasErrors('entries');

        $this->assertDatabaseHas(Transaction::class, [
            'id' => $transaction->id,
            'date' => '2026-09-24 00:00:00',
            'description' => 'Original transaction',
        ]);
        $this->assertDatabaseHas('entries', [
            'transaction_id' => $transaction->id,
            'account_id' => $cash->id,
            'amount' => '100.00',
        ]);
    }

    public function test_transaction_update_returns_not_found_for_an_account_not_in_the_transaction(): void
    {
        $cash = Account::query()->create(['name' => 'Cash', 'type' => 'asset']);
        $income = Account::query()->create(['name' => 'Income', 'type' => 'income']);
        $otherAccount = Account::query()->create(['name' => 'Other', 'type' => 'asset']);
        $transaction = Transaction::query()->create([
            'date' => '2026-09-24',
            'description' => 'Original transaction',
        ]);
        $transaction->entries()->create(['account_id' => $cash->id, 'amount' => 100, 'memo' => null]);
        $transaction->entries()->create(['account_id' => $income->id, 'amount' => -100, 'memo' => null]);

        $this->patch(route('ledger.update', $transaction), [
            'current_account_id' => $otherAccount->id,
            'date' => '2026-09-25',
            'description' => 'Should not update',
            'entries' => [
                ['account_id' => $otherAccount->id, 'amount' => 120, 'memo' => null],
                ['account_id' => $income->id, 'amount' => -120, 'memo' => null],
            ],
        ])->assertNotFound();

        $this->assertDatabaseHas(Transaction::class, [
            'id' => $transaction->id,
            'description' => 'Original transaction',
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

        $this->delete(route('ledger.destroy', $transaction))
            ->assertRedirect(route('ledger.index'));

        $this->assertDatabaseMissing(Transaction::class, ['id' => $transaction->id]);
    }

    public function test_deleting_a_missing_transaction_returns_not_found_without_removing_saved_records(): void
    {
        $cash = Account::query()->create(['name' => 'Cash', 'type' => 'asset']);
        $income = Account::query()->create(['name' => 'Income', 'type' => 'income']);
        $transaction = Transaction::query()->create([
            'date' => '2026-09-24',
            'description' => 'Keep this transaction',
        ]);
        $transaction->entries()->create(['account_id' => $cash->id, 'amount' => 100, 'memo' => null]);
        $transaction->entries()->create(['account_id' => $income->id, 'amount' => -100, 'memo' => null]);

        $this->delete(route('ledger.destroy', $transaction->id + 100))->assertNotFound();

        $this->assertDatabaseHas(Transaction::class, [
            'id' => $transaction->id,
            'description' => 'Keep this transaction',
        ]);
    }
}

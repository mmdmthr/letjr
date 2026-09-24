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

        $revenue = Account::query()->create([
            'name' => 'Revenue',
            'type' => 'revenue',
        ]);

        $response = $this->post(route('ledger.store'), [
            'date' => '2026-09-24',
            'description' => 'Service invoice',
            'entries' => [
                ['account_id' => $cash->id, 'amount' => 1250, 'memo' => 'received cash'],
                ['account_id' => $revenue->id, 'amount' => -1250, 'memo' => 'revenue earned'],
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
}

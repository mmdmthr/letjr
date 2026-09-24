<?php

namespace Tests\Feature;

use App\Rules\BalancedTransaction;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

class TransactionBalanceTest extends TestCase
{
    public function test_transaction_entries_must_balance_to_zero(): void
    {
        $valid = Validator::make([
            'entries' => [
                ['account_id' => 1, 'amount' => 1000],
                ['account_id' => 2, 'amount' => -1000],
            ],
        ], [
            'entries' => ['required', new BalancedTransaction],
        ]);

        $this->assertFalse($valid->fails());

        $invalid = Validator::make([
            'entries' => [
                ['account_id' => 1, 'amount' => 1000],
                ['account_id' => 2, 'amount' => -500],
            ],
        ], [
            'entries' => ['required', new BalancedTransaction],
        ]);

        $this->assertTrue($invalid->fails());
        $this->assertArrayHasKey('entries', $invalid->errors()->toArray());
    }
}

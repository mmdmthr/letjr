<?php

namespace Database\Seeders;

use App\Enums\AccountType;
use App\Models\Account;
use Illuminate\Database\Seeder;

class AccountSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([
            ['name' => 'Assets', 'type' => AccountType::ASSET->value],
            ['name' => 'Liabilities', 'type' => AccountType::LIABILITY->value],
            ['name' => 'Equity', 'type' => AccountType::EQUITY->value],
            ['name' => 'Income', 'type' => AccountType::REVENUE->value],
            ['name' => 'Expenses', 'type' => AccountType::EXPENSE->value],
        ] as $rootAccount) {
            Account::query()->firstOrCreate(
                ['name' => $rootAccount['name'], 'parent_id' => null],
                ['type' => $rootAccount['type']],
            );
        }
    }
}

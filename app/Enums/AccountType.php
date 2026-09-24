<?php

namespace App\Enums;

enum AccountType: string
{
    case ASSET = 'Asset';
    case LIABILITY = 'Liability';
    case EQUITY = 'Equity';
    case REVENUE = 'Revenue';
    case EXPENSE = 'Expense';
}

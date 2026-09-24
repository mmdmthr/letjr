<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Translation\PotentiallyTranslatedString;

class BalancedTransaction implements ValidationRule
{
    /**
     * Run the validation rule.
     *
     * @param  Closure(string): PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_array($value)) {
            $fail('The :attribute must be a list of entries.');

            return;
        }

        $total = collect($value)->sum(fn (mixed $entry) => (float) ($entry['amount'] ?? 0));

        if (count($value) < 2) {
            $fail('A transaction must include at least two entries.');

            return;
        }

        if (abs($total) > 0.01) {
            $fail('The transaction entries must balance to zero.');
        }
    }
}

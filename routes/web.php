<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\LedgerController;
use App\Http\Controllers\ReportController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

// Route::middleware(['auth', 'verified'])->group(function () {
Route::inertia('dashboard', 'dashboard')->name('dashboard');

Route::get('accounts', [AccountController::class, 'index'])->name('accounts.index');
Route::post('accounts', [AccountController::class, 'store'])->name('accounts.store');
Route::patch('accounts/{account}', [AccountController::class, 'update'])->name('accounts.update');
Route::delete('accounts/{account}', [AccountController::class, 'destroy'])->name('accounts.destroy');

Route::get('ledger', [LedgerController::class, 'index'])->name('ledger.index');
Route::post('ledger', [LedgerController::class, 'store'])->name('ledger.store');
Route::patch('ledger/{transaction}', [LedgerController::class, 'update'])->name('ledger.update');
Route::delete('ledger/{transaction}', [LedgerController::class, 'destroy'])->name('ledger.destroy');

Route::get('reports/balance-sheet', [ReportController::class, 'balanceSheet'])->name('reports.balance-sheet');
Route::get('reports/cash-flow', [ReportController::class, 'cashFlow'])->name('reports.cash-flow');
// });

require __DIR__.'/settings.php';

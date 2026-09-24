import { Head } from '@inertiajs/react';
import { useState } from 'react';
import TabulatorLedger from './tabulator-ledger';

export default function LedgerIndex({ accounts, recentTransactions, selectedAccountId }: { accounts: Array<{ id: number; name: string; type: string }>; recentTransactions: any[]; selectedAccountId: number | null }) {
    const [currentAccountId, setCurrentAccountId] = useState<number | null>(selectedAccountId);

    return (
        <>
            <Head title="Ledger" />
            <div className="space-y-6 p-6">
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                        <h1 className="text-2xl font-semibold text-slate-900">Ledger</h1>
                        <div className="flex gap-2 text-sm">
                            <a href="/reports/balance-sheet" className="rounded border border-slate-300 px-3 py-1.5 text-slate-700">Balance sheet</a>
                            <a href="/reports/cash-flow" className="rounded border border-slate-300 px-3 py-1.5 text-slate-700">Cash flow</a>
                        </div>
                    </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <h2 className="mb-4 text-lg font-medium text-slate-900">Fast journal</h2>
                    <TabulatorLedger
                        accounts={accounts}
                        currentAccountId={currentAccountId}
                        onCurrentAccountChange={setCurrentAccountId}
                    />
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <h2 className="mb-4 text-lg font-medium text-slate-900">Recent transactions</h2>
                    <div className="space-y-3">
                        {recentTransactions.length === 0 ? (
                            <p className="text-sm text-slate-500">No transactions recorded yet.</p>
                        ) : (
                            recentTransactions.map((transaction) => (
                                <div key={transaction.id} className="rounded border border-slate-200 p-3">
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                        <span className="font-medium text-slate-800">{transaction.description}</span>
                                        <span className="text-sm text-slate-500">{transaction.date}</span>
                                    </div>
                                    <div className="space-y-1 text-sm text-slate-600">
                                        {transaction.entries.map((entry: any) => (
                                            <div key={entry.id} className="flex items-center justify-between gap-3">
                                                <span>{entry.account}</span>
                                                <span>{entry.amount > 0 ? `+${entry.amount}` : entry.amount}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

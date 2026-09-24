import { Head } from '@inertiajs/react';

export default function BalanceSheet({ reportDate, accounts, totals }: { reportDate: string; accounts: any[]; totals: any }) {
    return (
        <>
            <Head title="Balance Sheet" />
            <div className="space-y-6 p-6">
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <h1 className="text-2xl font-semibold text-slate-900">Balance Sheet</h1>
                    <p className="mt-1 text-sm text-slate-500">As of {reportDate}</p>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Assets</h2>
                        <p className="mt-2 text-2xl font-semibold">{totals.assets.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Liabilities</h2>
                        <p className="mt-2 text-2xl font-semibold">{totals.liabilities.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Equity</h2>
                        <p className="mt-2 text-2xl font-semibold">{totals.equity.toFixed(2)}</p>
                    </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <h2 className="mb-4 text-lg font-medium text-slate-900">Equation check</h2>
                    <p className="text-sm text-slate-700">
                        Assets = Liabilities + Equity<br />
                        {totals.assets.toFixed(2)} = {totals.liabilities.toFixed(2)} + {totals.equity.toFixed(2)}
                    </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <h2 className="mb-4 text-lg font-medium text-slate-900">Accounts</h2>
                    <div className="space-y-2">
                        {accounts.map((account: any) => (
                            <div key={account.id} className="flex items-center justify-between gap-3 rounded border border-slate-200 px-3 py-2 text-sm">
                                <span>{account.name}</span>
                                <span className="font-medium">{account.balance.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}

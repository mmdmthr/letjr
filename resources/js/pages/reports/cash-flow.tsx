import { Head } from '@inertiajs/react';

export default function CashFlow({ startDate, endDate, totals, entries }: { startDate: string; endDate: string; totals: any; entries: any[] }) {
    return (
        <>
            <Head title="Cash Flow" />
            <div className="space-y-6 p-6">
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <h1 className="text-2xl font-semibold text-slate-900">Cash Flow</h1>
                    <p className="mt-1 text-sm text-slate-500">{startDate} to {endDate}</p>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Cash In</h2>
                        <p className="mt-2 text-2xl font-semibold">{totals.cashIn.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Cash Out</h2>
                        <p className="mt-2 text-2xl font-semibold">{totals.cashOut.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">Net Cash Flow</h2>
                        <p className="mt-2 text-2xl font-semibold">{totals.netCashFlow.toFixed(2)}</p>
                    </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <h2 className="mb-4 text-lg font-medium text-slate-900">Entries</h2>
                    <div className="space-y-2">
                        {entries.map((entry: any) => (
                            <div key={entry.id} className="flex items-center justify-between gap-3 rounded border border-slate-200 px-3 py-2 text-sm">
                                <div>
                                    <div className="font-medium text-slate-800">{entry.description}</div>
                                    <div className="text-slate-500">{entry.account} • {entry.date}</div>
                                </div>
                                <span className="font-medium">{entry.amount.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}

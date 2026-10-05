import { Head, router } from '@inertiajs/react';
import { index as ledgerIndex } from '@/routes/ledger';
import TabulatorLedger from './tabulator-ledger';

export default function LedgerIndex({
    accounts,
    ledgerRows,
    selectedAccountId,
}: {
    accounts: Array<{
        id: number;
        name: string;
        type: string;
        parent_id: number | null;
    }>;
    ledgerRows: Array<{
        id: number;
        date: string;
        description: string;
        amount: number;
        memo: string | null;
        counterpartAccountId: number | null;
        counterpartSearch: string;
        entries: Array<{
            account_id: number;
            amount: number;
            memo: string | null;
        }>;
    }>;
    selectedAccountId: number | null;
}) {
    const currentAccountId = selectedAccountId;

    const handleCurrentAccountChange = (accountId: number | null) => {
        const url = ledgerIndex.url(
            accountId === null ? undefined : { query: { account: accountId } },
        );

        router.get(
            url,
            {},
            {
                preserveScroll: true,
                preserveState: true,
                only: ['selectedAccountId', 'ledgerRows'],
            },
        );
    };

    return (
        <>
            <Head title="Ledger" />
            <div className="space-y-6 p-6">
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                        <h1 className="text-2xl font-semibold text-slate-900">
                            Ledger
                        </h1>
                        <div className="flex gap-2 text-sm">
                            <a
                                href="/reports/balance-sheet"
                                className="rounded border border-slate-300 px-3 py-1.5 text-slate-700"
                            >
                                Balance sheet
                            </a>
                            <a
                                href="/reports/cash-flow"
                                className="rounded border border-slate-300 px-3 py-1.5 text-slate-700"
                            >
                                Cash flow
                            </a>
                        </div>
                    </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <h2 className="mb-4 text-lg font-medium text-slate-900">
                        Ledger entries
                    </h2>
                    <TabulatorLedger
                        accounts={accounts}
                        currentAccountId={currentAccountId}
                        ledgerRows={ledgerRows}
                        onCurrentAccountChange={handleCurrentAccountChange}
                    />
                </div>
            </div>
        </>
    );
}

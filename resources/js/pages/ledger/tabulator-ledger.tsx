import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { TabulatorFull as Tabulator } from 'tabulator-tables';
import { store } from '@/routes/ledger';
import 'tabulator-tables/dist/css/tabulator.min.css';

export type LedgerRow = {
    id: number | null;
    date: string;
    description: string;
    counterpart: string;
    amount: number;
    memo: string;
};

type Account = { id: number; name: string; type: string };

export default function TabulatorLedger({ accounts, currentAccountId, onCurrentAccountChange }: {
    accounts: Account[];
    currentAccountId: number | null;
    onCurrentAccountChange: (accountId: number | null) => void;
}) {
    const tableRef = useRef<HTMLDivElement | null>(null);
    const tabulatorRef = useRef<Tabulator | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const resetTable = () => {
        tabulatorRef.current?.setData([
            {
                id: null,
                date: new Date().toISOString().slice(0, 10),
                description: '',
                counterpart: '',
                amount: 0,
                memo: '',
            },
        ]);
    };

    const handleSave = () => {
        const rows = tabulatorRef.current?.getData?.() ?? [];

        if (!rows.length) {
            return;
        }

        const currentAccount = accounts.find((account) => account.id === currentAccountId);

        if (!currentAccount) {
            window.alert('Choose the current account before saving.');

            return;
        }

        const accountsById = new Map(accounts.map((account) => [String(account.id), account]));
        const entries = rows.flatMap((row: Record<string, unknown>) => {
            const accountId = typeof row.counterpart === 'string' ? row.counterpart : '';
            const counterpart = accountsById.get(accountId);

            if (!counterpart || counterpart.id === currentAccount.id) {
                return [];
            }

            const amount = Number(row.amount ?? 0);

            if (!Number.isFinite(amount) || amount === 0) {
                return [];
            }

            const memo = typeof row.memo === 'string' ? row.memo.trim() || null : null;

            return [
                { account_id: currentAccount.id, amount, memo },
                { account_id: counterpart.id, amount: -amount, memo },
            ];
        });

        if (entries.length < 2) {
            window.alert('Add at least two accounts to create a balanced journal entry.');

            return;
        }

        const total = entries.reduce((sum, entry) => sum + Number(entry.amount), 0);

        if (Math.abs(total) > 0.01) {
            window.alert('The journal entry must balance to zero before saving.');

            return;
        }

        const transaction = rows.find((row: Record<string, unknown>) => {
            const description = typeof row.description === 'string' ? row.description.trim() : '';

            return description.length > 0;
        }) ?? rows[0];

        setIsSaving(true);

        router.post(store.url(), {
            date: typeof transaction?.date === 'string' && transaction.date ? transaction.date : new Date().toISOString().slice(0, 10),
            description: typeof transaction?.description === 'string' && transaction.description.trim().length > 0
                ? transaction.description.trim()
                : 'Manual journal entry',
            entries,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                resetTable();
            },
            onFinish: () => {
                setIsSaving(false);
            },
        });
    };

    useEffect(() => {
        if (!tableRef.current || tabulatorRef.current) {
            return;
        }

        const accountOptions = accounts
            .filter((account) => account.id !== currentAccountId)
            .map((account) => ({
            value: String(account.id),
            label: `${account.name} (${account.type})`,
            }));

        tabulatorRef.current = new Tabulator(tableRef.current, {
            data: [
                {
                    id: null,
                    date: new Date().toISOString().slice(0, 10),
                    description: '',
                    counterpart: '',
                    amount: 0,
                    memo: '',
                },
            ],
            height: '420px',
            movableRows: false,
            rowHeader: { formatter: 'rownum', width: 40 },
            layout: 'fitColumns',
            tabEndNewRow: true,
            columns: [
                { title: 'Date', field: 'date', editor: 'input', sorter: 'date', width: 120 },
                { title: 'Description', field: 'description', editor: 'input', minWidth: 180 },
                {
                    title: 'Counterpart account',
                    field: 'counterpart',
                    editor: 'list',
                    editorParams: {
                        values: accountOptions,
                        freetext: true,
                    },
                    minWidth: 180,
                },
                { title: 'Amount (+ debit / - credit)', field: 'amount', editor: 'number', width: 180, formatter: 'money' },
                { title: 'Memo', field: 'memo', editor: 'input', minWidth: 160 },
            ],
        });

        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target;
            const amountCell = target instanceof HTMLElement ? target.closest('[tabulator-field="amount"]') : null;

            if (event.key === 'Enter' && amountCell) {
                event.preventDefault();
                handleSave();
            }
        };

        tableRef.current.addEventListener('keydown', handleKeyDown);

        return () => {
            tableRef.current?.removeEventListener('keydown', handleKeyDown);
            tabulatorRef.current?.destroy();
            tabulatorRef.current = null;
        };
    }, [accounts, currentAccountId]);

    return (
        <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-[minmax(14rem,20rem)_1fr] md:items-end">
                <label className="space-y-1 text-sm font-medium text-slate-700">
                    <span>Current account</span>
                    <select
                        value={currentAccountId ?? ''}
                        onChange={(event) => onCurrentAccountChange(event.target.value ? Number(event.target.value) : null)}
                        className="block w-full rounded border border-slate-300 bg-white px-3 py-2 font-normal text-slate-800"
                    >
                        <option value="">Choose an account</option>
                        {accounts.map((account) => (
                            <option key={account.id} value={account.id}>
                                {account.name} ({account.type})
                            </option>
                        ))}
                    </select>
                </label>
                <p className="text-sm text-slate-500">Start with the counterpart account, then enter a signed amount. Positive is debit; negative is credit. Press Enter in the amount field to save.</p>
            </div>
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving || currentAccountId === null}
                    className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                    {isSaving ? 'Saving…' : 'Save transaction'}
                </button>
            </div>
            <div ref={tableRef} className="w-full" />
        </div>
    );
}

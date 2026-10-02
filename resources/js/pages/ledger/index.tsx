import { Head, router } from '@inertiajs/react';
import { MoreHorizontal } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import TabulatorLedger from './tabulator-ledger';

type TransactionEntry = {
    id: number;
    account: string | null;
    amount: number;
};

type LedgerTransaction = {
    id: number;
    date: string;
    description: string;
    entries: TransactionEntry[];
};

function dedupeTransactions(transactions: LedgerTransaction[]) {
    const seen = new Set<number>();

    return transactions.filter((transaction) => {
        if (seen.has(transaction.id)) {
            return false;
        }

        seen.add(transaction.id);

        return true;
    });
}

export default function LedgerIndex({
    accounts,
    recentTransactions,
    selectedAccountId,
    hasMoreTransactions = false,
    currentPage = 1,
}: {
    accounts: Array<{ id: number; name: string; type: string; parent_id: number | null }>; 
    recentTransactions: LedgerTransaction[];
    selectedAccountId: number | null;
    hasMoreTransactions?: boolean;
    currentPage?: number;
}) {
    const [currentAccountId, setCurrentAccountId] = useState<number | null>(selectedAccountId);
    const [transactions, setTransactions] = useState<LedgerTransaction[]>(recentTransactions ?? []);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const listRef = useRef<HTMLDivElement | null>(null);
    const [loadedPage, setLoadedPage] = useState(currentPage);

    useEffect(() => {
        setCurrentAccountId(selectedAccountId);
    }, [selectedAccountId]);

    useEffect(() => {
        setTransactions(recentTransactions ?? []);
        setLoadedPage(currentPage ?? 1);
    }, [recentTransactions, currentPage]);

    const orderedTransactions = useMemo(
        () => [...transactions].sort((left, right) => left.date.localeCompare(right.date) || left.id - right.id),
        [transactions],
    );

    const loadOlderTransactions = useCallback(() => {
        if (!hasMoreTransactions || loadingOlder) {
            return;
        }

        const nextPage = loadedPage + 1;
        const listElement = listRef.current;
        const previousScrollHeight = listElement?.scrollHeight ?? 0;
        const previousScrollTop = listElement?.scrollTop ?? 0;

        setLoadingOlder(true);

        const query: Record<string, number | string> = { page: nextPage };
        if (currentAccountId !== null) {
            query.account = currentAccountId;
        }

        router.get('/ledger', query, {
            preserveScroll: true,
            only: ['recentTransactions', 'currentPage', 'hasMoreTransactions'],
            onSuccess: (page) => {
                const nextTransactions = Array.isArray(page.props.recentTransactions)
                    ? page.props.recentTransactions as LedgerTransaction[]
                    : [];

                setTransactions((previous) => dedupeTransactions([...nextTransactions, ...previous]));
                setLoadedPage(Number(page.props.currentPage ?? nextPage));

                requestAnimationFrame(() => {
                    if (!listElement) {
                        return;
                    }

                    const nextScrollTop = previousScrollTop + (listElement.scrollHeight - previousScrollHeight);
                    listElement.scrollTop = nextScrollTop;
                });
            },
            onFinish: () => setLoadingOlder(false),
        });
    }, [currentAccountId, hasMoreTransactions, loadedPage, loadingOlder]);

    useEffect(() => {
        const listElement = listRef.current;

        if (!listElement) {
            return;
        }

        const onScroll = () => {
            if (listElement.scrollTop <= 120 && hasMoreTransactions && !loadingOlder) {
                loadOlderTransactions();
            }
        };

        listElement.addEventListener('scroll', onScroll);

        return () => {
            listElement.removeEventListener('scroll', onScroll);
        };
    }, [hasMoreTransactions, loadOlderTransactions, loadingOlder]);

    const handleDeleteTransaction = (transactionId: number) => {
        if (!window.confirm('Delete this transaction?')) {
            return;
        }

        router.delete(`/ledger/${transactionId}`, {
            preserveScroll: true,
            onSuccess: () => {
                setTransactions((previous) => previous.filter((transaction) => transaction.id !== transactionId));
            },
            onError: () => {
                window.alert('The transaction could not be deleted.');
            },
        });
    };

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
                    <div ref={listRef} className="max-h-[32rem] space-y-3 overflow-y-auto pr-1">
                        {orderedTransactions.length === 0 ? (
                            <p className="text-sm text-slate-500">No transactions recorded yet.</p>
                        ) : (
                            orderedTransactions.map((transaction) => (
                                <div key={transaction.id} className="rounded border border-slate-200 p-3">
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                        <span className="font-medium text-slate-800">{transaction.description}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-slate-500">{transaction.date}</span>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        aria-label={`Actions for ${transaction.description}`}
                                                        title="Transaction actions"
                                                    >
                                                        <MoreHorizontal size={16} />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem 
                                                        onSelect={() => handleDeleteTransaction(transaction.id)}
                                                        className="text-red-600"
                                                    >
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                    <div className="space-y-1 text-sm text-slate-600">
                                        {transaction.entries.map((entry: TransactionEntry) => (
                                            <div key={entry.id} className="flex items-center justify-between gap-3">
                                                <span>{entry.account}</span>
                                                <span>{entry.amount > 0 ? `+${entry.amount}` : entry.amount}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                        {hasMoreTransactions && (
                            <div className="pt-2 text-center">
                                <button
                                    type="button"
                                    onClick={loadOlderTransactions}
                                    disabled={loadingOlder}
                                    className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {loadingOlder ? 'Loading older transactions…' : 'Load older transactions'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

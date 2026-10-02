import { router } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { AccountSelectTree } from '@/components/accounts/account-select-tree';
import { store } from '@/routes/ledger';

type Account = { id: number; name: string; type: string; parent_id?: number | null };
type Direction = 'increase' | 'decrease';

type AccountTreeNode = Account & { children: AccountTreeNode[] };

type LedgerRow = {
    id: number | null;
    date: string;
    description: string;
    counterpartAccountId: number | null;
    counterpartSearch: string;
    amount: string;
    direction: Direction;
    memo: string;
};

type CounterpartOption = {
    id: number;
    label: string;
    account: Account;
};

function buildAccountTree(accounts: Account[]): AccountTreeNode[] {
    const nodesById = new Map<number, AccountTreeNode>();
    const childrenByParentId = new Map<number, AccountTreeNode[]>();

    for (const account of accounts) {
        const node: AccountTreeNode = {
            ...account,
            children: [],
        };

        nodesById.set(account.id, node);

        if (account.parent_id === null || account.parent_id === undefined) {
            continue;
        }

        const siblings = childrenByParentId.get(account.parent_id) ?? [];
        siblings.push(node);
        childrenByParentId.set(account.parent_id, siblings);
    }

    const sortAccounts = (items: AccountTreeNode[]) => [...items].sort((left, right) => left.name.localeCompare(right.name));

    for (const [parentId, children] of childrenByParentId.entries()) {
        const parent = nodesById.get(parentId);

        if (!parent) {
            continue;
        }

        parent.children = sortAccounts(children);
    }

    return sortAccounts(
        accounts
            .filter((account) => account.parent_id === null || account.parent_id === undefined)
            .map((account) => nodesById.get(account.id) as AccountTreeNode),
    );
}

function getDefaultDirection(accountType?: string): Direction {
    if (accountType && ['asset', 'expense'].includes(accountType)) {
        return 'increase';
    }

    return 'decrease';
}

function createBlankRow(currentAccountId: number | null, accounts: Account[]): LedgerRow {
    const account = accounts.find((candidate) => candidate.id === currentAccountId);

    return {
        id: null,
        date: new Date().toISOString().slice(0, 10),
        description: '',
        counterpartAccountId: null,
        counterpartSearch: '',
        amount: '',
        direction: getDefaultDirection(account?.type),
        memo: '',
    };
}

function buildAccountPath(account: Account, accountsById: Map<string, Account>): string {
    const names: string[] = [account.name];
    let current: Account | undefined = account;

    while (current && current.parent_id !== null && current.parent_id !== undefined) {
        const parent = accountsById.get(String(current.parent_id));

        if (!parent) {
            break;
        }

        names.push(parent.name);
        current = parent;
    }

    return [...names].reverse().join(':');
}

function getSignedAmount(accountType: string, amount: number, direction: Direction): number {
    const normalized = Number(Math.abs(amount));

    if (!Number.isFinite(normalized) || normalized <= 0) {
        return 0;
    }

    const increaseIsPositive = ['asset', 'expense'].includes(accountType);
    const multiplier = direction === 'increase' ? (increaseIsPositive ? 1 : -1) : (increaseIsPositive ? -1 : 1);

    return Number((normalized * multiplier).toFixed(2));
}

function CounterpartSearchField({
    value,
    options,
    onChange,
    onSelect,
    inputRef,
}: {
    value: string;
    options: CounterpartOption[];
    onChange: (value: string) => void;
    onSelect: (option: CounterpartOption) => void;
    inputRef: (element: HTMLInputElement | null) => void;
}) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    const filteredOptions = useMemo(() => {
        const term = value.trim().toLowerCase();

        if (!term) {
            return options.slice(0, 20);
        }

        return options.filter((option) => option.label.toLowerCase().includes(term));
    }, [options, value]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [value]);

    const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
        if (!filteredOptions.length) {
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setSelectedIndex((current) => (current + 1) % filteredOptions.length);
            setIsOpen(true);
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setSelectedIndex((current) => (current - 1 + filteredOptions.length) % filteredOptions.length);
            setIsOpen(true);
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            const option = filteredOptions[selectedIndex] ?? filteredOptions[0];

            if (option) {
                onSelect(option);
                setIsOpen(false);
            }
        }
    };

    return (
        <div className="relative">
            <input
                ref={inputRef}
                type="text"
                value={value}
                placeholder="Search account..."
                onFocus={() => setIsOpen(true)}
                onBlur={() => {
                    window.setTimeout(() => setIsOpen(false), 120);
                }}
                onChange={(event) => {
                    onChange(event.target.value);
                    setIsOpen(true);
                }}
                onKeyDown={handleKeyDown}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-500"
            />
            {isOpen && filteredOptions.length > 0 && (
                <div className="absolute left-0 right-0 z-20 mt-1 max-h-52 overflow-y-auto rounded border border-slate-200 bg-white shadow-lg">
                    {filteredOptions.map((option, index) => (
                        <button
                            key={option.id}
                            type="button"
                            onMouseDown={(event) => {
                                event.preventDefault();
                                onSelect(option);
                                setIsOpen(false);
                            }}
                            onClick={() => setIsOpen(false)}
                            className={[
                                'flex w-full items-center justify-between px-3 py-2 text-left text-sm transition',
                                index === selectedIndex ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50',
                            ].join(' ')}
                        >
                            <span>{option.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function TabulatorLedger({ accounts, currentAccountId, onCurrentAccountChange }: {
    accounts: Account[];
    currentAccountId: number | null;
    onCurrentAccountChange: (accountId: number | null) => void;
}) {
    const accountsById = useMemo(() => new Map(accounts.map((account) => [String(account.id), account])), [accounts]);
    const [rows, setRows] = useState<LedgerRow[]>(() => [createBlankRow(currentAccountId, accounts)]);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [savingRowIndexes, setSavingRowIndexes] = useState<number[]>([]);
    const rowRefs = useRef<Array<HTMLInputElement | null>>([]);

    const counterpartOptions = useMemo<CounterpartOption[]>(() => {
        return accounts
            .filter((account) => account.id !== currentAccountId)
            .map((account) => ({
                id: account.id,
                account,
                label: buildAccountPath(account, accountsById),
            }));
    }, [accounts, accountsById, currentAccountId]);

    useEffect(() => {
        setRows((currentRows) => {
            if (!currentRows.length) {
                return [createBlankRow(currentAccountId, accounts)];
            }

            return currentRows.map((row) => ({
                ...row,
                direction: row.direction ?? getDefaultDirection(accounts.find((account) => account.id === currentAccountId)?.type),
            }));
        });
    }, [accounts, currentAccountId]);

    const handleRowChange = (index: number, updates: Partial<LedgerRow>) => {
        setRows((currentRows) => currentRows.map((row, rowIndex) => rowIndex === index ? { ...row, ...updates } : row));
    };

    const handleSaveRow = (index: number) => {
        const row = rows[index];

        if (!row) {
            return;
        }

        if (savingRowIndexes.includes(index)) {
            return;
        }

        const currentAccount = accounts.find((account) => account.id === currentAccountId);

        if (!currentAccount) {
            setSaveError('Choose the current account before creating a ledger entry.');
            return;
        }

        if (!row.counterpartAccountId) {
            setSaveError('Choose a counterpart account before saving.');
            return;
        }

        const counterpart = accounts.find((account) => account.id === row.counterpartAccountId);

        if (!counterpart || counterpart.id === currentAccount.id) {
            setSaveError('Choose a valid counterpart account that is different from the current account.');
            return;
        }

        const amount = Number(row.amount);

        if (!Number.isFinite(amount) || amount <= 0) {
            setSaveError('Enter an amount greater than zero to save the row.');
            return;
        }

        const signedAmount = getSignedAmount(currentAccount.type, amount, row.direction);
        const memo = row.memo.trim() || null;

        setSavingRowIndexes((current) => [...current, index]);
        setSaveError(null);

        router.post(store.url(), {
            date: row.date || new Date().toISOString().slice(0, 10),
            description: row.description.trim() || 'Manual journal entry',
            entries: [
                { account_id: currentAccount.id, amount: signedAmount, memo },
                { account_id: counterpart.id, amount: -signedAmount, memo },
            ],
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setRows((currentRows) => {
                    const nextRows = [...currentRows];
                    nextRows.splice(index, 1);
                    nextRows.splice(index, 0, createBlankRow(currentAccountId, accounts));
                    return nextRows;
                });

                requestAnimationFrame(() => {
                    rowRefs.current[index + 1]?.focus();
                });
            },
            onError: (errors) => {
                const message = Object.values(errors ?? {}).flat().join(' ') || 'The transaction could not be saved.';
                setSaveError(message);
            },
            onFinish: () => {
                setSavingRowIndexes((current) => current.filter((value) => value !== index));
            },
        });
    };

    const accountTree = useMemo(() => buildAccountTree(accounts), [accounts]);

    return (
        <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-[minmax(14rem,20rem)_1fr] md:items-end">
                <div className="space-y-1 text-sm font-medium text-slate-700">
                    <AccountSelectTree
                        accounts={accountTree}
                        label="Current account"
                        name="current_account"
                        value={currentAccountId === null ? 'none' : String(currentAccountId)}
                        onValueChange={(value) => onCurrentAccountChange(value === 'none' ? null : Number(value))}
                        emptyLabel="Choose an account"
                    />
                </div>
                <p className="text-sm text-slate-500">
                    Use the current account and a counterpart account to create a balanced entry. The direction is shown as Increase or Decrease so the signed journal amount stays clear and consistent with the existing accounting model.
                </p>
            </div>

            {saveError && (
                <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{saveError}</div>
            )}

            <div className="overflow-x-auto">
                <div className="min-w-[1100px] space-y-2">
                    <div className="grid grid-cols-[120px_minmax(170px,1.4fr)_minmax(240px,1.8fr)_170px_120px_minmax(200px,1.2fr)] gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        <span>Date</span>
                        <span>Description</span>
                        <span>Counterpart</span>
                        <span>Amount</span>
                        <span>Direction</span>
                        <span>Memo</span>
                    </div>

                    {rows.map((row, index) => (
                        <div key={index} className="grid grid-cols-[120px_minmax(170px,1.4fr)_minmax(240px,1.8fr)_170px_120px_minmax(200px,1.2fr)] gap-2">
                            <input
                                type="date"
                                value={row.date}
                                onChange={(event) => handleRowChange(index, { date: event.target.value })}
                                className="h-10 rounded border border-slate-300 bg-white px-3 text-sm text-slate-800"
                            />
                            <input
                                type="text"
                                value={row.description}
                                onChange={(event) => handleRowChange(index, { description: event.target.value })}
                                placeholder="Description"
                                className="h-10 rounded border border-slate-300 bg-white px-3 text-sm text-slate-800"
                            />
                            <CounterpartSearchField
                                value={row.counterpartSearch}
                                options={counterpartOptions}
                                onChange={(value) => handleRowChange(index, { counterpartSearch: value, counterpartAccountId: null })}
                                onSelect={(option) => {
                                    handleRowChange(index, {
                                        counterpartAccountId: option.id,
                                        counterpartSearch: option.label,
                                    });
                                }}
                                inputRef={(element) => {
                                    rowRefs.current[index] = element;
                                }}
                            />
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={row.amount}
                                onChange={(event) => handleRowChange(index, { amount: event.target.value })}
                                placeholder="0.00"
                                className="h-10 rounded border border-slate-300 bg-white px-3 text-sm text-slate-800"
                            />
                            <select
                                value={row.direction}
                                onChange={(event) => handleRowChange(index, { direction: event.target.value as Direction })}
                                className="h-10 rounded border border-slate-300 bg-white px-2 text-sm text-slate-800"
                            >
                                <option value="increase">Increase</option>
                                <option value="decrease">Decrease</option>
                            </select>
                            <input
                                type="text"
                                value={row.memo}
                                onChange={(event) => handleRowChange(index, { memo: event.target.value })}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        handleSaveRow(index);
                                    }
                                }}
                                placeholder="Memo"
                                className="h-10 rounded border border-slate-300 bg-white px-3 text-sm text-slate-800"
                                disabled={savingRowIndexes.includes(index)}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

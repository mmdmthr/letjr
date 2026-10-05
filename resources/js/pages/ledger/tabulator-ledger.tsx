import { router } from '@inertiajs/react';
import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { AccountSelectTree } from '@/components/accounts/account-select-tree';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { destroy, store, update } from '@/routes/ledger';

type Account = {
    id: number;
    name: string;
    type: string;
    parent_id?: number | null;
};
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
    entries?: Array<{
        account_id: number;
        amount: number;
        memo: string | null;
    }>;
};

type SavedLedgerRow = {
    id: number;
    date: string;
    description: string;
    amount: number;
    memo: string | null;
    counterpartAccountId: number | null;
    counterpartSearch: string;
    entries: Array<{ account_id: number; amount: number; memo: string | null }>;
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

    const sortAccounts = (items: AccountTreeNode[]) =>
        [...items].sort((left, right) => left.name.localeCompare(right.name));

    for (const [parentId, children] of childrenByParentId.entries()) {
        const parent = nodesById.get(parentId);

        if (!parent) {
            continue;
        }

        parent.children = sortAccounts(children);
    }

    return sortAccounts(
        accounts
            .filter(
                (account) =>
                    account.parent_id === null ||
                    account.parent_id === undefined,
            )
            .map((account) => nodesById.get(account.id) as AccountTreeNode),
    );
}

function getDefaultDirection(accountType?: string): Direction {
    if (accountType && ['asset', 'expense'].includes(accountType)) {
        return 'increase';
    }

    return 'decrease';
}

function getDirectionForAmount(accountType: string, amount: number): Direction {
    const increaseIsPositive = ['asset', 'expense'].includes(accountType);

    if (amount >= 0) {
        return increaseIsPositive ? 'increase' : 'decrease';
    }

    return increaseIsPositive ? 'decrease' : 'increase';
}

function createBlankRow(
    currentAccountId: number | null,
    accounts: Account[],
): LedgerRow {
    const account = accounts.find(
        (candidate) => candidate.id === currentAccountId,
    );

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

function mapSavedRows(
    savedRows: SavedLedgerRow[],
    currentAccountId: number | null,
    accounts: Account[],
    accountsById: Map<string, Account>,
): LedgerRow[] {
    const currentAccount = accounts.find(
        (account) => account.id === currentAccountId,
    );

    return savedRows.map((row) => {
        const counterpartAccount = accounts.find(
            (account) => account.id === row.counterpartAccountId,
        );

        return {
            id: row.id,
            date: row.date,
            description: row.description,
            counterpartAccountId: row.counterpartAccountId,
            counterpartSearch: counterpartAccount
                ? buildAccountPath(counterpartAccount, accountsById)
                : row.counterpartSearch,
            amount: String(Math.abs(row.amount)),
            direction: getDirectionForAmount(
                currentAccount?.type ?? '',
                row.amount,
            ),
            memo: row.memo ?? '',
            entries: row.entries,
        };
    });
}

function buildAccountPath(
    account: Account,
    accountsById: Map<string, Account>,
): string {
    const names: string[] = [account.name];
    let current: Account | undefined = account;

    while (
        current &&
        current.parent_id !== null &&
        current.parent_id !== undefined
    ) {
        const parent = accountsById.get(String(current.parent_id));

        if (!parent) {
            break;
        }

        names.push(parent.name);
        current = parent;
    }

    return [...names].reverse().join(':');
}

function getSignedAmount(
    accountType: string,
    amount: number,
    direction: Direction,
): number {
    const normalized = Number(Math.abs(amount));

    if (!Number.isFinite(normalized) || normalized <= 0) {
        return 0;
    }

    const increaseIsPositive = ['asset', 'expense'].includes(accountType);
    const multiplier =
        direction === 'increase'
            ? increaseIsPositive
                ? 1
                : -1
            : increaseIsPositive
              ? -1
              : 1;

    return Number((normalized * multiplier).toFixed(2));
}

function CounterpartSearchField({
    value,
    options,
    onChange,
    onSelect,
    inputRef,
    disabled = false,
}: {
    value: string;
    options: CounterpartOption[];
    onChange: (value: string) => void;
    onSelect: (option: CounterpartOption) => void;
    inputRef: (element: HTMLInputElement | null) => void;
    disabled?: boolean;
}) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    const filteredOptions = useMemo(() => {
        const term = value.trim().toLowerCase();

        if (!term) {
            return options.slice(0, 20);
        }

        return options.filter((option) =>
            option.label.toLowerCase().includes(term),
        );
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
            setSelectedIndex(
                (current) => (current + 1) % filteredOptions.length,
            );
            setIsOpen(true);
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setSelectedIndex(
                (current) =>
                    (current - 1 + filteredOptions.length) %
                    filteredOptions.length,
            );
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
                disabled={disabled}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 transition outline-none focus:border-slate-500"
            />
            {isOpen && filteredOptions.length > 0 && (
                <div className="absolute right-0 left-0 z-20 mt-1 max-h-52 overflow-y-auto rounded border border-slate-200 bg-white shadow-lg">
                    {filteredOptions.map((option, index) => (
                        <button
                            key={option.id}
                            type="button"
                            disabled={disabled}
                            onMouseDown={(event) => {
                                event.preventDefault();
                                onSelect(option);
                                setIsOpen(false);
                            }}
                            onClick={() => setIsOpen(false)}
                            className={[
                                'flex w-full items-center justify-between px-3 py-2 text-left text-sm transition',
                                index === selectedIndex
                                    ? 'bg-slate-100 text-slate-900'
                                    : 'text-slate-700 hover:bg-slate-50',
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

export default function TabulatorLedger({
    accounts,
    currentAccountId,
    ledgerRows,
    onCurrentAccountChange,
}: {
    accounts: Account[];
    currentAccountId: number | null;
    ledgerRows: SavedLedgerRow[];
    onCurrentAccountChange: (accountId: number | null) => void;
}) {
    const accountsById = useMemo(
        () => new Map(accounts.map((account) => [String(account.id), account])),
        [accounts],
    );
    const [savedRows, setSavedRows] = useState<LedgerRow[]>(() =>
        mapSavedRows(ledgerRows, currentAccountId, accounts, accountsById),
    );
    const [inputRow, setInputRow] = useState<LedgerRow>(() =>
        createBlankRow(currentAccountId, accounts),
    );
    const [saveError, setSaveError] = useState<string | null>(null);
    const [savingInputRow, setSavingInputRow] = useState(false);
    const [savingRecordIds, setSavingRecordIds] = useState<number[]>([]);
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
        setSavedRows(
            mapSavedRows(ledgerRows, currentAccountId, accounts, accountsById),
        );
    }, [accounts, accountsById, currentAccountId, ledgerRows]);

    const handleInputRowChange = (updates: Partial<LedgerRow>) => {
        setInputRow((row) => ({ ...row, ...updates }));
    };

    const prepareRow = (row: LedgerRow) => {
        const currentAccount = accounts.find(
            (account) => account.id === currentAccountId,
        );

        if (!currentAccount) {
            setSaveError(
                'Choose the current account before saving a ledger entry.',
            );
            return null;
        }

        if (!row.counterpartAccountId) {
            setSaveError('Choose a counterpart account before saving.');
            return null;
        }

        const counterpart = accounts.find(
            (account) => account.id === row.counterpartAccountId,
        );

        if (!counterpart || counterpart.id === currentAccount.id) {
            setSaveError(
                'Choose a valid counterpart account that is different from the current account.',
            );
            return null;
        }

        const amount = Number(row.amount);

        if (!Number.isFinite(amount) || amount <= 0) {
            setSaveError('Enter an amount greater than zero to save the row.');
            return null;
        }

        return {
            currentAccount,
            counterpart,
            signedAmount: getSignedAmount(
                currentAccount.type,
                amount,
                row.direction,
            ),
            memo: row.memo.trim() || null,
        };
    };

    const handleSaveInputRow = () => {
        if (savingInputRow) {
            return;
        }

        const prepared = prepareRow(inputRow);
        if (!prepared) {
            return;
        }

        setSavingInputRow(true);
        setSaveError(null);

        router.post(
            store.url(),
            {
                date: inputRow.date || new Date().toISOString().slice(0, 10),
                description:
                    inputRow.description.trim() || 'Manual journal entry',
                entries: [
                    {
                        account_id: prepared.currentAccount.id,
                        amount: prepared.signedAmount,
                        memo: prepared.memo,
                    },
                    {
                        account_id: prepared.counterpart.id,
                        amount: -prepared.signedAmount,
                        memo: prepared.memo,
                    },
                ],
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setInputRow(createBlankRow(currentAccountId, accounts));

                    requestAnimationFrame(() => {
                        rowRefs.current[0]?.focus();
                    });
                },
                onError: (errors) => {
                    const message =
                        Object.values(errors ?? {})
                            .flat()
                            .join(' ') || 'The transaction could not be saved.';
                    setSaveError(message);
                },
                onHttpException: (response) => {
                    setSaveError(
                        `The transaction could not be saved (HTTP ${response.status}).`,
                    );
                    return false;
                },
                onNetworkError: (error) => {
                    setSaveError(
                        error.message || 'The transaction could not be saved.',
                    );
                },
                onFinish: () => {
                    setSavingInputRow(false);
                },
            },
        );
    };

    const handleSavedRowChange = (
        transactionId: number,
        updates: Partial<LedgerRow>,
    ) => {
        setSavedRows((currentRows) =>
            currentRows.map((row) =>
                row.id === transactionId ? { ...row, ...updates } : row,
            ),
        );
    };

    const handleUpdateSavedRow = (transactionId: number) => {
        if (savingRecordIds.includes(transactionId)) {
            return;
        }

        const row = savedRows.find((savedRow) => savedRow.id === transactionId);
        if (!row) {
            return;
        }

        const prepared = prepareRow(row);
        if (!prepared) {
            return;
        }

        const entries = row.entries ? [...row.entries] : [];
        const currentEntryIndex = entries.findIndex(
            (entry) => entry.account_id === prepared.currentAccount.id,
        );
        const counterpartEntryIndex = entries.findIndex(
            (entry, index) => index !== currentEntryIndex,
        );

        if (currentEntryIndex < 0 || counterpartEntryIndex < 0) {
            setSaveError(
                'This transaction is missing the entries needed to update it.',
            );
            return;
        }

        const remainingAmount = entries.reduce(
            (total, entry, index) =>
                index === currentEntryIndex || index === counterpartEntryIndex
                    ? total
                    : total + entry.amount,
            0,
        );
        entries[currentEntryIndex] = {
            ...entries[currentEntryIndex],
            amount: prepared.signedAmount,
            memo: prepared.memo,
        };
        entries[counterpartEntryIndex] = {
            ...entries[counterpartEntryIndex],
            account_id: prepared.counterpart.id,
            amount: -prepared.signedAmount - remainingAmount,
            memo: prepared.memo,
        };

        setSavingRecordIds((current) => [...current, transactionId]);
        setSaveError(null);

        router.patch(
            update.url(transactionId),
            {
                current_account_id: prepared.currentAccount.id,
                date: row.date,
                description: row.description.trim() || 'Manual journal entry',
                entries,
            },
            {
                preserveScroll: true,
                onError: (errors) => {
                    const message =
                        Object.values(errors ?? {})
                            .flat()
                            .join(' ') ||
                        'The transaction could not be updated.';
                    setSaveError(message);
                },
                onHttpException: (response) => {
                    setSaveError(
                        `The transaction could not be updated (HTTP ${response.status}).`,
                    );
                    return false;
                },
                onNetworkError: (error) => {
                    setSaveError(
                        error.message ||
                            'The transaction could not be updated.',
                    );
                },
                onFinish: () => {
                    setSavingRecordIds((current) =>
                        current.filter((value) => value !== transactionId),
                    );
                },
            },
        );
    };

    const handleDeleteSavedRow = (transactionId: number) => {
        if (!window.confirm('Delete this transaction?')) {
            return;
        }

        const options =
            currentAccountId === null
                ? undefined
                : { query: { account: currentAccountId } };

        router.delete(destroy.url(transactionId, options), {
            preserveScroll: true,
            onError: () => {
                window.alert('The transaction could not be deleted.');
            },
            onHttpException: () => {
                window.alert('The transaction could not be deleted.');
                return false;
            },
            onNetworkError: () => {
                window.alert('The transaction could not be deleted.');
            },
        });
    };

    const renderRow = (
        row: LedgerRow,
        key: string | number,
        isSaved: boolean,
        isSaving: boolean,
        onChange: (updates: Partial<LedgerRow>) => void,
        onSave: () => void,
    ) => (
        <div
            key={key}
            className={[
                'grid grid-cols-[120px_minmax(170px,1.4fr)_minmax(240px,1.8fr)_130px_130px_minmax(200px,1.2fr)_104px] gap-2',
                isSaved ? 'rounded bg-slate-50 p-1' : '',
            ].join(' ')}
        >
            <input
                type="date"
                value={row.date}
                onChange={(event) => onChange({ date: event.target.value })}
                disabled={isSaving}
                className="h-10 rounded border border-slate-300 bg-white px-3 text-sm text-slate-800"
            />
            <input
                type="text"
                value={row.description}
                onChange={(event) =>
                    onChange({ description: event.target.value })
                }
                placeholder="Description"
                disabled={isSaving}
                className="h-10 rounded border border-slate-300 bg-white px-3 text-sm text-slate-800"
            />
            <CounterpartSearchField
                value={row.counterpartSearch}
                options={counterpartOptions}
                onChange={(value) =>
                    onChange({
                        counterpartSearch: value,
                        counterpartAccountId: null,
                    })
                }
                onSelect={(option) => {
                    onChange({
                        counterpartAccountId: option.id,
                        counterpartSearch: option.label,
                    });
                }}
                inputRef={(element) => {
                    if (!isSaved) {
                        rowRefs.current[0] = element;
                    }
                }}
                disabled={isSaving}
            />
            <input
                type="number"
                min="0"
                step="0.01"
                value={row.direction === 'increase' ? row.amount : ''}
                onChange={(event) =>
                    onChange({
                        amount: event.target.value,
                        direction: 'increase',
                    })
                }
                placeholder="0.00"
                aria-label="Increase amount"
                disabled={isSaving}
                className="h-10 rounded border border-slate-300 bg-white px-3 text-sm text-slate-800"
            />
            <input
                type="number"
                min="0"
                step="0.01"
                value={row.direction === 'decrease' ? row.amount : ''}
                onChange={(event) =>
                    onChange({
                        amount: event.target.value,
                        direction: 'decrease',
                    })
                }
                placeholder="0.00"
                aria-label="Decrease amount"
                disabled={isSaving}
                className="h-10 rounded border border-slate-300 bg-white px-3 text-sm text-slate-800"
            />
            <input
                type="text"
                value={row.memo}
                onChange={(event) => onChange({ memo: event.target.value })}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        event.stopPropagation();
                        onSave();
                    }
                }}
                placeholder="Memo"
                disabled={isSaving}
                className="h-10 rounded border border-slate-300 bg-white px-3 text-sm text-slate-800"
            />
            <div className="flex items-center justify-end gap-1">
                <Button
                    type="button"
                    size="sm"
                    disabled={isSaving}
                    onClick={onSave}
                >
                    {isSaved ? 'Save' : 'Add'}
                </Button>
                {isSaved && row.id !== null && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={`Actions for ${row.description}`}
                                title="Transaction actions"
                            >
                                <MoreHorizontal size={16} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onSelect={() =>
                                    row.id !== null &&
                                    handleDeleteSavedRow(row.id)
                                }
                                className="text-red-600"
                            >
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </div>
    );

    const accountTree = useMemo(() => buildAccountTree(accounts), [accounts]);

    return (
        <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-[minmax(14rem,20rem)_1fr] md:items-end">
                <div className="space-y-1 text-sm font-medium text-slate-700">
                    <AccountSelectTree
                        accounts={accountTree}
                        label="Current account"
                        name="current_account"
                        value={
                            currentAccountId === null
                                ? 'none'
                                : String(currentAccountId)
                        }
                        onValueChange={(value) =>
                            onCurrentAccountChange(
                                value === 'none' ? null : Number(value),
                            )
                        }
                        emptyLabel="Choose an account"
                    />
                </div>
                <p className="text-sm text-slate-500">
                    Use the current account and a counterpart account to create
                    a balanced entry. Enter the amount under Increase or
                    Decrease; the signed journal amount stays consistent with
                    the existing accounting model.
                </p>
            </div>

            {saveError && (
                <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {saveError}
                </div>
            )}

            <div className="overflow-x-auto">
                <div className="min-w-[1204px] space-y-2">
                    <div className="grid grid-cols-[120px_minmax(170px,1.4fr)_minmax(240px,1.8fr)_130px_130px_minmax(200px,1.2fr)_104px] gap-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                        <span>Date</span>
                        <span>Description</span>
                        <span>Counterpart</span>
                        <span>Increase</span>
                        <span>Decrease</span>
                        <span>Memo</span>
                        <span>Actions</span>
                    </div>

                    {savedRows.map((row) => {
                        if (row.id === null) {
                            return null;
                        }

                        const transactionId = row.id;

                        return renderRow(
                            row,
                            transactionId,
                            true,
                            savingRecordIds.includes(transactionId),
                            (updates) =>
                                handleSavedRowChange(transactionId, updates),
                            () => handleUpdateSavedRow(transactionId),
                        );
                    })}
                    {renderRow(
                        inputRow,
                        'input-row',
                        false,
                        savingInputRow,
                        handleInputRowChange,
                        handleSaveInputRow,
                    )}
                </div>
            </div>
        </div>
    );
}

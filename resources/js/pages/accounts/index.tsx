import { Head, Link, usePage } from '@inertiajs/react';
import {
    ChevronDown,
    ChevronRight,
    Landmark,
    MoreHorizontal,
    Plus,
} from 'lucide-react';
import { useState } from 'react';
import AccountController from '@/actions/App/Http/Controllers/AccountController';
import { AccountSelectTree } from '@/components/accounts/account-select-tree';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { index as ledgerIndex } from '@/routes/ledger';

type AccountRecord = {
    id: number;
    name: string;
    type: string;
    parent_id: number | null;
    balance: number;
    children: AccountRecord[];
};

type AccountTypeOption = {
    value: string;
    label: string;
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 2,
});

function AccountRow({
    account,
    accountTypes,
    onUpdate,
    onDelete,
    depth = 0,
}: {
    account: AccountRecord;
    accountTypes: AccountTypeOption[];
    onUpdate: (account: AccountRecord) => void;
    onDelete: (account: AccountRecord) => void;
    depth?: number;
}) {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = account.children.length > 0;

    return (
        <div>
            <div className="grid grid-cols-[minmax(0,1fr)_7rem_8rem_2.25rem] items-center gap-3 border-b border-slate-100 py-2 pr-3 text-sm last:border-b-0">
                <div
                    className="flex min-w-0 items-center gap-1"
                    style={{ paddingLeft: `${depth * 1.5}rem` }}
                >
                    <button
                        type="button"
                        aria-label={
                            hasChildren
                                ? `${isExpanded ? 'Collapse' : 'Expand'} ${account.name}`
                                : undefined
                        }
                        aria-expanded={hasChildren ? isExpanded : undefined}
                        disabled={!hasChildren}
                        onClick={() => setIsExpanded((expanded) => !expanded)}
                        className="flex size-5 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-default disabled:hover:bg-transparent disabled:hover:text-slate-400"
                    >
                        {hasChildren ? (
                            isExpanded ? (
                                <ChevronDown size={15} />
                            ) : (
                                <ChevronRight size={15} />
                            )
                        ) : null}
                    </button>
                    <Landmark
                        size={15}
                        className="mr-1 shrink-0 text-slate-500"
                    />
                    {account.id === null ? (
                        <span className="truncate font-medium text-slate-800">
                            {account.name}
                        </span>
                    ) : (
                        <Link
                            href={
                                ledgerIndex({ query: { account: account.id } })
                                    .url
                            }
                            className="truncate font-medium text-slate-800 hover:text-slate-950 hover:underline"
                        >
                            {account.name}
                        </Link>
                    )}
                </div>
                <span className="truncate text-xs tracking-wide text-slate-500 uppercase">
                    {accountTypes.find((type) => type.value === account.type)
                        ?.label ?? account.type}
                </span>
                <span className="text-right text-slate-700 tabular-nums">
                    {currencyFormatter.format(account.balance)}
                </span>
                <AccountActions
                    account={account}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                />
            </div>
            {hasChildren &&
                isExpanded &&
                account.children.map((child) => (
                    <AccountRow
                        key={child.id}
                        account={child}
                        accountTypes={accountTypes}
                        onUpdate={onUpdate}
                        onDelete={onDelete}
                        depth={depth + 1}
                    />
                ))}
        </div>
    );
}

function getAccountAndDescendantIds(account: AccountRecord): number[] {
    return [
        account.id,
        ...account.children.flatMap(getAccountAndDescendantIds),
    ];
}

function AccountForm({
    accounts,
    accountTypes,
    account,
}: {
    accounts: AccountRecord[];
    accountTypes: AccountTypeOption[];
    account?: AccountRecord;
}) {
    const [selectedType, setSelectedType] = useState(
        account?.type ?? accountTypes[0]?.value ?? '',
    );
    const [parentId, setParentId] = useState(
        account?.parent_id === null || account?.parent_id === undefined
            ? 'none'
            : String(account.parent_id),
    );
    const excludedIds = account
        ? new Set(getAccountAndDescendantIds(account))
        : new Set<number>();
    function handleTypeChange(type: string) {
        setSelectedType(type);

        const nextRootAccounts = accounts.filter((root) => root.type === type);
        if (
            parentId !== 'none' &&
            !nextRootAccounts.some((root) =>
                getAccountAndDescendantIds(root).includes(Number(parentId)),
            )
        ) {
            setParentId('none');
        }
    }

    return (
        <form
            method="post"
            action={
                account
                    ? AccountController.update.url(account.id)
                    : AccountController.store.url()
            }
            className="space-y-3"
        >
            <input
                type="hidden"
                name="_token"
                value={
                    document
                        .querySelector('meta[name="csrf-token"]')
                        ?.getAttribute('content') ?? ''
                }
            />
            {account && <input type="hidden" name="_method" value="PATCH" />}
            <div>
                <label
                    htmlFor="account-name"
                    className="mb-1 block text-sm font-medium text-slate-700"
                >
                    Name
                </label>
                <input
                    id="account-name"
                    name="name"
                    defaultValue={account?.name}
                    className="w-full rounded border border-slate-300 px-3 py-2 text-slate-900"
                    required
                />
            </div>
            <div>
                <label
                    htmlFor="account-type"
                    className="mb-1 block text-sm font-medium text-slate-700"
                >
                    Type
                </label>
                <select
                    id="account-type"
                    name="type"
                    value={selectedType}
                    onChange={(event) => handleTypeChange(event.target.value)}
                    className="w-full rounded border border-slate-300 px-3 py-2 text-slate-900"
                >
                    {accountTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                            {type.label}
                        </option>
                    ))}
                </select>
            </div>
            <AccountSelectTree
                accounts={accounts}
                label="Parent account"
                name="parent_id"
                rootType={selectedType}
                value={parentId}
                onValueChange={setParentId}
                excludedIds={excludedIds}
            />
            <button
                type="submit"
                className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
                {account ? 'Update account' : 'Create account'}
            </button>
        </form>
    );
}

function AccountActions({
    account,
    onUpdate,
    onDelete,
}: {
    account: AccountRecord;
    onUpdate: (account: AccountRecord) => void;
    onDelete: (account: AccountRecord) => void;
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Actions for ${account.name}`}
                    title="Account actions"
                    onClick={(event) => event.stopPropagation()}
                >
                    <MoreHorizontal />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                onClick={(event) => event.stopPropagation()}
            >
                <DropdownMenuItem
                    onSelect={(event) => {
                        event.stopPropagation();
                        onUpdate(account);
                    }}
                >
                    Update account
                </DropdownMenuItem>
                <DropdownMenuItem
                    variant="destructive"
                    onSelect={(event) => {
                        event.stopPropagation();
                        onDelete(account);
                    }}
                >
                    Delete account
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

type AccountDialogState =
    | { type: 'create' }
    | { type: 'update'; account: AccountRecord }
    | { type: 'delete'; account: AccountRecord }
    | null;

export default function AccountsIndex({
    accounts,
    accountTypes,
}: {
    accounts: AccountRecord[];
    accountTypes: AccountTypeOption[];
}) {
    const [dialog, setDialog] = useState<AccountDialogState>(null);
    const { errors } = usePage().props as { errors?: { account?: string } };

    return (
        <>
            <Head title="Accounts" />
            <div className="space-y-6 p-6">
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <h1 className="text-2xl font-semibold text-slate-900">
                        Chart of Accounts
                    </h1>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-4">
                        <h2 className="text-lg font-medium text-slate-900">
                            Accounts
                        </h2>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            aria-label="Create account"
                            title="New account"
                            onClick={() => setDialog({ type: 'create' })}
                        >
                            <Plus />
                        </Button>
                    </div>
                    {errors?.account && (
                        <p role="alert" className="mb-3 text-sm text-red-700">
                            {errors.account}
                        </p>
                    )}
                    <div className="overflow-hidden rounded border border-slate-200">
                        <div className="grid grid-cols-[minmax(0,1fr)_7rem_8rem_2.25rem] gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                            <span>Account name</span>
                            <span>Type</span>
                            <span className="text-right">Total</span>
                            <span />
                        </div>
                        {accounts.map((account) => (
                            <AccountRow
                                key={account.id}
                                account={account}
                                accountTypes={accountTypes}
                                onUpdate={(selectedAccount) =>
                                    setDialog({
                                        type: 'update',
                                        account: selectedAccount,
                                    })
                                }
                                onDelete={(selectedAccount) =>
                                    setDialog({
                                        type: 'delete',
                                        account: selectedAccount,
                                    })
                                }
                            />
                        ))}
                    </div>
                </div>
            </div>
            <Dialog
                open={dialog !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setDialog(null);
                    }
                }}
            >
                <DialogContent>
                    {dialog?.type === 'create' && (
                        <>
                            <DialogTitle>New account</DialogTitle>
                            <AccountForm
                                accounts={accounts}
                                accountTypes={accountTypes}
                            />
                        </>
                    )}
                    {dialog?.type === 'update' && (
                        <>
                            <DialogTitle>Update account</DialogTitle>
                            <AccountForm
                                key={dialog.account.id}
                                accounts={accounts}
                                accountTypes={accountTypes}
                                account={dialog.account}
                            />
                        </>
                    )}
                    {dialog?.type === 'delete' && (
                        <>
                            <DialogTitle>Delete account</DialogTitle>
                            <DialogDescription>
                                Delete {dialog.account.name}? Its ledger entries
                                will also be permanently deleted. Accounts with
                                child accounts cannot be deleted.
                            </DialogDescription>
                            <form
                                method="post"
                                action={AccountController.destroy.url(
                                    dialog.account.id,
                                )}
                                className="flex justify-end gap-2"
                            >
                                <input
                                    type="hidden"
                                    name="_token"
                                    value={
                                        document
                                            .querySelector(
                                                'meta[name="csrf-token"]',
                                            )
                                            ?.getAttribute('content') ?? ''
                                    }
                                />
                                <input
                                    type="hidden"
                                    name="_method"
                                    value="DELETE"
                                />
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">
                                        Cancel
                                    </Button>
                                </DialogClose>
                                <Button type="submit" variant="destructive">
                                    Delete account
                                </Button>
                            </form>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

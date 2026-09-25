import { Head, Link } from '@inertiajs/react';
import { ChevronDown, ChevronRight, Landmark } from 'lucide-react';
import { useState } from 'react';
import { index as ledgerIndex } from '@/routes/ledger';

type AccountRecord = {
    id: number;
    name: string;
    type: string;
    parent_id: number | null;
    balance: number;
    children: AccountRecord[];
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 2,
});

function AccountRow({
    account,
    depth = 0,
}: {
    account: AccountRecord;
    depth?: number;
}) {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = account.children.length > 0;

    return (
        <div>
            <div className="grid grid-cols-[minmax(0,1fr)_7rem_8rem] items-center gap-3 border-b border-slate-100 py-2 pr-3 text-sm last:border-b-0">
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
                    {account.type}
                </span>
                <span className="text-right text-slate-700 tabular-nums">
                    {currencyFormatter.format(account.balance)}
                </span>
            </div>
            {hasChildren &&
                isExpanded &&
                account.children.map((child) => (
                    <AccountRow
                        key={child.id}
                        account={child}
                        depth={depth + 1}
                    />
                ))}
        </div>
    );
}

export default function AccountsIndex({
    accounts,
    accountTypes,
}: {
    accounts: AccountRecord[];
    accountTypes: string[];
}) {
    return (
        <>
            <Head title="Accounts" />
            <div className="space-y-6 p-6">
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <h1 className="text-2xl font-semibold text-slate-900">
                        Chart of Accounts
                    </h1>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        <h2 className="mb-4 text-lg font-medium text-slate-900">
                            Accounts
                        </h2>
                        <div className="overflow-hidden rounded border border-slate-200">
                            <div className="grid grid-cols-[minmax(0,1fr)_7rem_8rem] gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                <span>Account name</span>
                                <span>Type</span>
                                <span className="text-right">Total</span>
                            </div>
                            {accounts.map((account) => (
                                <AccountRow
                                    key={account.id}
                                    account={account}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        <h2 className="mb-4 text-lg font-medium text-slate-900">
                            New account
                        </h2>
                        <form
                            method="post"
                            action="/accounts"
                            className="space-y-3"
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
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                    Name
                                </label>
                                <input
                                    name="name"
                                    className="w-full rounded border border-slate-300 px-3 py-2"
                                    required
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                    Type
                                </label>
                                <select
                                    name="type"
                                    className="w-full rounded border border-slate-300 px-3 py-2"
                                    defaultValue={accountTypes[0]}
                                >
                                    {accountTypes.map((type) => (
                                        <option key={type} value={type}>
                                            {type}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                    Parent account
                                </label>
                                <select
                                    name="parent_id"
                                    className="w-full rounded border border-slate-300 px-3 py-2"
                                >
                                    <option value="">None</option>
                                    {accounts.map((account) => (
                                        <option
                                            key={account.id}
                                            value={account.id}
                                        >
                                            {account.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <button
                                type="submit"
                                className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                            >
                                Create account
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}

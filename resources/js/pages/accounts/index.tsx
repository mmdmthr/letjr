import { Head, Link } from '@inertiajs/react';
import { index as ledgerIndex } from '@/routes/ledger';

type AccountRecord = {
    id: number;
    name: string;
    type: string;
    parent_id: number | null;
    children: AccountRecord[];
};

export default function AccountsIndex({ accounts, accountTypes }: { accounts: AccountRecord[]; accountTypes: string[] }) {
    return (
        <>
            <Head title="Accounts" />
            <div className="space-y-6 p-6">
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <h1 className="text-2xl font-semibold text-slate-900">Chart of Accounts</h1>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        <h2 className="mb-4 text-lg font-medium text-slate-900">Accounts</h2>
                        <div className="space-y-3">
                            {accounts.map((account) => (
                                <div key={account.id} className="rounded border border-slate-200 p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <Link
                                            href={ledgerIndex({ query: { account: account.id } }).url}
                                            className="font-medium text-slate-800 hover:text-slate-950 hover:underline"
                                        >
                                            {account.name}
                                        </Link>
                                        <span className="text-xs uppercase tracking-wide text-slate-500">{account.type}</span>
                                    </div>
                                    {account.children.length > 0 && (
                                        <div className="mt-3 space-y-2 border-l border-slate-200 pl-3">
                                            {account.children.map((child) => (
                                                <div key={child.id} className="flex items-center justify-between gap-3 text-sm text-slate-600">
                                                    <Link
                                                        href={ledgerIndex({ query: { account: child.id } }).url}
                                                        className="hover:text-slate-950 hover:underline"
                                                    >
                                                        {child.name}
                                                    </Link>
                                                    <span className="text-xs uppercase tracking-wide">{child.type}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        <h2 className="mb-4 text-lg font-medium text-slate-900">New account</h2>
                        <form method="post" action="/accounts" className="space-y-3">
                            <input type="hidden" name="_token" value={document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? ''} />
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
                                <input name="name" className="w-full rounded border border-slate-300 px-3 py-2" required />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
                                <select name="type" className="w-full rounded border border-slate-300 px-3 py-2" defaultValue={accountTypes[0]}>
                                    {accountTypes.map((type) => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Parent account</label>
                                <select name="parent_id" className="w-full rounded border border-slate-300 px-3 py-2">
                                    <option value="">None</option>
                                    {accounts.map((account) => (
                                        <option key={account.id} value={account.id}>{account.name}</option>
                                    ))}
                                </select>
                            </div>
                            <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white">Create account</button>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}

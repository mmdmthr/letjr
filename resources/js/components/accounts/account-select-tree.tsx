import { Fragment, useId } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export type AccountTreeOption = {
    id: number;
    name: string;
    type?: string;
    children: AccountTreeOption[];
};

function findAccount(
    accounts: AccountTreeOption[],
    id: number,
): AccountTreeOption | undefined {
    for (const account of accounts) {
        if (account.id === id) {
            return account;
        }

        const child = findAccount(account.children, id);
        if (child) {
            return child;
        }
    }

    return undefined;
}

function AccountOptions({
    accounts,
    depth = 0,
    excludedIds,
}: {
    accounts: AccountTreeOption[];
    depth?: number;
    excludedIds: Set<number>;
}) {
    return (
        <>
            {accounts.map((account) => (
                <Fragment key={account.id}>
                    {!excludedIds.has(account.id) && (
                        <SelectItem
                            value={String(account.id)}
                            textValue={account.name}
                        >
                            <span aria-hidden="true">
                                {'\u00A0\u00A0'.repeat(depth)}
                            </span>
                            {account.name}
                        </SelectItem>
                    )}

                    <AccountOptions
                        accounts={account.children}
                        depth={depth + 1}
                        excludedIds={excludedIds}
                    />
                </Fragment>
            ))}
        </>
    );
}

export function AccountSelectTree({
    accounts,
    label,
    name,
    rootType,
    value,
    onValueChange,
    emptyLabel = 'None',
    excludedIds = new Set<number>(),
}: {
    accounts: AccountTreeOption[];
    label: string;
    name: string;
    rootType?: string;
    value: string;
    onValueChange: (value: string) => void;
    emptyLabel?: string;
    excludedIds?: Set<number>;
}) {
    const id = useId();
    const roots =
        rootType === undefined
            ? accounts
            : accounts.filter((account) => account.type === rootType);
    const selectedAccount =
        value === 'none' ? undefined : findAccount(accounts, Number(value));

    return (
        <div className="space-y-1">
            <label
                htmlFor={id}
                className="block text-sm font-medium text-slate-700"
            >
                {label}
            </label>
            <input
                type="hidden"
                name={name}
                value={value === 'none' ? '' : value}
            />
            <Select value={value} onValueChange={onValueChange}>
                <SelectTrigger
                    id={id}
                    className="h-auto w-full rounded border-slate-300 px-3 py-2 text-slate-900 shadow-none"
                >
                    <SelectValue>
                        {selectedAccount?.name ?? emptyLabel}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent align="start">
                    <SelectItem value="none">{emptyLabel}</SelectItem>
                    <AccountOptions
                        accounts={roots}
                        excludedIds={excludedIds}
                    />
                </SelectContent>
            </Select>
        </div>
    );
}

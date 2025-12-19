'use client';

import { PayrollItem } from '../types';
import StatusBadge from './StatusBadge';
import React from 'react';

interface Props {
    item: PayrollItem;
    isUpdating: boolean;
    onMarkPaid: (id: string) => void;
    onCopy: (text: string, label: string) => void;
}

function PayrollRow({
    item,
    isUpdating,
    onMarkPaid,
    onCopy,
}: Props) {
    const rel = item.employees;
    const emp = Array.isArray(rel) ? rel[0] : rel;

    return (
        <tr className="border-t border-slate-700">
            <td className="px-3 py-2 text-white">{emp?.name ?? '—'}</td>

            <td className="px-3 py-2 text-xs font-mono text-slate-300">
                {emp?.wallet_address ? (
                    <span className="inline-flex items-center gap-1">
                        {emp.wallet_address.slice(0, 6)}…{emp.wallet_address.slice(-4)}
                        <button
                            onClick={() => onCopy(emp.wallet_address!, 'Wallet copied')}
                        >
                            📋
                        </button>
                    </span>
                ) : '—'}
            </td>

            <td className="px-3 py-2 text-right text-slate-300">{item.amount_usdc}</td>

            <td className="px-3 py-2">
                {item.status === 'pending' ? (
                    <div className="flex gap-2">
                        <StatusBadge status={item.status} />
                        <button
                            onClick={() => onMarkPaid(item.id)}
                            disabled={isUpdating}
                            className="text-xs border px-2 rounded text-blue-100"
                        >
                            Mark as paid
                        </button>
                    </div>
                ) : (
                    <StatusBadge status={item.status} />
                )}
            </td>
            <td className="px-3 py-2 text-xs font-mono text-amber-200">
                {item.tx_hash ? (
                    <span>
                        <a
                            href={`https://basescan.org/tx/${item.tx_hash}`}
                            target="_blank"
                            rel="noreferrer"
                        >
                            {item.tx_hash.slice(0, 10)}…
                        </a>
                        <button
                            onClick={() => onCopy(item.tx_hash!, 'Hash copied')}
                        >
                            📋
                        </button>
                    </span>

                ) : '—'}
            </td>

            <td className="px-3 py-2 text-xs text-slate-400">
                {new Date(item.created_at).toLocaleString()}
            </td>
        </tr>
    );
}

export default React.memo(PayrollRow);

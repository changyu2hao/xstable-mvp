'use client';

import { PayrollItem } from '../types';
import StatusBadge from './StatusBadge';
import React from 'react';

interface Props {
    item: PayrollItem;
    isUpdating: boolean;
    onCheckStatus: (id: string) => void;   // ✅ rename
    onCopy: (text: string, label: string) => void;
}

function PayrollRow({
    item,
    isUpdating,
    onCheckStatus,
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
                <div className="flex items-center gap-2">
                    <StatusBadge status={item.status} />

                    {/* submitted + tx_hash => Check status */}
                    {item.status === "submitted" && item.tx_hash ? (
                        <button
                            onClick={() => onCheckStatus(item.id)}
                            disabled={isUpdating}
                            className="text-xs border px-2 rounded text-blue-100 disabled:opacity-60"
                        >
                            Check status
                        </button>
                    ) : null}

                    {/* created + no tx_hash => Not submitted */}
                    {item.status === "created" && !item.tx_hash ? (
                        <span className="text-xs text-amber-300">Not submitted</span>
                    ) : null}

                    {/* 可选：如果出现异常数据（比如 created 但有 tx_hash），给个提示 */}
                    {item.status === "created" && item.tx_hash ? (
                        <span className="text-xs text-amber-300">Has tx but not submitted</span>
                    ) : null}
                </div>
            </td>


            <td className="px-3 py-2 text-xs font-mono text-amber-200">
                {item.tx_hash ? (
                    <span>
                        <a
                            href={`https://sepolia.basescan.org/tx/${item.tx_hash}`}
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

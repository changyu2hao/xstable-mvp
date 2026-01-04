'use client';

import React from 'react';
import { PayrollItem } from '../types';
import StatusBadge from './StatusBadge';

interface Props {
  item: PayrollItem;
  isUpdating: boolean;
  onPay: (id: string) => void;
  onCheckStatus: (id: string) => void;
  onCopy: (text: string, label: string) => void;
}

function PayrollRow({
  item,
  isUpdating,
  onPay,
  onCheckStatus,
  onCopy,
}: Props) {
  const rel = item.employees;
  const emp = Array.isArray(rel) ? rel[0] : rel;

  // CLAIM:* placeholder detection
  const isClaim =
    typeof item.tx_hash === 'string' && item.tx_hash.startsWith('CLAIM:');

  return (
    <tr className="border-t border-slate-700">
      {/* Employee */}
      <td className="px-3 py-2 text-white">
        {emp?.name ?? '—'}
      </td>

      {/* Wallet */}
      <td className="px-3 py-2 text-xs font-mono text-slate-300">
        {emp?.wallet_address ? (
          <span className="inline-flex items-center gap-1">
            {emp.wallet_address.slice(0, 6)}…
            {emp.wallet_address.slice(-4)}
            <button
              onClick={() =>
                onCopy(emp.wallet_address!, 'Wallet copied')
              }
            >
              📋
            </button>
          </span>
        ) : (
          '—'
        )}
      </td>

      {/* Amount */}
      <td className="px-3 py-2 text-right text-slate-300">
        {item.amount_usdc}
      </td>

      {/* Status + Actions */}
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <StatusBadge status={item.status} />

          {/* created + no tx_hash => Pay */}
          {item.status === 'created' && !item.tx_hash && (
            <button
              onClick={() => onPay(item.id)}
              disabled={isUpdating}
              className="text-xs border px-2 py-1 rounded
                         bg-emerald-600/20 text-emerald-100
                         border-emerald-500/40
                         hover:bg-emerald-600/30
                         disabled:opacity-60"
            >
              Pay
            </button>
          )}

          {/* submitted + tx_hash => Check status */}
          {item.status === 'submitted' && item.tx_hash && !isClaim && (
            <button
              onClick={() => onCheckStatus(item.id)}
              disabled={isUpdating}
              className="text-xs border px-2 py-1 rounded
                         text-blue-100 border-blue-400/40
                         hover:bg-blue-500/10
                         disabled:opacity-60"
            >
              Check status
            </button>
          )}

          {/* CLAIM in progress */}
          {item.status === 'created' && isClaim && (
            <span className="text-xs text-amber-300">
              Processing…
            </span>
          )}
        </div>
      </td>

      {/* Tx */}
      <td className="px-3 py-2 text-xs font-mono text-amber-200">
        {item.tx_hash && !isClaim ? (
          <span className="inline-flex items-center gap-1">
            <a
              href={`https://sepolia.basescan.org/tx/${item.tx_hash}`}
              target="_blank"
              rel="noreferrer"
              className="hover:underline"
            >
              {item.tx_hash.slice(0, 10)}…
            </a>
            <button
              onClick={() =>
                onCopy(item.tx_hash!, 'Hash copied')
              }
            >
              📋
            </button>
          </span>
        ) : (
          '—'
        )}
      </td>

      {/* Time */}
      <td className="px-3 py-2 text-xs text-slate-400">
        {new Date(item.created_at).toLocaleString()}
      </td>
    </tr>
  );
}

export default React.memo(PayrollRow);

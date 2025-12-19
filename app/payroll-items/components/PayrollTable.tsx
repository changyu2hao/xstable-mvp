'use client';

import PayrollRow from './PayrollRow';
import { PayrollItem } from '../types';

interface Props {
  items: PayrollItem[];
  loading: boolean;
  sortKey: 'created_at' | 'amount_usdc' | 'employee_name';
  sortDir: 'asc' | 'desc';
  toggleSort: (key: 'created_at' | 'amount_usdc' | 'employee_name') => void;
  onMarkPaid: (id: string) => void;
  onCopy: (text: string, label?: string) => void;
  creating: boolean;
}

export default function PayrollTable({
  items,
  loading,
  sortKey,
  sortDir,
  toggleSort,
  onMarkPaid,
  onCopy,
  creating,
}: Props) {
  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden bg-slate-900">
      <table className="w-full text-sm">
        <thead className="bg-slate-800 text-slate-200">
          <tr>
            <th className="px-3 py-2 text-left">
              <button
                type="button"
                onClick={() => toggleSort('employee_name')}
                className="inline-flex items-center gap-1 hover:underline"
              >
                Employee
                {sortKey === 'employee_name'
                  ? sortDir === 'asc'
                    ? ' ▲'
                    : ' ▼'
                  : ''}
              </button>
            </th>

            <th className="px-3 py-2 text-left">Wallet</th>

            <th className="px-3 py-2 text-right">
              <button
                type="button"
                onClick={() => toggleSort('amount_usdc')}
                className="inline-flex items-center gap-1 hover:underline"
              >
                Amount
                {sortKey === 'amount_usdc'
                  ? sortDir === 'asc'
                    ? ' ▲'
                    : ' ▼'
                  : ''}
              </button>
            </th>

            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-left">Tx</th>

            <th className="px-3 py-2 text-left">
              <button
                type="button"
                onClick={() => toggleSort('created_at')}
                className="inline-flex items-center gap-1 hover:underline"
              >
                Time
                {sortKey === 'created_at'
                  ? sortDir === 'asc'
                    ? ' ▲'
                    : ' ▼'
                  : ''}
              </button>
            </th>
          </tr>
        </thead>

        <tbody>
          {loading && (
            <tr>
              <td colSpan={6} className="px-3 py-4 text-center text-slate-400">
                Loading...
              </td>
            </tr>
          )}

          {!loading && items.length === 0 && (
            <tr>
              <td colSpan={6} className="px-3 py-4 text-center text-slate-400">
                No payroll items yet.
              </td>
            </tr>
          )}

          {!loading &&
            items.map((item) => (
              <PayrollRow
                key={item.id}
                item={item}
                isUpdating={creating}
                onMarkPaid={onMarkPaid}
                onCopy={onCopy}
              />
            ))}
        </tbody>
      </table>
    </div>
  );
}

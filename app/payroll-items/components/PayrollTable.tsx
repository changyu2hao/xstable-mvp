'use client';
import { useMemo, useState, useEffect } from 'react';
import PayrollRow from './PayrollRow';
import { PayrollItem } from '../types';


interface Props {
  items: PayrollItem[];
  loading: boolean;
  sortKey: 'created_at' | 'amount_usdc' | 'employee_name';
  sortDir: 'asc' | 'desc';
  toggleSort: (key: 'created_at' | 'amount_usdc' | 'employee_name') => void;
  onCheckStatus: (id: string) => void;
  onPay: (id: string) => void;
  onCopy: (text: string, label?: string) => void;
  creating: boolean;
  updatingId: string | null;
}

export default function PayrollTable({
  items,
  loading,
  sortKey,
  sortDir,
  onPay,
  toggleSort,
  onCheckStatus,
  onCopy,
  updatingId,
  creating,
}: Props) {
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return items.slice(start, end);
  }, [items, page]);
  useEffect(() => {
    setPage(1);
  }, [sortKey, sortDir]);
  const startNum = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endNum = total === 0 ? 0 : Math.min(page * PAGE_SIZE, total);


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
            paginatedItems.map((item) => (
              <PayrollRow
                key={item.id}
                item={item}
                isUpdating={updatingId === item.id}
                onCheckStatus={onCheckStatus}
                onPay={onPay}
                onCopy={onCopy}
              />
            ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-400">
        <div>
          Showing{" "}
          <span className="font-medium text-slate-200">
            {startNum}
          </span>
          –
          <span className="font-medium text-slate-200">
            {endNum}
          </span>{" "}
          of{" "}
          <span className="font-medium text-slate-200">{total}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded border border-slate-700 px-2 py-1 disabled:opacity-40 hover:bg-slate-800"
          >
            Prev
          </button>

          <span>
            Page{" "}
            <span className="font-medium text-slate-200">{page}</span> /{" "}
            <span className="font-medium text-slate-200">{totalPages}</span>
          </span>

          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded border border-slate-700 px-2 py-1 disabled:opacity-40 hover:bg-slate-800"
          >
            Next
          </button>
        </div>
      </div>

    </div>
  );
}

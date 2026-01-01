'use client';

export default function PayrollHeader(props: {
  batchId: string;
  totalAmount: string;
  createdCount: number;
  submittedCount: number;
  paidCount: number;
  failedCount: number;

  statusFilter: 'all' | 'created' | 'submitted' | 'paid' | 'failed';
  q: string;

  updatingAll: boolean;
  disableMarkAll: boolean;

  onChangeStatus: (v: 'all' | 'created' | 'submitted' | 'paid' | 'failed') => void;
  onChangeQuery: (v: string) => void;

  onExportCsv: () => void;
  onResetSort: () => void;
  onConfirmAllSubmitted: () => void;
}) {
  const {
    batchId,
    totalAmount,
    createdCount,
    submittedCount,
    paidCount,
    failedCount,
    statusFilter,
    q,
    updatingAll,
    disableMarkAll,
    onChangeStatus,
    onChangeQuery,
    onExportCsv,
    onResetSort,
    onConfirmAllSubmitted,
  } = props;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm text-slate-600">Batch ID</div>
          <div className="text-xs break-all text-slate-900">{batchId}</div>
        </div>

        <div>
          <div className="text-sm text-slate-600">Total (USDC)</div>
          <div className="text-2xl font-semibold text-slate-900 tabular-nums min-w-[6rem] text-right">
            {totalAmount}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex gap-3 text-xs text-slate-700 tabular-nums">
            <span>Created: <strong>{createdCount}</strong></span>
            <span>Submitted: <strong>{submittedCount}</strong></span>
            <span>Paid: <strong>{paidCount}</strong></span>
            <span>Failed: <strong>{failedCount}</strong></span>
          </div>

          <button
            onClick={onConfirmAllSubmitted}
            disabled={updatingAll || disableMarkAll}
            className="px-3 py-1.5 rounded bg-emerald-500 text-slate-950 text-sm disabled:opacity-60"
          >
            {updatingAll ? 'Updating...' : 'Check all statuses'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => onChangeStatus(e.target.value as any)}
          className="border border-slate-600 rounded bg-slate-800 text-slate-100 px-2 py-1 text-sm"
        >
          <option value="all">All</option>
          <option value="created">Created</option>
          <option value="submitted">Submitted</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
        </select>

        <input
          value={q}
          onChange={(e) => onChangeQuery(e.target.value)}
          placeholder="Search employee / wallet"
          className="border border-slate-600 rounded bg-slate-800 text-slate-100 px-2 py-1 text-sm w-64"
        />

        <button
          onClick={onExportCsv}
          className="px-3 py-1.5 rounded bg-slate-200 text-slate-950 text-sm"
        >
          Export CSV
        </button>

        <button
          onClick={onResetSort}
          className="px-3 py-1.5 rounded border border-slate-600 bg-red-500 text-slate-200 text-sm hover:bg-slate-700"
        >
          Reset sort
        </button>
      </div>
    </div>
  );
}

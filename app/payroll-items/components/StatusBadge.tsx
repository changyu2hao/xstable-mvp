import { PayrollItem } from '../types';

export default function StatusBadge({ status }: {
  status: PayrollItem['status'];
}) {
  if (status === 'paid') {
    return (
      <span className="inline-flex px-2 py-0.5 rounded
                       bg-emerald-900/40 text-emerald-300 text-xs
                       border border-emerald-600">
        ✓ Paid
      </span>
    );
  }

  if (status === 'failed') {
    return (
      <span className="inline-flex px-2 py-0.5 rounded
                       bg-red-900/40 text-red-300 text-xs
                       border border-red-600">
        ✕ Failed
      </span>
    );
  }

  if (status === 'submitted') {
    return (
      <span className="inline-flex px-2 py-0.5 rounded
                       bg-blue-900/30 text-blue-200 text-xs
                       border border-blue-600">
        → Submitted
      </span>
    );
  }

  if (status === 'created') {
    return (
      <span className="inline-flex px-2 py-0.5 rounded
                       bg-yellow-900/40 text-yellow-300 text-xs
                       border border-yellow-600">
        ⏳ Created
      </span>
    );
  }

  return (
    <span className="inline-flex px-2 py-0.5 rounded
                     bg-slate-800/40 text-slate-300 text-xs
                     border border-slate-600">
      ? Unknown
    </span>
  );
}

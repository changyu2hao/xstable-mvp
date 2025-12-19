'use client';

import React from 'react';
import { Employee } from '../types';

type Props = {
  employees: Employee[];
  creating: boolean;
  error: string | null;
  employeeId: string;
  amount: string;
  onChangeEmployeeId: (v: string) => void;
  onChangeAmount: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
};

export default function AddPayrollItemForm({
  employees,
  creating,
  error,
  employeeId,
  amount,
  onChangeEmployeeId,
  onChangeAmount,
  onSubmit,
}: Props) {
  return (
    <form
      onSubmit={onSubmit}
      className="border border-slate-700 rounded-lg p-4 bg-slate-900 space-y-3"
    >
      <h2 className="font-medium text-slate-100">Add payroll item</h2>

      <div className="space-y-1">
        <label className="text-sm text-slate-200">Employee</label>
        <select
          className="w-full border border-slate-600 rounded bg-slate-800 text-slate-100 px-2 py-1 text-sm"
          value={employeeId}
          onChange={(e) => onChangeEmployeeId(e.target.value)}
        >
          <option value="">Select employee</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name} ({emp.wallet_address.slice(0, 6)}…{emp.wallet_address.slice(-4)})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-200">Amount (USDC)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          className="w-full border border-slate-600 rounded bg-slate-800 text-slate-100 px-2 py-1 text-sm"
          value={amount}
          onChange={(e) => onChangeAmount(e.target.value)}
          placeholder="e.g. 1000"
        />
      </div>

      {error && <div className="text-sm text-red-400">{error}</div>}

      <button
        type="submit"
        disabled={creating}
        className="px-3 py-1.5 rounded bg-emerald-500 text-slate-950 text-sm disabled:opacity-60"
      >
        {creating ? 'Creating...' : 'Add item'}
      </button>
    </form>
  );
}

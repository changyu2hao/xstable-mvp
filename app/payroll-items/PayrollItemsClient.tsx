'use client';

import { useCallback, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Toast from './components/Toast';
import PayrollHeader from './components/PayrollHeader';
import AddPayrollItemForm from './components/AddPayrollItemForm';
import usePayrollItems from './hooks/usePayrollItems';
import usePayrollFilters from './hooks/usePayrollFilters';
import PayrollTable from './components/PayrollTable';

/* =========================
   组件主体
========================= */

export default function PayrollItemsClient() {
  const searchParams = useSearchParams();
  const batchId = searchParams?.get('batchId');
  const companyId = searchParams?.get('companyId');

  const [toast, setToast] = useState<string | null>(null);

  const [employeeId, setEmployeeId] = useState('');
  const [amount, setAmount] = useState('');

  if (!batchId) {
    return (
      <div className="p-4 border border-red-500 rounded bg-red-950/30">
        <p className="text-red-400 mb-2">
          Missing <code>batchId</code> in URL.
        </p>
        <p className="text-xs text-slate-400">
          Current search params: {searchParams?.toString() || '(empty)'}
        </p>
      </div>
    );
  }

  const {
    items,
    employees,
    loading,
    error,
    setError,
    creating,
    updatingAll,
    createItem,
    checkStatus,
    payItem,
    updatingId,
    confirmAllSubmitted,
  } = usePayrollItems({
    batchId,
  });


  const {
    statusFilter,
    q,
    sortKey,
    sortDir,
    setStatusFilter,
    setQ,
    toggleSort,
    resetSort,
    filteredItems,
  } = usePayrollFilters(items);

  /* =========================
     新增发薪明细
  ========================= */
  const copyToClipboard = useCallback(
    (text: string, label = 'Copied') => {
      navigator.clipboard.writeText(text);
      setToast(label);

      setTimeout(() => {
        setToast(null);
      }, 1500);
    },
    [] // setToast 是 stable，不用放
  );


  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeId || !amount) return;

    const amountNumber = Number(amount);
    if (Number.isNaN(amountNumber) || amountNumber <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    await createItem(employeeId, amountNumber);

    setEmployeeId('');
    setAmount('');
  }

  function exportCsv() {
    // 1) 基于你当前过滤后的数据导出
    const rows = filteredItems.map((item) => {
      const rel = item.employees;
      const emp = Array.isArray(rel) ? rel[0] : rel;

      return {
        employee_name: emp?.name ?? '',
        wallet_address: emp?.wallet_address ?? '',
        amount_usdc: item.amount_usdc ?? '',
        status: item.status ?? '',
        tx_hash: item.tx_hash ?? '',
        created_at: item.created_at ?? '',
        batch_id: batchId ?? '',
        company_id: companyId ?? '',
      };
    });

    // 2) Summary（基于 filteredItems，不是 items）
    const summaryTotal = filteredItems.reduce(
      (sum, it) => sum + Number(it.amount_usdc ?? 0),
      0
    );
    const summaryCreated = filteredItems.filter((it) => it.status === 'created').length;
    const summarySubmitted = filteredItems.filter((it) => it.status === 'submitted').length;
    const summaryPaid = filteredItems.filter((it) => it.status === 'paid').length;
    const summaryFailed = filteredItems.filter((it) => it.status === 'failed').length;

    // 3) 生成 CSV（在最上面放 Summary）
    const headers = Object.keys(
      rows[0] ?? {
        employee_name: '',
        wallet_address: '',
        amount_usdc: '',
        status: '',
        tx_hash: '',
        created_at: '',
        batch_id: '',
        company_id: '',
      }
    );

    // 工具：CSV 安全转义
    const toCsvCell = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    const summaryLines = [
      `Summary`,
      `Item Count,${filteredItems.length}`,
      `Total Amount (USDC),${summaryTotal.toFixed(2)}`,
      `Created Count,${summaryCreated}`,
      `Submitted Count,${summarySubmitted}`,
      `Paid Count,${summaryPaid}`,
      `Failed Count,${summaryFailed}`,
      `Exported At,${new Date().toISOString()}`,
    ].join('\n');


    const dataLines = [
      headers.join(','),
      ...rows.map((r) =>
        headers.map((h) => toCsvCell((r as any)[h])).join(',')
      ),
    ].join('\n');

    const csv = `${dataLines}\n\n${summaryLines}`;

    // 4) 下载
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    const safeStatus = statusFilter ?? 'all';
    a.href = url;
    a.download = `payroll_items_${batchId}_${safeStatus}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }


  const totalAmount = items.reduce(
    (sum, item) => sum + Number(item.amount_usdc ?? 0),
    0
  );

  const formattedTotal = totalAmount.toFixed(2);

  const createdCount = items.filter((it) => it.status === 'created').length;
  const submittedCount = items.filter((it) => it.status === 'submitted').length;
  const paidCount = items.filter((it) => it.status === 'paid').length;
  const failedCount = items.filter((it) => it.status === 'failed').length;

  /* =========================
     UI 渲染
  ========================= */

  return (
    <div className="space-y-6">
      {/* 顶部信息 */}
      {/* 顶部信息：两行布局，避免拥挤 */}
      <PayrollHeader
        batchId={batchId}
        totalAmount={formattedTotal}
        createdCount={createdCount}
        submittedCount={submittedCount}
        paidCount={paidCount}
        failedCount={failedCount}
        statusFilter={statusFilter}
        q={q}
        updatingAll={updatingAll}
        disableMarkAll={submittedCount === 0}
        onChangeStatus={setStatusFilter}
        onChangeQuery={setQ}
        onExportCsv={exportCsv}
        onResetSort={resetSort}
        onConfirmAllSubmitted={confirmAllSubmitted}
      />

      {/* 新增明细表单 */}
      <AddPayrollItemForm
        employees={employees}
        creating={creating}
        error={error}
        employeeId={employeeId}
        amount={amount}
        onChangeEmployeeId={setEmployeeId}
        onChangeAmount={setAmount}
        onSubmit={handleCreate}
      />

      {/* 列表 */}
      <PayrollTable
        items={filteredItems}
        loading={loading}
        sortKey={sortKey}
        sortDir={sortDir}
        toggleSort={toggleSort}
        onCheckStatus={checkStatus}
        onCopy={copyToClipboard}
        onPay={payItem}
        creating={creating}
        updatingId={updatingId}
      />
      {/* ⭐ Toast：放在最外层 div 的最后 */}
      <Toast message={toast} />
    </div>
  );
}

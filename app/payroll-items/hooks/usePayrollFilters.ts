'use client';

import { useCallback, useMemo, useState } from 'react';
import type { PayrollItem } from '../types';

type StatusFilter = 'all' | 'pending' | 'paid' | 'failed';
type SortKey = 'created_at' | 'amount_usdc' | 'employee_name';
type SortDir = 'asc' | 'desc';

function getEmployeeName(item: PayrollItem) {
  const rel = item.employees;
  const emp = Array.isArray(rel) ? rel[0] : rel;
  return (emp?.name ?? '').toLowerCase();
}

function getEmployeeWallet(item: PayrollItem) {
  const rel = item.employees;
  const emp = Array.isArray(rel) ? rel[0] : rel;
  return (emp?.wallet_address ?? '').toLowerCase();
}

export default function usePayrollFilters(items: PayrollItem[]) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [q, setQ] = useState('');

  // ✅ 合并成一个 state，避免嵌套 setState
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: 'created_at',
    dir: 'desc',
  });

  const filteredItems = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    const { key, dir } = sort;
    const direction = dir === 'asc' ? 1 : -1;

    return items
      .filter((item) => {
        if (statusFilter !== 'all' && item.status !== statusFilter) return false;

        if (qLower) {
          const text = `${getEmployeeName(item)} ${getEmployeeWallet(item)}`;
          if (!text.includes(qLower)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (key === 'amount_usdc') {
          return (Number(a.amount_usdc ?? 0) - Number(b.amount_usdc ?? 0)) * direction;
        }

        if (key === 'employee_name') {
          return getEmployeeName(a).localeCompare(getEmployeeName(b)) * direction;
        }

        // created_at
        return (
          (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * direction
        );
      });
  }, [items, statusFilter, q, sort]);

  const toggleSort = useCallback((key: SortKey) => {
    setSort((prev) => {
      // 同一列：翻转方向
      if (prev.key === key) {
        return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      }
      // 切换列：created_at 默认 desc，其它默认 asc
      return { key, dir: key === 'created_at' ? 'desc' : 'asc' };
    });
  }, []);

  const resetSort = useCallback(() => {
    setSort({ key: 'created_at', dir: 'desc' });
  }, []);

  return {
    statusFilter,
    q,
    sortKey: sort.key,
    sortDir: sort.dir,
    setStatusFilter,
    setQ,
    toggleSort,
    resetSort,
    filteredItems,
  };
}

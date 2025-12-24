'use client';

import { useCallback, useEffect, useState } from 'react';
import { Employee, PayrollItem } from '../types';

type Args = {
  batchId: string;
  companyId: string | null;
};

export default function usePayrollItems({ batchId, companyId }: Args) {
  const [items, setItems] = useState<PayrollItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const [creating, setCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updatingAll, setUpdatingAll] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1) server-only items
      const res = await fetch(`/api/admin/payroll-items?batchId=${batchId}`, {
        method: "GET",
        credentials: "include",
      });

      // 2) employees list (for dropdown)
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load payroll items");
      setItems(json.items ?? []);
      setEmployees(json.employees ?? []); // ⭐关键
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Failed to load payroll items");
    } finally {
      setLoading(false);
    }
  }, [batchId]);


  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createItem = useCallback(
    async (employeeId: string, amountNumber: number) => {
      setCreating(true);
      setError(null);

      try {
        const res = await fetch("/api/admin/payroll-items", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            batchId,
            employeeId,
            amountUsdc: amountNumber,
          }),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error ?? "Failed to create payroll item");
        }

        await fetchData();
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? "Failed to create payroll item");
        throw e;
      } finally {
        setCreating(false);
      }
    },
    [batchId, fetchData]
  );

  const markPaid = useCallback(
    async (itemId: string) => {
      setUpdatingId(itemId);
      setError(null);

      try {
        const res = await fetch(`/api/admin/payroll-items/${encodeURIComponent(itemId)}/mark-paid`, {
          method: "POST",
          credentials: "include",
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error ?? "Failed to mark paid");
        }

        await fetchData();
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? "Failed to update payroll item status");
      } finally {
        setUpdatingId(null);
      }
    },
    [fetchData]
  );


  const markAllPaid = useCallback(async () => {
    setUpdatingAll(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/payroll-items/mark-all-paid", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed");

      setItems(json.items ?? []);


      // 或者乐观更新（更快，但先不建议，等你确认没坑再做）
      // setItems(prev => prev.map(it => it.status === "pending" ? { ...it, status: "paid", paid_at: json.paid_at ?? it.paid_at } : it));
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Failed to mark all as paid");
    } finally {
      setUpdatingAll(false);
    }
  }, [batchId, fetchData]);

  return {
    items,
    employees,
    loading,
    error,
    setError,

    creating,
    updatingId,
    updatingAll,

    refetch: fetchData,
    createItem,
    markPaid,
    markAllPaid,
  };
}

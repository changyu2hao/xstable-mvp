'use client';

import { useCallback, useEffect, useState } from 'react';
import { Employee, PayrollItem } from '../types';

type Args = {
  batchId: string;
};

export default function usePayrollItems({ batchId }: Args) {
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
      const text = await res.text();
      let json: any = null;
      try { json = text ? JSON.parse(text) : null; } catch { }

      if (!res.ok) {
        throw new Error(json?.error ?? json?.detail ?? text ?? `Failed (${res.status})`);
      }
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

  // useEffect(() => {
  //   const submittedItems = items.filter(i => i.status === "submitted" && i.tx_hash);

  //   if (submittedItems.length === 0) return;
  //   const timer = setInterval(async () => {
  //     for (const it of submittedItems) {
  //       await fetch(`/api/admin/payroll-items/${it.id}/confirm`, {
  //         method: "POST",
  //         credentials: "include",
  //       });
  //     }

  //     await fetchData(); // ✅ 用 hook 内部的 fetchData
  //   }, 10000); // 10 秒轮询

  //   return () => clearInterval(timer);
  // }, [items, fetchData]);


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

        const text = await res.text();
        const json = text ? JSON.parse(text) : null;

        if (!res.ok) {
          // 把后端 detail/message 也展示出来
          throw new Error(
            json?.error ??
            json?.message ??
            json?.detail ??
            `Failed to create payroll item (${res.status})`
          );
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

  const checkStatus = useCallback(async (itemId: string) => {
    setUpdatingId(itemId);
    setError(null);

    try {
      const res = await fetch(`/api/admin/payroll-items/${encodeURIComponent(itemId)}/confirm`, {
        method: "POST",
        credentials: "include",
      });

      const text = await res.text();
      let json: any = null;
      try { json = text ? JSON.parse(text) : null; } catch { }

      if (!res.ok) {
        throw new Error(json?.error ?? json?.detail ?? text ?? "Failed to confirm");
      }

      await fetchData();
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Failed to check status");
    } finally {
      setUpdatingId(null);
    }
  }, [fetchData]);

  const confirmAllSubmitted = useCallback(async () => {
  setUpdatingAll(true);
  setError(null);

  try {
    const toConfirm = items.filter(i => i.status === "submitted" && i.tx_hash);

    for (const it of toConfirm) {
      await fetch(`/api/admin/payroll-items/${encodeURIComponent(it.id)}/confirm`, {
        method: "POST",
        credentials: "include",
      });
    }

    await fetchData();
  } catch (e: any) {
    console.error(e);
    setError(e?.message ?? "Failed to confirm all submitted");
  } finally {
    setUpdatingAll(false);
  }
}, [items, fetchData]);

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
    checkStatus,
    confirmAllSubmitted
  };
}

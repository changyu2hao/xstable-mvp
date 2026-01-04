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

      // 4xx / 5xx（现在只有 4xx 会出现）=> 真错误
      if (!res.ok) {
        setError(json?.error ?? json?.detail ?? text ?? "Failed to confirm");
        return;
      }

      // ✅ 200 but ok:false + retryable:true => 软失败，不显示红字
      if (json?.ok === false && json?.retryable) {
        // 你如果有 toast，就在这里 toast；没有就先用 error 但不红也行
        // setToast?.("RPC busy, try again"); // 如果你愿意把 setToast 传进 hook
        console.warn("RPC busy, try again:", json?.detail);
        return;
      }

      await fetchData();
    } catch (e: any) {
      console.error(e);
      // 这里也改成“软失败”
      setError(null);
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

  // inside usePayrollItems.ts

  const payItem = useCallback(async (itemId: string) => {
    setUpdatingId(itemId);
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/payroll-items/${encodeURIComponent(itemId)}/pay`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      const text = await res.text();
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch { }

      // ✅ 只有“真正客户端错误”才会出现非 200（401/403/404/400）
      if (!res.ok) {
        setError(json?.error ?? json?.detail ?? text ?? "Failed to pay");
        return;
      }

      // ✅ 200 but ok:false => 温柔失败：不显示红字（你目前没 toast，就先 console.warn）
      if (json?.ok === false) {
        if (json?.retryable) {
          console.warn("RPC busy, try again:", json?.detail ?? json);
          // 不 setError（避免红字），也不 throw
          return;
        }

        // 非 retryable 的业务失败（比如 NOT_PAYABLE / NO_WALLET / INSUFFICIENT_BALANCE）
        // 这类你可以显示成 error（但它是可解释的，不是系统炸）
        setError(json?.detail ?? json?.error ?? json?.reason ?? "Pay failed");
        return;
      }

      // ok:true -> 刷新数据
      await fetchData();
    } catch (e: any) {
      console.error(e);
      // ✅ 网络异常也软失败：不红字（你要红字就改成 setError）
      setError(null);
    } finally {
      setUpdatingId(null);
    }
  }, [fetchData]);


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
    payItem,
    checkStatus,
    confirmAllSubmitted
  };
}

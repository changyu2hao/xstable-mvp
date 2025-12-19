'use client';

import { useCallback, useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Employee, PayrollItem } from '../types';

type Args = {
  batchId: string;
  companyId: string | null;
};
const supabase = createSupabaseBrowserClient();

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
      const { data: itemData, error: itemErr } = await supabase
        .from('payroll_items')
        .select(
          `
          id,
          amount_usdc,
          status,
          tx_hash,
          created_at,
          employees (
            id,
            name,
            wallet_address
          )
        `
        )
        .eq('batch_id', batchId)
        .order('created_at', { ascending: true });

      if (itemErr) throw new Error(itemErr.message);

      setItems(((itemData ?? []) as unknown) as PayrollItem[]);

      if (companyId) {
        const { data: empData, error: empErr } = await supabase
          .from('employees')
          .select('id, name, wallet_address')
          .eq('company_id', companyId)
          .order('created_at', { ascending: true });

        if (empErr) throw new Error(empErr.message);

        setEmployees((empData ?? []) as Employee[]);
      } else {
        setEmployees([]);
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? 'Failed to load payroll items');
    } finally {
      setLoading(false);
    }
  }, [batchId, companyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createItem = useCallback(
    async (employeeId: string, amountNumber: number) => {
      setCreating(true);
      setError(null);
      try {
        const { error: insertErr } = await supabase.from('payroll_items').insert({
          batch_id: batchId,
          employee_id: employeeId,
          amount_usdc: amountNumber,
        });

        if (insertErr) throw new Error(insertErr.message);

        await fetchData();
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? 'Failed to create payroll item');
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
        const { error: updateErr } = await supabase
          .from('payroll_items')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(), // ✅ 关键
            tx_hash: '0xFAKE_TX_' + crypto.randomUUID().replace(/-/g, ''),
          })
          .eq('id', itemId);

        if (updateErr) throw new Error(updateErr.message);

        await fetchData();
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? 'Failed to update payroll item status');
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
      const pendingIds = items.filter((it) => it.status === 'pending').map((it) => it.id);
      if (pendingIds.length === 0) return;

      const { error: updateErr } = await supabase
        .from('payroll_items')
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
        })
        .in('id', pendingIds);

      if (updateErr) throw new Error(updateErr.message);

      // 本地更新即可（更快）
      setItems((prev) => prev.map((it) => (it.status === 'pending' ? { ...it, status: 'paid' } : it)));
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? 'Failed to mark all as paid');
    } finally {
      setUpdatingAll(false);
    }
  }, [items]);

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

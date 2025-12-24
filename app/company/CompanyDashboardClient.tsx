"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CompanyCreateForm from "./CompanyCreateForm";

type Company = {
  id: string;
  name: string;
  owner_email: string | null;
  created_at: string | null;
  owner_user_id: string | null;
};

export default function CompanyDashboardClient() {
  const [data, setData] = useState<Company[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function refetchCompanies() {
    const res = await fetch("/api/admin/companies", { credentials: "include" });
    const text = await res.text();
    const json = text ? JSON.parse(text) : null;
    if (!res.ok) throw new Error(json?.error ?? `Failed (${res.status})`);
    setData(json.companies ?? []);
  }

  useEffect(() => {
    async function run() {
      setErrorMsg(null);
      const res = await fetch("/api/admin/companies", {
        credentials: "include",
      });
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;
      if (!res.ok) {
        setErrorMsg(json?.error ?? `Failed (${res.status})`);
        setData([]);
        return;
      }
      setData(json?.companies ?? []);
    }
    run();
  }, []);


  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Company Portal</h1>
      <p className="text-black-300">Companies registered in the system (MVP demo):</p>

      <CompanyCreateForm onCreated={refetchCompanies} />

      {errorMsg ? (
        <div className="rounded border border-rose-900/60 bg-rose-950/40 p-3 text-rose-200 text-sm">
          {errorMsg}
        </div>
      ) : null}

      <div className="space-y-2">
        {data.length > 0 ? (
          data.map((company) => (
            <Link
              key={company.id}
              href={`/company-detail?companyId=${company.id}`}
              className="block rounded border border-slate-700 bg-slate-800 p-4 hover:border-emerald-400"
            >
              <p className="text-lg font-medium text-slate-200">{company.name}</p>
              <p className="text-sm text-slate-400">{company.owner_email || "No owner email"}</p>
              <p className="text-xs text-slate-500">
                Created at:{" "}
                {company.created_at ? new Date(company.created_at).toLocaleString() : "-"}
              </p>
            </Link>
          ))
        ) : (
          <p className="text-slate-400">No companies found.</p>
        )}
      </div>
    </div>
  );
}

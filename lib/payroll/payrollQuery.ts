import { z } from "zod";

export const PayrollQuerySchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  status: z.enum(["all", "paid", "unpaid"]).optional().default("all"),

  sort: z.enum(["employee", "amount", "time"]).optional().default("time"),
  dir: z.enum(["asc", "desc"]).optional().default("desc"),

  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(5).max(200).optional().default(25),
});

export type PayrollQuery = z.infer<typeof PayrollQuerySchema>;

export function parsePayrollSearchParams(
  searchParams: Record<string, string | string[] | undefined>
): PayrollQuery {
  const flat: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(searchParams)) {
    flat[k] = Array.isArray(v) ? v[0] : v;
  }
  const result = PayrollQuerySchema.safeParse(flat);
  return result.success ? result.data : PayrollQuerySchema.parse({});
}

export function toSearchParams(q: PayrollQuery) {
  const sp = new URLSearchParams();
  if (q.q) sp.set("q", q.q);
  if (q.status !== "all") sp.set("status", q.status);

  if (q.sort !== "time") sp.set("sort", q.sort);
  if (q.dir !== "desc") sp.set("dir", q.dir);

  if (q.page !== 1) sp.set("page", String(q.page));
  if (q.pageSize !== 25) sp.set("pageSize", String(q.pageSize));

  return sp;
}

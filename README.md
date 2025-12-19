# XStable Payroll (MVP)

**XStable Payroll** is an MVP payroll system designed to explore **secure, server-first payroll workflows** using **Next.js App Router + Supabase**, with a future path toward **USDC / on-chain payroll**.

This repository represents the project up to **Phase 2 (Security & Employee Payslip)**.

---

## 🚀 Tech Stack

### Frontend / App
- **Next.js** (App Router)
- **React** (Client & Server Components)
- **TypeScript**
- **Tailwind CSS**

### Backend / Infra
- **Supabase** (Auth, Postgres, RLS)
- **Supabase SSR** (`@supabase/ssr`)
- **Row Level Security (RLS)**

### Documents
- **pdf-lib** (server-only PDF generation)

---

## 🎯 Project Goals
- Build a **realistic payroll MVP**, not just a demo UI
- Enforce **strict permission boundaries** (owner vs employee)
- Ensure **all sensitive operations are server-only**
- Prepare for future **on-chain payroll integration**

---

## 📦 Core Features (Current)

### ✅ Authentication
- Email/password **login & logout**
- Persistent sessions via **Supabase Auth**
- Secure **SSR-compatible auth handling**

---

### ✅ Company & Employee Model
- Companies with explicit **`owner_user_id`**
- Employees belong to a company
- Employee claim flow via **invite token**
- Claim implemented using **RPC (security definer)** for RLS safety

---

### ✅ Payroll System
- Payroll batches & payroll items
- Status lifecycle: `pending | paid | failed`
- Strong DB constraints  
  *(e.g. `paid_at` required when status = paid)*

---

### ✅ Employee Portal
- `/me/payroll` — employee payroll list
- `/me/payroll/[id]` — payslip detail page
- Employee can **only access their own payroll items**

---

### ✅ Server-only Payslip PDF
- Secure API route: `/api/me/payroll/[id]/pdf`
- Server-side authentication & ownership validation
- Binary PDF generation using **pdf-lib**
- **No client-side data trust**

---

### ✅ Security (Phase 2)
**Row Level Security (RLS)** enabled on:
- `companies`
- `employees`
- `payroll_batches`
- `payroll_items`

Policies enforce:
- Company owners can only manage **their own data**
- Employees can only **read their own records**
- Client-side Supabase access is **non-authoritative**
- Critical mutations designed for **server-only or RPC**

---

## 🗂️ Project Structure (Simplified)

app/
company/ # Company dashboard (client-rendered)
me/
payroll/ # Employee payroll pages
api/
me/payroll/[id]/pdf/ # Server-only PDF export

components/
LogoutButton.tsx

lib/
supabase/
browser.ts # createSupabaseBrowserClient
server.ts # createServerClient (SSR / routes)

middleware.ts # Auth/session propagation

---

## 🧠 Architectural Decisions
- **App Router default = Server Components**
- Client Components used **only when session-dependent**
- **No sensitive logic trusted to the browser**
- **RLS as the final authority** for data access
- RPC used where **RLS + tokens** are required (employee claim)

---

## 🛣️ Roadmap

### Phase 2 (In Progress / Partially Complete)
- [x] Employee payslip portal
- [x] Server-only PDF export
- [x] RLS policies
- [ ] Move admin payroll mutations fully server-only
- [ ] Add server APIs for payroll management

### Phase 3 (Planned)
- USDC / on-chain payroll integration
- Transaction hash → blockchain explorer
- Admin audit logs
- Multi-company / multi-admin support

---

## ⚠️ Notes
- This repository is an **MVP / learning project**
- **Not production-ready**
- Focused on **correct architecture & security boundaries**, not polish

---

Built by **Changyu Huang**  
Exploring **secure payroll systems**, **Web3-ready architecture**, and **real-world full-stack patterns**.

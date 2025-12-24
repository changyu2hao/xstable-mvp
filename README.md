# XStable Payroll (MVP)

XStable Payroll is a **server-first payroll MVP** built to explore **secure payroll workflows** using **Next.js App Router + Supabase**, with a clear upgrade path toward **USDC / on-chain payroll**.

This repository reflects the project **completed through Phase 2 (Security Boundary & Employee Payslip)**.

The primary focus of this MVP is **correct architecture, permission boundaries, and real-world security patterns**, not UI polish.

---

## 🚀 Tech Stack

### Frontend / App
- Next.js (App Router)
- React (Client & Server Components)
- TypeScript
- Tailwind CSS

### Backend / Infra
- Supabase (Auth, Postgres, RLS)
- Supabase SSR (`@supabase/ssr`)
- Row Level Security (RLS)

### Documents
- `pdf-lib` (server-only PDF generation)

---

## 🎯 Project Goals

- Build a **realistic payroll system**, not a demo UI
- Enforce **strict permission boundaries** (admin vs employee)
- Ensure **all sensitive operations are server-only**
- Treat **RLS as the final authority**, not frontend logic
- Prepare the system for **future on-chain payroll integration**

---

## 📦 Core Features (Implemented)

### ✅ Authentication
- Email / password login & logout
- Persistent sessions via Supabase Auth
- SSR-compatible auth handling using middleware

---

### ✅ Company & Employee Model
- Companies with explicit `owner_user_id`
- Employees belong to a company
- Employee onboarding via **invite token**
- Claim flow implemented using **Supabase RPC (SECURITY DEFINER)**  
  → avoids client-side privilege escalation

---

### ✅ Payroll System
- Payroll batches & payroll items
- Status lifecycle:
  - `pending`
  - `paid`
  - `failed`
- Strong database constraints  
  (e.g. `paid_at` required when status = `paid`)

---

### ✅ Admin Payroll APIs (Server-only)
All payroll mutations are **server-only** and live under `/api/admin/*`.

Implemented endpoints include:
- `/api/admin/payroll-items`
- `/api/admin/payroll-items/[id]`
- `/api/admin/payroll-items/mark-all-paid`
- `/api/admin/payroll-batches`

Frontend **cannot** directly mutate payroll data via Supabase client.

---

### ✅ Employee Portal
- `/me/payroll` — employee payroll list
- `/me/payroll/[id]` — payslip detail page
- Employees can **only access their own payroll records**
- Ownership enforced both:
  - server-side
  - via RLS policies

---

### ✅ Server-only Payslip PDF Export
- Secure endpoint: `/api/me/payroll/[id]/pdf`
- Server-side authentication & ownership validation
- PDF generated on the server using `pdf-lib`
- Binary response with no client-side data trust

---

## 🔐 Security Model (Phase 2 Focus)

### Row Level Security (Enabled)
RLS is enabled on:
- `companies`
- `employees`
- `payroll_batches`
- `payroll_items`

Policies enforce:
- Company owners can only manage **their own data**
- Employees can only read **their own payroll items**
- Client-side Supabase access is **non-authoritative**
- Critical mutations happen via:
  - server APIs
  - or RPC functions

### Key Rule
> **If the frontend cannot break security even when modified, the design is correct.**

---

## 🗂️ Project Structure (Simplified)

app/
api/
admin/
payroll-items/
payroll-batches/
me/
payroll/
[id]/
pdf/
company/
me/
payroll/

components/
LogoutButton.tsx

lib/
supabase/
browser.ts # client-only Supabase
server.ts # server / SSR Supabase

middleware.ts # auth & session propagation


---

## 🧠 Architectural Decisions

- App Router default = **Server Components**
- Client Components used only for:
  - interactivity
  - session-aware UI
- No sensitive logic trusted to the browser
- RLS is treated as the **final security layer**
- RPC used where tokens + RLS must be combined safely

---

## 🛣️ Roadmap

### ✅ Phase 2 — Completed
- Employee payroll portal
- Server-only payslip PDF export
- Strict permission boundaries
- RLS enforced across core tables
- Admin payroll mutations moved server-side

---

### 🚧 Phase 3 — Planned (Next)
- USDC / on-chain payroll execution
- Replace `mark-paid` with real blockchain transactions
- Store transaction hash from chain
- Link payroll items to block explorer
- Admin audit logs
- Multi-admin / role-based access

---

## ⚠️ Notes

- This repository is an **MVP / architecture-focused project**
- Not production-ready
- Designed to demonstrate:
  - security-first thinking
  - real-world backend boundaries
  - Web3-ready payroll architecture

---

Built by **Changyu Huang**  
Exploring **secure payroll systems**, **server-first design**, and **Web3 payroll infrastructure**.

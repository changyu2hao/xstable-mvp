# XStable Payroll (MVP)

**XStable Payroll** is an MVP payroll system designed to explore **secure, server-first payroll workflows** using **Next.js App Router + Supabase**, with a clear architectural path toward **USDC / on-chain payroll**.

This repository represents the project up to **Phase 2 (Security Boundary & Employee Payslip)**.

---

## 🚀 Tech Stack

### Frontend / App
- **Next.js** (App Router)
- **React** (Server & Client Components)
- **TypeScript**
- **Tailwind CSS**

### Backend / Infra
- **Supabase**
  - Auth
  - Postgres
  - Row Level Security (RLS)
- **Supabase SSR** (`@supabase/ssr`)

### Documents
- **pdf-lib** (server-only PDF generation)

---

## 🎯 Project Goals

- Build a **realistic payroll MVP**, not just a demo UI
- Enforce **strict permission boundaries** (company owner vs employee)
- Ensure **all sensitive operations are server-only**
- Use **RLS as the final authority** for data access
- Prepare a clean foundation for **on-chain payroll integration**

---

## 📦 Core Features (Current)

### ✅ Authentication
- Email/password **login & logout**
- Persistent sessions via **Supabase Auth**
- Secure **SSR-compatible session handling**
- Middleware-based session propagation

---

### ✅ Company & Employee Model
- Companies with explicit **`owner_user_id`**
- Employees belong to a single company
- Secure **employee claim flow** via invite token
- Claim implemented using **RPC (security definer)** for RLS safety

---

### ✅ Payroll System
- Payroll batches & payroll items
- Status lifecycle:
  - `pending`
  - `paid`
  - `failed`
- Strong database constraints  
  *(e.g. `paid_at` required when status = `paid`)*

---

### ✅ Employee Portal
- `/me/payroll` — employee payroll list
- `/me/payroll/[id]` — payslip detail page
- Employee can **only access their own payroll items**
- All sensitive reads handled via **server-only APIs**

---

### ✅ Server-only Payslip PDF
- Secure API route:  
  `GET /api/me/payroll/[id]/pdf`
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
- Critical mutations implemented via:
  - Server-only API routes
  - RPC where token-based or atomic logic is required

---

## 🗂️ Project Structure (Simplified)

app/
company/                # Company dashboard (client-rendered)
me/
payroll/              # Employee payroll pages
api/
me/
payroll/
route.ts           # Employee payroll list (server-only)
[id]/route.ts      # Single payslip (server-only)
[id]/pdf/route.ts  # Server-only PDF export
components/
LogoutButton.tsx
lib/
supabase/
browser.ts             # createSupabaseBrowserClient
server.ts              # createServerClient (SSR / routes)
middleware.ts              # Auth/session propagation

---

## 🧠 Architectural Decisions

- **App Router default = Server Components**
- Client Components used **only for UI & interaction**
- **No sensitive logic trusted to the browser**
- **RLS as the final authority** for data access
- Server APIs define explicit permission boundaries
- RPC used where **RLS + token-based access** is required (employee claim)

---

## 🛣️ Roadmap

### Phase 2 (Completed / Stabilizing)
- [x] Employee payslip portal
- [x] Server-only PDF export
- [x] RLS policies
- [ ] Move admin payroll mutations fully server-only
- [ ] Add server APIs for payroll management

### Phase 3 (Planned)
- USDC / on-chain payroll execution
- Transaction hash storage & lifecycle
- Blockchain explorer integration (e.g. BaseScan)
- Admin audit logs
- Multi-company / multi-admin support

---

## ⚠️ Notes

- This repository is an **MVP / learning-oriented project**
- **Not production-ready**
- Focused on **correct architecture, security boundaries, and real-world patterns**
- UI polish and scalability optimizations are intentionally secondary

---

Built by **Changyu Huang**  
Exploring **secure payroll systems**, **server-first architecture**, and **Web3-ready full-stack design**.

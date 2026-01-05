# XStable Payroll (MVP)

XStable Payroll is a **server-first payroll MVP** designed to explore **secure, production-grade payroll architecture**, with a clear upgrade path toward **USDC / on-chain payroll execution**.

This repository reflects the project **completed through Phase 3 (On-chain Confirmation & Production Cron)**.

The primary focus of this MVP is **correct architecture, security boundaries, and real-world backend patterns**, not UI polish.

---

## 🚀 Tech Stack

### Frontend / App
- Next.js (App Router)
- React (Server & Client Components)
- TypeScript
- Tailwind CSS

### Backend / Infra
- Supabase (Auth, Postgres, RLS)
- Supabase SSR (`@supabase/ssr`)
- Row Level Security (RLS)
- GitHub Actions (Production Cron)

### Blockchain
- ethers.js
- Base Sepolia (testnet)

### Documents
- `pdf-lib` (server-only PDF generation)

---

## 🎯 Project Goals

- Build a **realistic payroll system**, not a demo UI
- Enforce **strict permission boundaries** (admin vs employee)
- Ensure **all sensitive operations are server-only**
- Treat **RLS as the final authority**, not frontend logic
- Design a **Web3-ready payroll pipeline** with clear separation between:
  - transaction execution
  - transaction confirmation

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
  → prevents client-side privilege escalation

---

### ✅ Payroll System
- Payroll batches & payroll items
- Status lifecycle:
  - `pending`
  - `submitted`
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
- Binary response with zero client-side trust

---

## 🔗 Phase 3 — On-chain Payroll Confirmation (Completed)

### ✅ Blockchain Transaction Tracking
- Payroll items store `tx_hash` after on-chain execution
- Transaction lifecycle is **decoupled** from UI actions

---

### ✅ Production Cron (GitHub Actions)
A production-grade cron job runs every 10 minutes via **GitHub Actions**:

- Workflow: `.github/workflows/confirm-payroll.yml`
- Calls a **protected server-only endpoint**
- Authenticated via `CRON_SECRET`
- No client or public access

---

### ✅ On-chain Confirmation Logic
Server-only cron endpoint:

POST /api/cron/confirm-payroll-items


Responsibilities:
- Fetch all `submitted` payroll items with `tx_hash`
- Query blockchain via `ethers.js`
- Handle:
  - pending transactions
  - reverted transactions
  - successful transactions
- Update database status:
  - `submitted → paid`
  - `submitted → failed`
- Designed to be:
  - idempotent
  - retry-safe
  - resilient to RPC flakiness

> ⚠️ This cron **does NOT send transactions**.  
> It only **confirms and reconciles blockchain state**.

---

## 🔐 Security Model

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
  - or SECURITY DEFINER RPCs

---

### Cron Security
- Cron endpoint is **not publicly accessible**
- Requires `Authorization: Bearer CRON_SECRET`
- Secrets are stored only in:
  - GitHub Actions
  - Vercel environment variables

---

## 🗂️ Project Structure (Simplified)

app/
├─ api/
│ ├─ admin/
│ ├─ me/
│ │ └─ payroll/[id]/pdf
│ └─ cron/
│ └─ confirm-payroll-items
├─ me/
│ └─ payroll/
│ └─ [id]
├─ company/

lib/
└─ supabase/
├─ browser.ts
└─ server.ts

middleware.ts


---

## 🧠 Architectural Decisions

- App Router default = **Server Components**
- Client Components only for:
  - interactivity
  - UX state
- No sensitive logic trusted to the browser
- RLS treated as the **final security boundary**
- Payroll execution and confirmation are **intentionally separated**
- Cron logic is:
  - idempotent
  - retry-safe
  - production-oriented

---

## 🛣️ Roadmap

### ✅ Phase 2 — Completed
- Employee payroll portal
- Server-only payslip PDF export
- Strict permission boundaries
- RLS across all core tables
- Admin payroll mutations moved server-side

---

### ✅ Phase 3 — Completed (Confirmation Layer)
- Blockchain transaction tracking
- Production cron (GitHub Actions)
- On-chain receipt confirmation
- Automatic payroll status reconciliation
- Retry-safe, idempotent design

---

### 🚧 Phase 4 — Planned (Execution Layer)
- Server-side USDC payroll execution
- Replace manual `mark-paid` with real transactions
- Transaction signing via secure wallet
- Block explorer links
- Admin audit logs
- Role-based admin access
- Monitoring & alerting

---

## ⚠️ Notes

- This repository is an **architecture-focused MVP**
- Not production-ready
- Designed to demonstrate:
  - security-first backend thinking
  - real-world permission boundaries
  - Web3 payroll architecture patterns
  - production cron design

---

Built by **Changyu Huang**  
Exploring **secure payroll systems**, **server-first design**, and **Web3 payroll infrastructure**.

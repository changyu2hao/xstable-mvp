# XStable Payroll (MVP)

**XStable Payroll** is a payroll MVP designed to explore **secure, server-first payroll workflows** using **Next.js App Router + Supabase**, with an MVP-grade path toward **USDC / on-chain payroll** (Base Sepolia).

Live demo: https://xstable-mvp.vercel.app

---

## 🚀 Tech Stack

### Frontend
- **Next.js** (App Router)
- **React** (Server + Client Components)
- **TypeScript**
- **Tailwind CSS**

### Backend / Infra
- **Supabase** (Auth + Postgres + RLS)
- **@supabase/ssr** (server sessions, cookies)

### Blockchain (Testnet)
- **Base Sepolia**
- **USDC (test token)**
- **ethers.js** (server-side signing / confirmation)

---

## 🎯 Project Goals

- Build a **realistic payroll MVP**, not just a UI demo
- Enforce strict **permission boundaries** (admin vs employee)
- Keep all sensitive logic **server-only**
- Demonstrate a path to **Web3 payroll** (USDC transfer + explorer links)

---

## 👥 Roles & Access Model

### ✅ Admin (Company Owner)
Admins are users who have a company where:
- `companies.owner_user_id = auth.uid()`

Admins can:
- Create companies
- Add employees (generate invite tokens)
- Create payroll batches & payroll items
- Trigger USDC payouts (server-side)

---

### ✅ Employee
Employees are users who are linked to an employee record where:
- `employees.user_id = auth.uid()`

Employees can:
- Claim invitation via invite token
- View `/me/payroll`
- View individual payslip details
- View transactions in BaseScan

---

### ✅ Unlinked user
A signed-up user with **no company ownership** and **no employee binding**.

They are redirected to:
- `/onboarding`

---

## ✅ Core Features (Current)

### ✅ Authentication
- Email/password **Sign up / Sign in / Log out**
- SSR-compatible session handling
- Clean redirects based on role

---

### ✅ Company & Employee
- Companies owned by `owner_user_id`
- Employees belong to company
- Invite token onboarding:
  - `invite_token`
  - `invite_expires_at`
  - `user_id` (link employee after claim)

---

### ✅ Payroll System
- Payroll batches & payroll items
- Status lifecycle:
  - `pending`
  - `paid`
  - `failed`
- Tx hash stored on payroll item
- Explorer links in UI

---

### ✅ Employee Portal
Employee pages:
- `/me/payroll` (paginated list)
- `/me/payroll/[id]` (detail)
- `/api/me/payroll/[id]/pdf` (server-only PDF export)

---

### ✅ Server-only Payslip PDF
Server-only PDF generation:
- Uses **pdf-lib**
- Validates:
  - logged-in user
  - employee ownership
- Returns binary PDF response

---

### ✅ Security: Row Level Security (RLS)
RLS is enabled on:
- `companies`
- `employees`
- `payroll_batches`
- `payroll_items`

Policies ensure:
- Admin can only access their own companies via `owner_user_id`
- Employees can only access their own records via `employees.user_id`
- Sensitive mutations are not trusted in the browser

---

## 🦊 MetaMask & Base Sepolia (Demo Guide)

### ✅ Why MetaMask is needed
To view on-chain payroll transactions, testers need:
- a wallet address
- Base Sepolia network enabled
- BaseScan explorer links work directly from tx hashes

> **Important:** Testers do **NOT** need to send USDC themselves.  
> Payroll is sent from the project’s server-controlled payroll wallet.

---

### 1) Install MetaMask
1. Go to https://metamask.io
2. Install the browser extension (Chrome / Edge)
3. Create a wallet
4. Save your Secret Recovery Phrase somewhere safe

---

### 2) Add / Switch to Base Sepolia
In MetaMask:
1. Open MetaMask
2. Click the network dropdown (top center)
3. Enable **“Show test networks”**
4. Select **Base Sepolia**

If Base Sepolia is not listed, add manually:

- **Network Name:** Base Sepolia  
- **RPC URL:** https://sepolia.base.org  
- **Chain ID:** 84532  
- **Currency Symbol:** ETH  
- **Block Explorer:** https://sepolia.basescan.org  

---

### 3) Get your wallet address (to receive payroll)
1. Open MetaMask
2. Click your account name
3. Copy address (starts with `0x...`)
4. Use this address as your employee wallet address

---

### 4) View transactions in BaseScan
Payroll tx hashes link to:
- https://sepolia.basescan.org

Example:
- `https://sepolia.basescan.org/tx/<tx_hash>`

---

## ✅ Can other testers mint USDC easily?
Yes — **any tester** can mint Base Sepolia **test USDC** using Circle’s faucet:
- https://faucet.circle.com/

But in this MVP, they **don’t need to**, because:
- payroll sends USDC from the server payroll wallet
- employees only need a receiving address

---

## 🔐 On-chain Payroll Sender (How it works in this MVP)

### ✅ Important behavior
All USDC transfers are sent from **ONE wallet**:
- the server-controlled wallet configured via env vars

That means:
- No matter who the employee is, the sender address is the same
- This matches real payroll systems (a single payroll operator wallet)

### ✅ Why this is correct for MVP
- simpler for demo
- avoids requiring every company/admin to manage keys
- avoids security risk of putting private keys in client apps

---

## ⚠️ Developer Notes (Optional)

### ✅ USDC Contract (Base Sepolia)
This project uses Base Sepolia USDC contract:
- `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

---

### ✅ Funding the payroll sender wallet (Admin / Dev Only)
Only needed if you fork/run your own server sender wallet.

#### 1) Get Base Sepolia ETH (gas)
Open: https://portal.cdp.coinbase.com/products/faucet  
- Network: Base Sepolia  
- Paste wallet address  
- Request test ETH  

#### 2) Get Base Sepolia USDC (test token)
Open: https://faucet.circle.com/  
- Network: Base Sepolia  
- Token: USDC  
- Paste wallet address  
- Request / Mint  

---

## 🗂️ Project Structure (Simplified)

app/
login/ # sign in
sign-up/ # sign up
onboarding/ # role selection + invite entry
company/ # admin dashboard
company-detail/ # manage employees + batches
me/payroll/ # employee portal
payroll-items/ # admin payroll list
api/
admin/ # admin-only server APIs
me/ # employee-only server APIs
cron/ # confirmation (optional)

lib/supabase/
browser.ts
server.ts
serverRoute.ts

components/
LogoutButton.tsx


---

## ✅ Roadmap / TODO

### High Priority
- [ ] Centralize role detection into a server-only `getUserRole()`
- [ ] Make all admin mutations fully server-only (no client trust)
- [ ] Add status summary (pending / paid totals)
- [ ] Add filtering on payroll list (status filter)

### Nice to Have
- [ ] Audit logs
- [ ] Multi-admin per company
- [ ] Multi-company per user
- [ ] Mainnet-ready config separation

---

## ⚠️ Notes
- This repository is an MVP / learning project
- Not production-ready
- Focused on security boundaries + correct architecture

---

Built by **Changyu Huang**

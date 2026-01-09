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

### Step 1: Install MetaMask

If you already have MetaMask installed, you can skip this step.

1. Go to 👉 https://metamask.io  
2. Install the browser extension (Chrome / Edge / Firefox)
3. Create a wallet
4. **Securely save your recovery phrase**

⚠️ **Important**
- Use a **test wallet only**
- Never use a wallet that holds real funds
- Never share your recovery phrase or private key

---

### Step 2: Open the Network Selector (New MetaMask UI)

MetaMask’s UI has changed — the network selector is now a modal.

1. Open MetaMask
2. Click the **network indicator near your account name**  
   _(this opens the “Select network” modal)_
3. Enable **“Show test networks”** if it’s not already enabled

You should now see a list of available networks.

---

### Step 3: Switch to Base Sepolia

#### If Base Sepolia is already listed

- It usually appears under **Custom networks**
- Click **Base Sepolia** to switch

✅ You’re done.

---

### Step 4: Manually Add Base Sepolia (If Not Listed)

If Base Sepolia does **not** appear in the list:

1. In the **Select network** modal, click **Add custom network**
2. Enter the following details:

Network Name: Base Sepolia
RPC URL: https://sepolia.base.org

Chain ID: 84532
Currency Symbol: ETH
Block Explorer: https://sepolia.basescan.org
3. Save
4. Switch to **Base Sepolia**

---

### Step 5: Get Your Wallet Address (Required to Receive Payroll)

You must copy your **Base Sepolia address** so payroll can be sent to you.

1. Make sure MetaMask is set to **Base Sepolia**
2. Click **Receive**
3. In the network list, find **Base Sepolia**
4. Copy the address shown  
   _(starts with `0x...`)_

📌 This address is what you:
- Paste into **Employee wallet address** in XStable
- Use to receive **USDC payroll payments**

> Your address format looks like Ethereum, but it is **network-specific**.

---

### Step 6: View Transactions

All payroll transactions in XStable link directly to **BaseScan**:

https://sepolia.basescan.org

Example:
- `https://sepolia.basescan.org/tx/<tx_hash>`

yaml
Copy code

You can:
- View transaction status
- Confirm transfers
- Inspect USDC movements

---

### ✅ Notes for Testers

- All USDC in this demo is **testnet USDC**
- All transactions are **non-real**
- No wallet connection is required inside XStable  
  _(payroll is initiated server-side)_

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

- app/
  - login/                # sign in
  - sign-up/              # sign up
  - onboarding/           # role selection + invite entry
  - company/              # admin dashboard
  - company-detail/       # manage employees + payroll batches
  - me/
    - payroll/            # employee portal
  - payroll-items/        # admin payroll list
  - api/
    - admin/              # admin-only server APIs
    - me/                 # employee-only server APIs
    - cron/               # confirmation jobs (optional)
- lib/
  - supabase/
    - browser.ts
    - server.ts
    - serverRoute.ts
- components/
  - LogoutButton.tsx

---

## ⏱️ Automated Payroll Confirmation (Cron)

XStable uses a **production-grade cron job** to automatically confirm on-chain payroll transactions and update their status in the database.

This ensures payroll items move from `submitted → paid / failed` **without any manual intervention**.

### ✅ Production Cron (GitHub Actions)

A scheduled GitHub Actions workflow runs **every 10 minutes**.

**Key properties:**

-   Runs every **10 minutes**
    
-   Can be triggered manually (`workflow_dispatch`)
    
-   Calls a **server-only endpoint**
    
-   Authenticated via a **shared secret**
    
-   No client or public access
    

### ✅ Cron Authentication & Security

The cron endpoint is **not public**.

-   Requests **must** include `Authorization: Bearer <CRON_SECRET>`
    
-   Secret is stored securely in **GitHub Actions secrets**
    
-   Prevents abuse or external triggering
    

### ✅ On-chain Confirmation Logic

**Endpoint:**

POST /api/cron/confirm-payroll-items

-   **Responsibilities:**
    
    -   Fetch all payroll items with:
        
        -   `status = submitted`
            
        -   `tx_hash IS NOT NULL`
            
    -   Query the **Base Sepolia blockchain** using `ethers.js`
        
    -   Handle all transaction states:
        
        -   ⏳ not mined yet
            
        -   ❌ reverted (failed)
            
        -   ✅ confirmed (paid)
    

### ✅ Reliability & Fault Tolerance

-   The cron job is designed to be **safe and resilient**:
    
    -   **Timeout protection** on RPC calls
        
    -   **Retry with exponential backoff** for flaky RPC responses
        
    -   Detects and skips:
        
        -   invalid tx hashes
            
        -   claim-only records
            
    -   **Idempotent**:
        
        -   Safe to run repeatedly
            
        -   No duplicate side effects
    

### ✅ Structured Logging

## 

-   Each run emits a structured log entry:

{
  "tag": "cron_confirm_payroll_items",
  "now": "2026-01-09T06:20:00.000Z",
  "env": "production",
  "hasAuth": true
}

## 

-   Returned response includes counters such as:
    
    -   `checked`
        
    -   `updated`
        
    -   `minedPaid`
        
    -   `minedFailed`
        
    -   `notMined`
        
    -   `rpcBusy`
        
    
    This makes debugging and monitoring straightforward.
    

### ✅ Why This Matters


-   This cron setup ensures:
    
    -   Payroll confirmation is **fully automated**
        
    -   Blockchain delays are handled gracefully
        
    -   The system remains **eventually consistent**
        
    -   No admin needs to manually “check transactions”
        
    
    This is a **real backend system pattern**, not a demo hack.

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

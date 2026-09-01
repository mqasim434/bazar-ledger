# Wholesale Cloth Distribution — Web Admin Portal
## End-to-End Cursor Build Plan (React + Redux + Firebase + ImageKit)

> Scope note: This plan covers the **Web Application only** (Admin + Accountant portal). The Salesman mobile app (offline-first, installable, Urdu-optional) is a separate build and is intentionally excluded here — it will need its own architecture doc (likely React Native/Flutter + local DB sync layer) once the web app's data model is stable.

> How to use this doc: Feed one module's prompt into Cursor at a time, in order. Test the module fully before moving to the next — later modules assume earlier ones exist and work. Each prompt is self-contained enough to paste directly into Cursor's chat/composer against your existing repo.

---

## PART 1 — SYSTEM PLANNING

### 1.1 Tech Stack & Rationale

| Layer | Choice | Why |
|---|---|---|
| Build tool | Vite + React 18 | Fast HMR, matches your existing TrackApply pattern |
| State | Redux Toolkit | Predictable global state across 10+ interlinked modules (client balances, salesman cash, inventory all mutate each other) |
| Backend/DB | Firebase (Firestore + Auth + Cloud Functions) | Real-time sync, role-based auth out of the box, serverless — good fit for 1000+ shop scale |
| Images | ImageKit | Shop photos, vendor docs, receipt logos — offloads image transform/CDN from Firebase Storage |
| Styling | Tailwind CSS (custom theme, no default palette) | Fast, consistent, but themed so it doesn't look like a stock AI build |
| Receipts | WhatsApp deep links (`wa.me`) + PDF/image receipt generation | No paid API needed for MVP; upgradeable to WhatsApp Business API later |
| Hosting | Firebase Hosting | Pairs naturally with Firestore/Auth |

**Why Redux Toolkit over Context/RTK Query alone:** This system has heavy cross-module derived state — a single Sale transaction updates client balance, salesman inventory, salesman total sales, and (indirectly) commission. Centralizing this in Redux slices with clear action flows (rather than scattered `useEffect` chains) will keep the money math auditable, which matters a lot here since real cash/credit is being tracked.

**Firestore vs. a relational DB:** Firestore is fine at this scale (1000+ shops, tens of thousands of transactions/year) as long as we denormalize deliberately (e.g., store `clientName` and `salesmanName` directly on transaction docs, not just IDs) to avoid N+1 reads in list views. This is called out per-module below.

---

### 1.2 Firestore Data Model

All money fields stored as integers (smallest currency unit, e.g., paisa) or fixed 2-decimal numbers — decide once in Module 1 and never mix.

```
users/{uid}
  name, email, role: "admin" | "accountant", createdAt, active: bool

salesmen/{salesmanId}
  name, contact, route, area
  cashInHand: number
  totalSales: number
  totalRecovery: number
  totalCommissionEarned: number
  totalCommissionPaid: number
  inventoryValue: number        // denormalized sum, recalculated via Cloud Function
  active: bool, createdAt, updatedAt

clients/{clientId}
  shopName, serialNumber (unique, indexed), ownerName, city
  gps: { lat, lng }
  creditLimit: number, creditLimitEnabled: bool
  defaultDiscountPercent: number
  salesmanId, salesmanName          // denormalized
  totalPurchase, totalCredit, totalRecovery, balance: number
  active: bool, createdAt, updatedAt

inventory/{itemId}                  // main office stock
  itemName, unit ("yard"), costPricePerYard, ratePerYard
  stockYards: number, stockValue: number
  createdAt, updatedAt

salesmanInventory/{salesmanId_itemId}   // composite key
  salesmanId, salesmanName, itemId, itemName
  yards: number, valueAtCost: number
  updatedAt

stockIssues/{issueId}                // main -> salesman movement log
  salesmanId, salesmanName, itemId, itemName
  yards, valueAtCost, issuedBy, date, notes

transactions/{transactionId}         // Sales
  clientId, clientName, salesmanId, salesmanName
  itemId, itemName, yards, ratePerYard, discountPercent
  grossAmount, discountAmount, netAmount
  paymentType: "cash" | "credit"
  date, createdBy, receiptSent: bool
  status: "active" | "returned" | "partially_returned"

recoveries/{recoveryId}
  clientId, clientName, salesmanId, salesmanName
  amount, paymentMode: "cash" | "pos" | "bank"
  date, createdBy, receiptSent: bool

salesmanDeposits/{depositId}         // salesman -> office cash movement
  salesmanId, salesmanName, amount, mode: "cash" | "bank"
  date, receivedBy

returns/{returnId}
  originalTransactionId, clientId, clientName, salesmanId, salesmanName
  itemId, itemName, yardsReturned
  status: "pending" | "confirmed" | "rejected"
  reviewedBy, reviewedAt, date, notes

vendors/{vendorId}
  name, contact, totalPaid, totalOwed, totalAdvance
  active, createdAt

vendorTransactions/{vendorTxnId}
  vendorId, vendorName, type: "purchase" | "payment" | "advance"
  amount, date, createdBy, receiptSent: bool

expenses/{expenseId}                 // office expenses
  category, amount, source: "cash" | "bank"
  date, addedBy, notes

salesmanExpenses/{expenseId}
  salesmanId, salesmanName, category, amount
  date, addedBy, notes

commissions/{salesmanId_period}      // or a subcollection per salesman
  salesmanId, salesmanName, periodStart, periodEnd
  formulaType, basis ("sales" | "recovery"), rate
  earnedAmount, paidAmount, remainingBalance
  adjustments: [ { amount, reason, date, addedBy } ]

officeBalances/summary               // singleton doc
  cashInHand: number, cashInBank: number, updatedAt
```

**Cloud Functions to plan for (built alongside their modules, not in Module 1):**
- `onTransactionCreate` → update client totals, salesman totals, salesman inventory, office/credit ledgers
- `onRecoveryCreate` → update client balance, salesman cashInHand
- `onReturnConfirm` → reverse client/salesman/inventory figures
- `onStockIssue` → move value from `inventory` to `salesmanInventory`
- `recalculateCommission` (callable, filter-based) → compute commission for a date range on demand

---

### 1.3 Redux Store Structure

```
store/
  index.js
features/
  auth/authSlice.js
  clients/clientsSlice.js
  salesmen/salesmenSlice.js
  inventory/inventorySlice.js
  transactions/transactionsSlice.js
  recoveries/recoveriesSlice.js
  returns/returnsSlice.js
  vendors/vendorsSlice.js
  expenses/expensesSlice.js
  commissions/commissionsSlice.js
  dashboard/dashboardSlice.js
  search/searchSlice.js
  ui/uiSlice.js          // toasts, modals, global loading, sidebar state
```

Each feature slice pairs with a `*Service.js` (pure Firestore calls: get/add/update/listen) and a `use*.js` hook (wraps the service + dispatches), matching your existing service/hook-separation pattern from TrackApply. Slices hold normalized state (`{ byId, allIds, status, error, filters }`), never raw Firestore snapshots.

---

### 1.4 Folder Architecture (feature-based)

```
src/
  app/
    App.jsx
    routes.jsx
  config/
    firebase.js
    imagekit.js
    theme.js            // exported design tokens used outside Tailwind (charts, PDFs)
  components/            // shared/dumb UI only
    ui/  (Button, Input, Select, Modal, Table, Card, Badge, Tabs, DatePicker, Pagination)
    layout/ (AdminLayout, Sidebar, Topbar, ProtectedRoute)
  features/
    auth/
    clients/
    salesmen/
    inventory/
    transactions/
    recoveries/
    returns/
    vendors/
    expenses/
    commissions/
    dashboard/
    search/
    reports/
    (each: components/, pages/, {name}Slice.js, {name}Service.js, use{Name}.js, {name}Types.js if using JSDoc typedefs)
  hooks/                  // cross-feature only: useDebounce, useFirestoreListener, useRole
  utils/
    formatters.js         // currency, date, yards
    whatsapp.js            // wa.me link builder + receipt text templates
    calculations.js        // discount math, commission math — pure functions, unit-testable
  store/
    index.js
  routes/
    roleGuard.jsx
```

Rule for Cursor throughout: **business math (discounts, balances, commission) lives in `utils/calculations.js` as pure functions, never inline in components.** This keeps money logic testable and auditable.

---

### 1.5 Theme Configuration — Custom Palette (no default AI look)

Avoid: default `indigo-600` / `purple-600` / `emerald-500` combos, default `shadow-lg rounded-xl` cookie-cutter cards, default Inter-only typography with no hierarchy.

**Theme name: "Bazaar"** — inspired by a cloth-trade ledger aesthetic: warm, tactile, trustworthy, not a generic SaaS blue.

```js
// tailwind.config.js (colors excerpt)
colors: {
  brand: {
    50:  '#FBF6EF',
    100: '#F3E7D3',
    200: '#E4C9A0',
    300: '#D3A66C',
    400: '#C08847',
    500: '#A8662E',   // primary — clay/terracotta
    600: '#8A4F23',
    700: '#6C3D1C',
    800: '#4E2C15',
    900: '#301B0D',
  },
  ink: {
    50:  '#F4F5F5',
    100: '#E4E6E6',
    300: '#A9AEAF',
    500: '#5C6567',   // secondary text
    700: '#33393B',
    900: '#1B1F20',   // near-black, primary text
  },
  teal: {
    500: '#2E6E6A',   // secondary accent — deep teal (credit/positive)
    600: '#235452',
  },
  gold: {
    400: '#D9A441',   // tertiary accent — highlights, badges (recovery/cash)
    500: '#BC8A2C',
  },
  danger: '#B14A3C',   // muted brick red, not stock Tailwind red-500
  success: '#3E7D5A',  // muted sage green, not stock emerald-500
  warn: '#C0872F',
  surface: '#FBF9F5',  // app background — warm off-white, not pure white/gray-50
  card: '#FFFFFF',
}
```

Typography: pair a slightly condensed grotesque for headings (e.g., `"Space Grotesk"`) with a readable body font (`"Inter"` or `"IBM Plex Sans"`) — avoids the single-font flat look. Numbers/money everywhere should use a tabular-nums font-feature (`font-feature-settings: 'tnum'`) for aligned columns in tables.

Component conventions to lock in Module 1: 4px-based spacing scale, `rounded-md` (not `rounded-xl` everywhere), subtle 1px borders (`border-ink-100`) instead of heavy drop shadows for cards, and a consistent left-accent-bar pattern on status badges instead of pill backgrounds everywhere.

---

### 1.6 Build Order & Dependency Map

```
1. Foundation (project, theme, Firebase/ImageKit config, layout shell, routing)
2. Auth & Roles (Admin / Accountant)
3. Salesman Module          ─┐
4. Client (Shop) Module      │  both needed before transactions
5. Inventory Module (main)   │
6. Stock Issue (main → salesman)
7. Transaction (Sale) Module        ← needs 3,4,5,6
8. Recovery Module                  ← needs 3,4
9. Salesman Cash Deposit             ← needs 3
10. Return Module                    ← needs 7
11. Vendor Module                    (independent, can build any time after Foundation)
12. Expense Module (office + salesman) ← salesman side needs 3
13. Commission Module                ← needs 7,8
14. Search Module (global)           ← needs 3,4 minimum, richer after 7
15. Reports Module                   ← needs 7,8,10,12,13
16. Admin Dashboard                  ← needs everything above
17. WhatsApp Receipts polish pass    ← touches 7,8,11
18. QA / hardening / deploy
```

---

## PART 2 — MODULE PROMPTS FOR CURSOR

Each prompt below assumes you paste it into Cursor **after** confirming the previous module works. Test checklist is included so you know what "done" means before moving on.

---

### Module 1 — Project Foundation, Theme, Firebase & ImageKit Config

**Cursor Prompt:**
```
Set up a new React + Vite project for a wholesale cloth distribution admin web app.

Stack: React 18, Vite, Redux Toolkit + react-redux, react-router-dom v6, Firebase
(Firestore + Auth), ImageKit (imagekitio-react), Tailwind CSS.

1. Scaffold Vite React app, install: @reduxjs/toolkit react-redux react-router-dom
   firebase imagekitio-react tailwindcss postcss autoprefixer clsx date-fns.

2. Configure Tailwind with this exact custom theme (do NOT use default Tailwind
   color names like indigo/purple/emerald anywhere in the app):
   [PASTE the full colors object from section 1.5 above]
   Also add fontFamily: heading = "Space Grotesk", body = "Inter". Add both fonts
   via Google Fonts link in index.html.

3. Create folder structure exactly as follows (empty placeholder files/folders is fine
   for now — do not build feature logic yet):
   [PASTE the folder tree from section 1.4 above]

4. src/config/firebase.js — initialize Firebase app using import.meta.env variables
   (VITE_FIREBASE_API_KEY, etc — create a .env.example listing all needed keys, do not
   hardcode any real keys). Export `auth` and `db` (Firestore instance).

5. src/config/imagekit.js — export a configured ImageKit instance using
   VITE_IMAGEKIT_PUBLIC_KEY / VITE_IMAGEKIT_URL_ENDPOINT env vars, with a note that
   the private key + auth endpoint will be a Firebase Cloud Function (not created yet).

6. Build the shared UI kit in components/ui/: Button (primary/secondary/danger/ghost
   variants using the brand palette), Input, Select, Modal, Card, Table (with sticky
   header + empty state), Badge (status variants using left-accent-bar style, not pill
   backgrounds), Pagination, Tabs, DatePicker (range + single). These must NOT look
   like generic shadcn defaults — apply the theme tokens explicitly.

7. Build layout shell in components/layout/: Sidebar (collapsible, nav placeholder
   items for all future modules), Topbar (search bar placeholder, user menu
   placeholder), AdminLayout wrapping both with an <Outlet />.

8. Set up react-router-dom in app/routes.jsx with placeholder routes for
   /dashboard, /clients, /salesmen, /inventory, /transactions, /recoveries,
   /returns, /vendors, /expenses, /commissions, /reports — each rendering a
   simple "Module coming soon" page inside AdminLayout.

9. Set up Redux store at store/index.js with an empty rootReducer object ready to
   accept slices as they're built. Wrap App in <Provider>.

10. src/utils/formatters.js — currency formatter (PKR, no decimals unless needed),
    date formatter (date-fns), yards formatter.

Do not build auth, clients, salesmen, or any business logic yet — this module is
foundation only. When done, the app should run with `npm run dev`, show the themed
sidebar/topbar shell, and navigate between empty placeholder pages.
```

**Test before moving on:** App boots, theme colors visible (not default Tailwind blues/purples), sidebar navigation works, `.env.example` documents all required keys, folder structure matches spec.

---

### Module 2 — Authentication & Role-Based Access (Admin / Accountant)

**Cursor Prompt:**
```
Build authentication on top of the existing Firebase config (src/config/firebase.js)
and Redux store.

1. Firestore `users/{uid}` doc shape: { name, email, role: "admin" | "accountant",
   active: bool, createdAt }.

2. features/auth/authService.js — signIn(email, password), signOut(), and
   getUserProfile(uid) that fetches the users/{uid} doc after Firebase Auth login.

3. features/auth/authSlice.js — state: { user: null, profile: null, status:
   'idle'|'loading'|'succeeded'|'failed', error }. Thunks: loginUser, logoutUser,
   restoreSession (called on app load via onAuthStateChanged listener).

4. features/auth/useAuth.js hook wrapping the above for components.

5. Build a themed Login page (features/auth/pages/LoginPage.jsx) — email/password
   form using the existing Input/Button components, no signup form (users are
   created manually in Firestore/Auth console or by a future admin-only
   "Add Accountant" action — stub that as a TODO, don't build it yet).

6. routes/roleGuard.jsx — <ProtectedRoute allowedRoles={['admin']}> style wrapper.
   Wire it into app/routes.jsx: accountant role should NOT be able to access
   /commissions or /expenses initially (mark these two as admin-only for now;
   we'll revisit exact accountant restrictions in a later pass once more modules
   exist) — everything else accessible to both roles.

7. Topbar user menu: show logged-in user's name + role, working logout button.

8. On app load, show a full-screen loading state until restoreSession resolves,
   then redirect to /login if no user, or /dashboard if authenticated.

Keep this module self-contained — do not touch clients/salesmen/etc.
```

**Test before moving on:** Can log in/out with a manually created Firebase Auth user + matching Firestore `users` doc; wrong/no role redirects correctly; refreshing the page keeps the session; admin-only routes block accountant role.

---

### Module 3 — Salesman Profile Module

**Cursor Prompt:**
```
Build the Salesman module. This is foundational — clients and transactions will
reference salesmen, so get the data shape right.

1. Firestore collection `salesmen/{salesmanId}` per schema:
   name, contact, route, area, cashInHand (number, default 0), totalSales (0),
   totalRecovery (0), totalCommissionEarned (0), totalCommissionPaid (0),
   inventoryValue (0), active (true), createdAt, updatedAt.
   Note: cashInHand/totalSales/etc are READ-ONLY here — they'll only be written
   by Cloud Functions in later modules (transactions/recoveries/commission). For
   now, just display them (will show 0 for all new salesmen).

2. features/salesmen/salesmenService.js — CRUD: addSalesman, updateSalesman,
   deactivateSalesman (soft delete via active:false, never hard-delete), 
   getSalesmen (with pagination), getSalesmanById.

3. features/salesmen/salesmenSlice.js — normalized state { byId, allIds, status,
   filters: { search, area, activeOnly } }.

4. Pages:
   - SalesmenListPage: table showing name, area, route, contact, cashInHand,
     totalSales, active toggle badge. Search bar (by name/route), area filter
     dropdown, "Add Salesman" button opening a Modal form.
   - SalesmanDetailPage (/salesmen/:id): profile header card + tabs placeholder
     ("Overview", "Inventory", "Transactions", "Recoveries", "Commission" — tabs
     other than Overview show "Available once that module is built").
     Overview tab shows all profile fields read-only stat cards using the theme's
     Card + Badge components (e.g. cashInHand in a gold-accented card, totalSales
     in a teal-accented card).

5. Add/Edit Salesman form: name*, contact* (basic phone format validation), route,
   area, active toggle. Validation: name and contact required.

6. Wire real /salesmen route into app/routes.jsx (replace placeholder), add
   working sidebar nav icon/link.

Keep report filters (weekly/monthly/custom date range mentioned in the spec) as a
UI placeholder only for now — real filtering logic comes in the Reports module
once there's transaction/recovery data to filter.
```

**Test before moving on:** Add/edit/deactivate salesmen, search and area filter work, detail page loads with correct stat cards, reactivating a deactivated salesman works.

---

### Module 4 — Client (Shop) Profile Module

**Cursor Prompt:**
```
Build the Client (Shop) module. Depends on the Salesman module — every client must
be linked to exactly one salesman.

1. Firestore collection `clients/{clientId}`:
   shopName, serialNumber (must be unique — enforce via a Firestore query check
   before create, show inline error if taken), ownerName, city, gps: {lat, lng}
   (optional, two number inputs for now — a map picker can come later), creditLimit
   (number), creditLimitEnabled (bool), defaultDiscountPercent (number, 0-100),
   salesmanId, salesmanName (denormalized — fetch salesman name at save time),
   totalPurchase (0), totalCredit (0), totalRecovery (0), balance (0), active (true),
   createdAt, updatedAt.
   Same rule as salesmen: totalPurchase/totalCredit/totalRecovery/balance are
   READ-ONLY display fields for now, written later by transaction/recovery Cloud
   Functions.

2. features/clients/clientsService.js — CRUD + isSerialNumberTaken(serialNumber)
   check + getClientsBySalesman(salesmanId).

3. features/clients/clientsSlice.js — normalized state with filters: { search
   (by name/serial/city), salesmanId, city, activeOnly }.

4. Pages:
   - ClientsListPage: table with shopName, serialNumber, ownerName, city,
     salesmanName, balance (color-coded: teal if credit owed to shop is 0/negative
     handled correctly — clarify sign convention: balance > 0 means shop owes
     money, show in danger/brick color; balance <= 0 shown in success/sage color),
     active badge. Filters: search, salesman dropdown, city dropdown. "Add Client"
     button.
   - ClientDetailPage (/clients/:id): profile header (shop name, serial, owner,
     city, linked salesman as a clickable chip to SalesmanDetailPage), GPS shown
     as a small "View on map" link (opens Google Maps URL with the coordinates —
     no embedded map needed yet), stat cards for totalPurchase/totalCredit/
     totalRecovery/balance, credit limit shown with the on/off toggle status,
     default discount %. Tabs placeholder: "Transactions", "Recoveries", "Returns"
     (each: "Available once that module is built").

5. Add/Edit Client form: all fields above. serialNumber and shopName required,
   uniqueness check on serialNumber (skip check against itself when editing).
   salesmanId as a searchable Select populated from the salesmen collection
   (active salesmen only in the dropdown).

6. Also add a "Clients" tab/section on SalesmanDetailPage (Module 3) that lists
   clients linked to that salesman — go back and add this now that clients exist.

Wire real /clients route in, sidebar link, done.
```

**Test before moving on:** Add/edit clients, serial number uniqueness enforced, salesman linkage works both directions (client shows salesman, salesman shows their clients), search/filters work, balance color-coding correct.

---

### Module 5 — Inventory Module (Main Office Stock)

**Cursor Prompt:**
```
Build the main Inventory module (office-level stock, before any is issued to
salesmen — salesman-side inventory comes in the next module).

1. Firestore collection `inventory/{itemId}`:
   itemName, unit ("yard", fixed for now), costPricePerYard, ratePerYard,
   stockYards, stockValue (= stockYards * costPricePerYard, keep this derived
   value updated on every stock change), createdAt, updatedAt.

2. features/inventory/inventoryService.js — CRUD + a dedicated
   adjustStock(itemId, deltaYards, reason) function that increments/decrements
   stockYards and recalculates stockValue in a single Firestore transaction
   (use runTransaction, not a plain update, to avoid race conditions since this
   will later be called from the Stock Issue module too).

3. features/inventory/inventorySlice.js — normalized state.

4. Pages:
   - InventoryListPage: table of items — itemName, costPricePerYard,
     ratePerYard, stockYards, stockValue. Summary card at top: total stock
     value across all items (this feeds the Dashboard later). "Add Item" and
     "Adjust Stock" (manual correction, e.g. damage/audit) actions.
   - Add/Edit Item form: itemName*, unit (locked to "yard"), costPricePerYard*,
     ratePerYard*. Note in the UI that ratePerYard here is the DEFAULT rate —
     salesmen can override it per-transaction later.
   - Adjust Stock modal: itemId (select), delta (+/- yards), reason (text,
     required, e.g. "audit correction", "damaged goods") — calls
     adjustStock() and logs to a simple `inventoryAdjustments` collection
     (itemId, delta, reason, adjustedBy, date) for audit trail.

Do not build Stock Issue (main → salesman transfer) yet — that's the next module
and needs both this and the Salesman module complete.
```

**Test before moving on:** Add items, adjust stock up/down, stockValue recalculates correctly, adjustment log records entries, negative stock is either prevented or clearly flagged (confirm your preference — recommend preventing stockYards from going below 0 with a clear error).

---

### Module 6 — Stock Issue Module (Main → Salesman Transfer)

**Cursor Prompt:**
```
Build Stock Issue: moving inventory from the main office stock into a specific
salesman's inventory. Depends on Inventory (Module 5) and Salesman (Module 3)
modules both being complete.

1. Firestore collection `stockIssues/{issueId}`: salesmanId, salesmanName,
   itemId, itemName, yards, valueAtCost (yards * item's costPricePerYard AT
   issue time — snapshot it, don't recompute later even if cost price changes),
   issuedBy, date, notes.

2. Firestore collection `salesmanInventory/{salesmanId}_{itemId}` (composite doc
   id): salesmanId, salesmanName, itemId, itemName, yards, valueAtCost, updatedAt.

3. features/inventory/stockIssueService.js — issueStock(salesmanId, itemId,
   yards, notes) must run as a single Firestore transaction that:
   a. Reads the inventory/{itemId} doc, verifies stockYards >= yards requested,
      throws a clear error if not enough stock.
   b. Decrements inventory/{itemId}.stockYards and stockValue.
   c. Upserts salesmanInventory/{salesmanId}_{itemId} — increments yards and
      valueAtCost (create the doc if it doesn't exist yet).
   d. Writes the stockIssues log doc.
   e. Updates salesmen/{salesmanId}.inventoryValue (increment by valueAtCost).

4. UI:
   - New "Issue Stock" page/modal, accessible from both InventoryListPage and
     SalesmanDetailPage: salesman select (if not pre-filled from context), item
     select, yards input, notes. Shows available stockYards for the selected
     item live as a hint, disables submit if yards > available.
   - Add a "Stock Issue History" table on this page (or a dedicated tab) showing
     recent issues, filterable by salesman and item.
   - Now build out the "Inventory" tab on SalesmanDetailPage (was a placeholder
     since Module 3): show that salesman's salesmanInventory rows (item, yards,
     valueAtCost) plus a running total matching salesmen.inventoryValue.

Test edge case explicitly: issuing more yards than available in main inventory
must be blocked with a clear error, and must not partially write any documents
(the Firestore transaction should guarantee this).
```

**Test before moving on:** Issue stock to a salesman, verify main inventory decreases, salesman inventory + salesmen.inventoryValue increase correctly, over-issuing is blocked cleanly, issue history log is accurate.

---

### Module 7 — Transaction Module (Sale)

**Cursor Prompt:**
```
Build the Sale/Transaction module — the core revenue-recording flow. Depends on
Clients, Salesmen, and Stock Issue (salesman must have inventory to sell) modules.

1. Firestore collection `transactions/{transactionId}`: clientId, clientName,
   salesmanId, salesmanName, itemId, itemName, yards, ratePerYard,
   discountPercent, grossAmount (yards * ratePerYard), discountAmount
   (grossAmount * discountPercent / 100), netAmount (gross - discount),
   paymentType: "cash" | "credit", date, createdBy, receiptSent (bool, default
   false), status: "active" (default — will change to "returned"/
   "partially_returned" once the Returns module exists).

2. src/utils/calculations.js — add pure functions: calcGrossAmount(yards, rate),
   calcDiscountAmount(gross, percent), calcNetAmount(gross, discount). Use these
   everywhere, never inline the math in components.

3. features/transactions/transactionService.js — createTransaction(data) must
   run as a Firestore transaction that:
   a. Verifies the salesman has enough yards of that item in
      salesmanInventory/{salesmanId}_{itemId} — block with clear error if not.
   b. Decrements salesmanInventory yards + valueAtCost proportionally, and
      decrements salesmen.inventoryValue.
   c. Writes the transaction doc.
   d. Updates clients/{clientId}: totalPurchase += netAmount; if paymentType is
      "credit", also totalCredit += netAmount and balance += netAmount.
   e. Updates salesmen/{salesmanId}.totalSales += netAmount.
   f. If paymentType is "cash", increment salesmen/{salesmanId}.cashInHand by
      netAmount (cash sales collected by the salesman on the spot).

4. UI:
   - New Sale form (accessible from a prominent "+ New Sale" button in the
     Transactions nav, and also launchable pre-filled from ClientDetailPage or
     SalesmanDetailPage): client select (searchable by name/serial), salesman
     auto-fills from the client's linked salesman but is editable (in case a
     different salesman is making this particular sale — allow override), item
     select (shows that salesman's available yards for the item as a hint),
     yards input, rate (auto-filled from inventory's ratePerYard, editable),
     discount % (auto-filled from client's defaultDiscountPercent, editable),
     payment type toggle (cash/credit — if client has creditLimitEnabled and
     this credit sale would push balance over creditLimit, show a clear warning
     but allow admin/accountant to override and proceed).
     Live-computed summary: gross, discount amount, net amount.
   - TransactionsListPage: table (date, client, salesman, item, yards, net
     amount, payment type badge, status). Filters: date range, client, salesman,
     payment type. 
   - Now build the "Transactions" tab on both ClientDetailPage and
     SalesmanDetailPage (were placeholders) showing filtered transaction lists.
   - Receipt: after successful sale, show a receipt preview (shop name, item,
     yards, rate, discount, net amount, date, salesman) with a "Share on
     WhatsApp" button using src/utils/whatsapp.js — build a buildReceiptText()
     formatter and a wa.me link (if client has a phone number on file; otherwise
     show a generic share/copy-text fallback). Mark receiptSent true on send.

This is the most business-critical module — be careful with the Firestore
transaction in step 3; all five effects must succeed or fail together.
```

**Test before moving on:** Complete a cash sale and a credit sale, verify salesman inventory decreases, client totals/balance update correctly, salesman totalSales/cashInHand update correctly, credit-limit warning triggers appropriately, WhatsApp receipt link opens correctly formatted text, insufficient-stock case is blocked cleanly.

---

### Module 8 — Recovery Module

**Cursor Prompt:**
```
Build the Recovery module — recording payments collected against a client's
credit balance. Depends on Clients and Salesmen modules.

1. Firestore collection `recoveries/{recoveryId}`: clientId, clientName,
   salesmanId, salesmanName, amount, paymentMode: "cash" | "pos" | "bank", date,
   createdBy, receiptSent (bool).

2. features/recoveries/recoveryService.js — createRecovery(data) as a Firestore
   transaction:
   a. Updates clients/{clientId}: totalRecovery += amount; balance -= amount
      (do not let balance go below 0 — if the entered amount exceeds the
      outstanding balance, show a confirm dialog: "This exceeds the client's
      current balance of X — proceed anyway?" and allow it, since in practice
      advance payments happen, but flag it clearly in the UI).
   b. Updates salesmen/{salesmanId}.totalRecovery += amount.
   c. If paymentMode is "cash", increment salesmen/{salesmanId}.cashInHand by
      amount (salesman is holding this cash until they deposit it — see next
      module). If paymentMode is "pos" or "bank", do NOT touch cashInHand —
      it went straight to office accounts; instead increment
      officeBalances/summary.cashInBank by amount.

3. UI:
   - New Recovery form (launchable standalone and pre-filled from
     ClientDetailPage/SalesmanDetailPage): client select, salesman
     (auto-fill from client, editable), amount, payment mode, date. Shows the
     client's current outstanding balance live as context.
   - RecoveriesListPage: table with filters (date range, client, salesman,
     payment mode).
   - Build "Recoveries" tab on ClientDetailPage and SalesmanDetailPage.
   - WhatsApp receipt using the same utils/whatsapp.js pattern as Module 7
     (add a buildRecoveryReceiptText() formatter).
```

**Test before moving on:** Record cash/POS/bank recoveries, client balance decreases correctly (with over-payment confirmation working), salesman cashInHand updates only for cash mode, office cashInBank updates for POS/bank mode, receipts generate correctly.

---

### Module 9 — Salesman Cash Deposit Module

**Cursor Prompt:**
```
Build the small but important Salesman Deposit flow: when a salesman hands over
collected cash to the office. Depends on Salesman module and the officeBalances
singleton doc (create it now if it doesn't exist).

1. Firestore collection `salesmanDeposits/{depositId}`: salesmanId,
   salesmanName, amount, mode: "cash" | "bank" (bank = salesman deposited
   directly to company bank account), date, receivedBy.

2. Firestore doc `officeBalances/summary`: cashInHand, cashInBank (create on
   first write if missing, initialize both to 0).

3. features/salesmen/depositService.js — recordDeposit(data) as a Firestore
   transaction:
   a. Verify amount <= salesmen/{salesmanId}.cashInHand — block with a clear
      error if the salesman doesn't have that much recorded cash in hand.
   b. Decrement salesmen/{salesmanId}.cashInHand by amount.
   c. Increment officeBalances/summary.cashInHand (if mode "cash") or
      cashInBank (if mode "bank") by amount.

4. UI:
   - "Deposit Cash" button on SalesmanDetailPage opening a modal: amount
     (shows current cashInHand as a live max/hint), mode toggle, date.
   - Add a "Deposits" tab on SalesmanDetailPage listing deposit history.

This is a short module — keep it tight and don't scope-creep into the Dashboard,
which will surface officeBalances later.
```

**Test before moving on:** Deposit cash/bank amounts, salesman cashInHand decreases, office balances increase in the right bucket, over-deposit is blocked.

---

### Module 10 — Return Module

**Cursor Prompt:**
```
Build the Returned Stock module. Depends on Transactions (Module 7) — returns
must reference an original sale.

1. Firestore collection `returns/{returnId}`: originalTransactionId, clientId,
   clientName, salesmanId, salesmanName, itemId, itemName, yardsReturned,
   status: "pending" | "confirmed" | "rejected" (default "pending"),
   reviewedBy, reviewedAt, date, notes.

2. features/returns/returnService.js:
   - createReturn(data): salesman/admin initiates a return referencing an
     original transaction; just writes the doc as "pending" — no balance
     changes yet.
   - confirmReturn(returnId): ADMIN ONLY. Runs a Firestore transaction that:
     a. Verifies yardsReturned <= the original transaction's yards (and
        accounts for any prior partial returns against the same transaction —
        sum existing confirmed returns for that transactionId first).
     b. Increments salesmanInventory back (item goes back into the salesman's
        stock, since they physically have the cloth again) and
        salesmen.inventoryValue.
     c. Reverses the proportional netAmount from clients.totalPurchase and,
        if the original sale was credit, also reverses clients.totalCredit and
        clients.balance (subtract the returned proportion). If it was cash,
        reverse salesmen.totalSales and salesmen.cashInHand proportionally too
        (assume a cash refund was given from the salesman's hand — flag this
        assumption clearly in a code comment, it's the one part of this module
        the business owner should confirm since the source doc doesn't specify
        cash refund handling explicitly).
     d. Updates the original transaction's status to "returned" or
        "partially_returned" (yardsReturned == original yards vs less).
     e. Sets returns/{returnId}.status = "confirmed", reviewedBy, reviewedAt.
   - rejectReturn(returnId, reason): just sets status "rejected", no balance
     changes.

3. UI:
   - ReturnsListPage: table filterable by status (pending/confirmed/rejected),
     salesman, client. Pending returns are visually distinct (gold/warn accent).
     Admin sees "Confirm" / "Reject" action buttons on pending rows;
     accountant sees read-only (confirm the accountant restriction here —
     recommend returns confirmation stays admin-only since it moves real
     balances).
   - "Report a Return" form: launchable from a transaction row in
     TransactionsListPage or from ClientDetailPage's Transactions tab — pre-
     fills originalTransactionId, clientId, salesmanId, itemId from the
     selected transaction; asks for yardsReturned + notes.
   - Build "Returns" tab on ClientDetailPage.

Flag clearly in your response which assumptions you made about cash-refund
handling in step 2c so they can be confirmed against real business practice.
```

**Test before moving on:** Create a return against a real transaction, confirm it, verify inventory/client/salesman/transaction status all update correctly for both a full and a partial return on both cash and credit sales; reject flow leaves everything untouched.

---

### Module 11 — Vendor Module

**Cursor Prompt:**
```
Build the Vendor module — tracking money owed to/paid to cloth suppliers. This is
independent of clients/salesmen and can be built standalone.

1. Firestore collection `vendors/{vendorId}`: name, contact, totalPaid,
   totalOwed, totalAdvance, active, createdAt.

2. Firestore collection `vendorTransactions/{vendorTxnId}`: vendorId,
   vendorName, type: "purchase" | "payment" | "advance", amount, date,
   createdBy, receiptSent (bool).
   Semantics: "purchase" increases totalOwed (we bought cloth on credit from
   them), "payment" decreases totalOwed and increases totalPaid, "advance"
   increases totalAdvance (we paid ahead of a purchase — should later be
   deductible against a future purchase, but keep that reconciliation manual/
   visible for now rather than automatic, to avoid over-engineering an edge case
   the source doc doesn't fully specify).

3. features/vendors/vendorService.js — CRUD for vendors + addVendorTransaction()
   which runs a Firestore transaction updating the relevant vendor totals based
   on type.

4. UI:
   - VendorsListPage: table (name, contact, totalOwed, totalPaid, totalAdvance),
     "Add Vendor" button.
   - VendorDetailPage: profile + transaction history table + "Record Purchase" /
     "Record Payment" / "Record Advance" actions (a single form with a type
     selector is fine).
   - WhatsApp receipt for vendor transactions (reuse utils/whatsapp.js pattern,
     add buildVendorReceiptText()).

Keep this module fully decoupled from clients/salesmen/transactions — no shared
writes with those collections.
```

**Test before moving on:** Add vendors, record purchase/payment/advance, totals update correctly per type, WhatsApp receipt generates.

---

### Module 12 — Expense Module (Office + Salesman-Linked)

**Cursor Prompt:**
```
Build the Expense module — two flavors: general office expenses and
salesman-attributed expenses (e.g. fuel). Depends on Salesman module for the
second part. Admin-only per the role restriction set up in Module 2 — confirm
this still makes sense once you see the UI, and adjust the role guard if the
business wants accountant to log expenses too (flag this as an open question in
your response rather than silently deciding).

1. Firestore collection `expenses/{expenseId}`: category, amount,
   source: "cash" | "bank", date, addedBy, notes.
   On create: increment officeBalances/summary.cashInHand or cashInBank
   (whichever source) DOWN by amount (this is money leaving the business) —
   run as a Firestore transaction, block if it would drive the relevant
   balance negative (or allow with a warning — pick allow-with-warning to match
   the pattern used in Recovery over-payment, for consistency).

2. Firestore collection `salesmanExpenses/{expenseId}`: salesmanId,
   salesmanName, category, amount, date, addedBy, notes.
   On create: does NOT touch officeBalances (assume these are pre-approved
   allowances, not office cash draws — flag this assumption clearly, it's
   another spot the source doc is ambiguous on and should be confirmed against
   real practice). Just logs against the salesman for reporting/commission
   context.

3. UI:
   - ExpensesListPage: two tabs — "Office Expenses" and "Salesman Expenses".
     Office tab: table + filters (category, date range, source), "Add Expense"
     form (category as a free-text-with-suggestions input, amount, source,
     date, notes).
     Salesman tab: table + filters (salesman, category, date range), "Add
     Expense" form (salesman select, category, amount, date, notes).
   - Build an "Expenses" tab on SalesmanDetailPage showing that salesman's
     salesmanExpenses history.

Explicitly call out both flagged assumptions above in your response so they can
be confirmed before this goes to production use.
```

**Test before moving on:** Add office expenses (verify office balance decreases correctly by source), add salesman expenses (verify they log against the right salesman without touching office balances), filters work on both tabs.

---

### Module 13 — Commission Module

**Cursor Prompt:**
```
Build the Commission module. Depends on Transactions and Recoveries having real
data. The exact commission formula is an OPEN POINT from the requirements doc —
build this module with a configurable formula rather than hardcoding one, since
the real formula isn't confirmed yet.

1. Firestore collection `commissionRules/{ruleId}` (new, not in original schema
   — needed to make the formula configurable): salesmanId (or "default" for a
   global rule), basis: "sales" | "recovery", type: "percentage" | "flat_per_yard",
   rate (number), effectiveFrom (date). This lets different salesmen have
   different rates, and rates to change over time without rewriting history.

2. Firestore collection `commissions/{commissionId}`: salesmanId, salesmanName,
   periodStart, periodEnd, basis, rate, basisAmount (total sales or recovery in
   that period), earnedAmount (calculated), paidAmount (0 default),
   remainingBalance (= earnedAmount - paidAmount), adjustments: array of
   { amount, reason, date, addedBy }, generatedAt, generatedBy.

3. src/utils/calculations.js — add calcCommission(basisAmount, rule) pure
   function (percentage: basisAmount * rate/100; flat_per_yard: needs total
   yards sold in period, not just amount — so this function should accept
   either amount or yards depending on rule.type, document this clearly).

4. features/commissions/commissionService.js:
   - CRUD for commissionRules (admin sets rates per salesman).
   - generateCommission(salesmanId, periodStart, periodEnd): queries
     transactions (if basis "sales") or recoveries (if basis "recovery") for
     that salesman within the date range, sums the basis amount, applies the
     active rule, writes a new commissions doc. Does NOT auto-run — must be
     triggered manually by admin per period, since payout timing varies
     (per the source doc).
   - recordCommissionPayment(commissionId, amount): updates paidAmount and
     remainingBalance, also bumps salesmen.totalCommissionPaid.
   - addCommissionAdjustment(commissionId, amount, reason): pushes to the
     adjustments array and adjusts earnedAmount/remainingBalance accordingly —
     needed for manual corrections per the source doc's requirement.

5. UI:
   - CommissionRulesPage: table of rules per salesman, add/edit rule form.
   - CommissionsListPage: table (salesman, period, basisAmount, earnedAmount,
     paidAmount, remainingBalance), date range + salesman filters, "Generate
     Commission" action (select salesman + period + confirms the active rule
     being applied before generating).
   - CommissionDetailPage or expandable row: shows adjustments history,
     "Record Payment" action, "Add Adjustment" action.
   - Build "Commission" tab on SalesmanDetailPage (was a placeholder since
     Module 3) showing that salesman's commission history + totals.

In your response, clearly state that the commission formula is user-configurable
per the open point in the requirements doc, and ask for the actual rates/basis
to be confirmed and entered via CommissionRulesPage rather than assumed.
```

**Test before moving on:** Set a commission rule for a salesman, generate a commission for a period against real transaction/recovery data, verify the math, record a partial payment, add a manual adjustment, verify remainingBalance stays accurate throughout.

---

### Module 14 — Global Search Module

**Cursor Prompt:**
```
Build a global search accessible from the Topbar search bar (placeholder since
Module 1). Needed given the 1000+ shop scale.

1. features/search/searchService.js — searchAll(query) that runs parallel
   Firestore queries against clients (by shopName prefix and serialNumber exact/
   prefix match — Firestore doesn't do full substring search, so use a
   startAt/endAt prefix query on a lowercased searchable field; add a
   `shopNameLower` and add similar lowercase fields to clients/salesmen if not
   already present — go back and add these fields via the existing add/edit
   services in Modules 3 and 4) and salesmen (by name, area).

2. Topbar search bar: debounced input (use existing useDebounce hook if built,
   otherwise add one to src/hooks/), dropdown results grouped by "Clients" and
   "Salesmen", each result navigates to its detail page. Empty/no-results state.

3. Also add a dedicated /search results page for when the user presses Enter
   (rather than just picking a dropdown result), showing fuller result cards
   with city/area/salesman context, useful for the "search by customer name/
   serial number/city" requirement specifically — add a city filter here since
   the source doc calls it out explicitly alongside name/serial.

Keep this additive — do not modify existing clients/salesmen business logic,
only add the lowercase searchable fields and the new search feature.
```

**Test before moving on:** Search by partial shop name, exact/partial serial number, city, and salesman name/area all return correct results; debounce prevents excessive Firestore reads.

---

### Module 15 — Reports Module

**Cursor Prompt:**
```
Build the Reports module — cross-cutting filtered views the source doc calls
for at both the client and salesman level. Depends on Transactions, Recoveries,
Returns, Expenses, and Commissions all having real data.

1. features/reports/reportService.js — functions to query and aggregate:
   - getClientReport(clientId, dateRange): transactions, recoveries, returns
     for that client in range, plus totals.
   - getSalesmanReport(salesmanId, dateRange): sales, recoveries, expenses,
     commission, deposits for that salesman in range, plus totals — this is the
     "salesman-wise report" called out in the Admin Overview requirement.
   - getAreaReport(area, dateRange): aggregated sales/recovery across all
     clients in an area (source doc's "beyond date range" open point — area-wise
     is one confirmed useful cut, add it now).
   - getItemReport(itemId, dateRange): total yards sold, revenue, by item —
     covers the "item-wise" filter mentioned as an open point.

2. UI: ReportsPage with a report-type selector (Client / Salesman / Area / Item),
   dynamic filter panel (date range always present; entity select relevant to
   the chosen type), results table + summary totals row, "Export" button
   (CSV export using a simple client-side CSV builder — no library needed for
   this scale, write a small utils/csvExport.js).

3. Also retrofit the "report filter" UI placeholders left on ClientDetailPage
   (Module 4) and SalesmanDetailPage (Module 3) to use real date-range filtering
   on their Transactions/Recoveries tabs now that this logic exists — extract
   shared filtering logic into a hook (useDateRangeFilter) so it's not
   duplicated across pages.

Confirm with the business which additional report filters (beyond client/
salesman/area/item) are actually needed before over-building this module — the
source doc explicitly lists this as unresolved.
```

**Test before moving on:** Each report type returns correct aggregated numbers cross-checked manually against a few known transactions/recoveries, CSV export opens correctly in Excel, date range filters work everywhere they're wired in.

---

### Module 16 — Admin Dashboard

**Cursor Prompt:**
```
Build the Admin Overview dashboard — the landing page after login. Depends on
essentially every prior module having real data to summarize.

1. features/dashboard/dashboardService.js — a single getDashboardSummary()
   that reads: officeBalances/summary (cashInHand, cashInBank), sum of all
   clients.balance where balance > 0 (total credit outstanding), sum of
   transactions.netAmount within a selectable report-filter range (total
   sales), sum of recoveries.amount within that range (total recovery), sum of
   inventory.stockValue across all items, sum of vendors.totalOwed
   (vendor accounts summary), plus a per-salesman rollup for the salesman-wise
   report table.
   For performance at 1000+ shops, prefer reading the already-denormalized
   totals on client/salesman docs over re-summing all transactions live —
   only fall back to summing raw transactions for the date-ranged "total sales/
   total recovery" figures, since those need to respect the filter.

2. UI: DashboardPage with:
   - Top stat cards row: Cash in Hand, Cash in Bank, Total Credit Outstanding,
     Inventory Value, Total Vendor Owed — each using the theme's accent colors
     meaningfully (e.g. danger accent if credit outstanding is trending up,
     success/teal for healthy cash position — keep this simple, no fake
     "trending" data, just current-value coloring).
   - Date range selector controlling a "Total Sales" and "Total Recovery" card
     pair, plus a simple bar or line chart (use a lightweight charting approach
     consistent with the theme colors — recharts is fine if already a project
     dependency, otherwise keep it to styled stat cards without a chart library
     dependency for MVP).
   - Salesman-wise summary table (name, sales, recovery, cashInHand, commission
     remaining) — links out to each SalesmanDetailPage.
   - Recent activity feed: last ~10 transactions/recoveries combined, most
     recent first, each linking to its client/salesman.

3. Wire this as the default route after login (replace whatever /dashboard
   placeholder currently renders).

This module should be read-only/aggregation only — do not add any new write
paths here.
```

**Test before moving on:** All stat cards show numbers that reconcile against manual spot-checks of underlying collections, date range filter correctly recomputes sales/recovery figures, salesman table and activity feed link out correctly.

---

### Module 17 — WhatsApp Receipts Polish Pass

**Cursor Prompt:**
```
Do a focused pass across the three receipt touchpoints (Transactions, Recoveries,
Vendor Transactions) to make sure WhatsApp sharing is consistent and reliable.

1. Consolidate all receipt text builders into src/utils/whatsapp.js with a
   shared buildReceiptText(type, data) function (type: "sale" | "recovery" |
   "vendor") producing a clean, consistently formatted message including a
   simple text-based "letterhead" line (business name — make this configurable
   via a src/config/business.js constants file: businessName, businessPhone,
   businessAddress — currently hardcode placeholder values and note in your
   response that these need to be filled in with real business details).

2. Ensure the wa.me link correctly URL-encodes the message and handles the case
   where the client/vendor has no phone number on file (fallback: show a "Copy
   receipt text" button using the Clipboard API instead of a broken WhatsApp
   link).

3. Add a small reusable ReceiptPreview component (components/ui or a new
   features/receipts/ folder) used by all three modules instead of each having
   its own inline receipt markup — refactor Transactions/Recoveries/Vendor
   modules to use it.

This is a refactor/consistency pass — do not change any underlying business
logic from Modules 7, 8, or 11.
```

**Test before moving on:** All three receipt types produce correctly formatted, correctly encoded WhatsApp messages; no-phone-number fallback works; visual consistency across all three.

---

### Module 18 — QA, Hardening & Deploy

**Cursor Prompt:**
```
Final hardening pass before deployment.

1. Firestore Security Rules: write rules enforcing that only authenticated
   users with role "admin" or "accountant" (checked against the users/{uid}
   doc) can read/write any collection, with the admin-only restrictions
   confirmed during Module 2/12 (commissions, expenses, return confirmation)
   enforced server-side too, not just in the UI. Deny all by default.

2. Add loading states and error boundaries consistently — audit each feature's
   pages for missing loading/error/empty states and fix gaps.

3. Add form validation consistency pass — ensure every required field across
   all modules shows inline errors, not just silent failures.

4. Review every Firestore transaction written across Modules 6-13 (stock issue,
   sale, recovery, deposit, return confirm, expense, commission) and confirm
   each one is atomic (uses runTransaction, not sequential separate writes)
   since these are the money-critical paths.

5. Set up Firebase Hosting config, environment variable handling for
   production build, and a basic README documenting the .env variables needed,
   Firestore indexes required (list any composite indexes the app's queries
   need — check the Firebase console for index-required errors during testing
   and document them here), and deployment steps.

6. Do a final pass replacing any remaining placeholder/TODO text left from
   earlier modules (e.g. business.js constants from Module 17) and flag
   anything still outstanding in your response.
```

**Test before moving on:** Security rules block unauthorized access when tested with an unauthenticated/wrong-role request, no console errors across all modules, production build succeeds, deploys cleanly to Firebase Hosting.

---

## PART 3 — OPEN QUESTIONS TO RESOLVE (carried over from the source requirements doc)

These were explicitly unresolved in the requirements document and should be confirmed with the business owner before or during the relevant module — they're also flagged inline in the prompts above:

1. **Commission formula** — Module 13 builds a configurable rule engine specifically because this isn't confirmed yet. Get the real formula(s) before generating any real commission runs.
2. **Additional report filters** — Module 15 ships with client/salesman/area/item cuts as reasonable defaults; confirm if others are actually needed.
3. **Accountant role scope** — Module 2 makes commissions, expenses, and return-confirmation admin-only as a starting default. Confirm this matches what the business wants before relying on it.
4. **Cash refund handling on returns** — Module 10 makes an explicit assumption about reversing salesman cash-in-hand on cash-sale returns; confirm this matches real practice.
5. **Salesman expense accounting** — Module 12 assumes salesman expenses don't draw from office cash balances; confirm this is correct.

---

## PART 4 — WHAT'S DELIBERATELY OUT OF SCOPE HERE

- The **Salesman Mobile App** (offline-first, installable, Urdu-optional) — separate architecture doc needed, likely React Native or Flutter, with a local-first DB (WatermelonDB, SQLite, or Firestore's own offline persistence if React Native + Firebase JS SDK is used) and a sync/conflict-resolution strategy once online. Suggest doing this as Phase 2 of the overall project, after the web app's data model has been validated in real use.
- WhatsApp Business API integration (current plan uses free `wa.me` deep links — upgrade path exists if volume/automation needs grow).
- GPS map picker UI (client GPS is captured as raw lat/lng for now; a visual map picker is a nice-to-have polish item, not blocking).

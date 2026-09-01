# Bazaar Ledger — Wholesale Cloth Admin

Web admin portal for wholesale cloth distribution (Admin + Accountant). Built with React 18, Vite, Redux Toolkit, Firebase, Tailwind (custom **Bazaar** theme), and ImageKit.

Money is stored as **PKR numbers rounded to 2 decimal places**. All discount / net / commission math lives in `src/utils/calculations.js`.

## Setup

1. Copy environment variables:

```bash
cp .env.example .env
```

On Windows PowerShell: `Copy-Item .env.example .env`

2. Fill Firebase web-app keys from the Firebase console (Project settings → Your apps).

3. Create at least one user:
   - Firebase Authentication → Email/password user
   - Firestore `users/{uid}` document:

```
name: "Admin"
email: "you@example.com"
role: "admin"          # or "accountant"
active: true
createdAt: <timestamp>
```

4. Install and run:

```bash
npm install
npm run dev
```

## ImageKit

Public key + URL endpoint go in `.env`. The **private key must not** be in the client. Upload auth will be a Cloud Function later (`authenticationEndpoint`).

## Role defaults (confirm with the business)

- Accountant cannot open `/expenses` or `/commissions`
- Return confirmation is admin-only in the UI
- Server rules also restrict expenses/commissions/commissionRules to admin

## Assumptions to confirm before production

1. **Commission formula** is user-configurable (percentage of sales/recovery, or flat per yard). Enter real rates on the Commissions → Rules tab — nothing is hardcoded.
2. **Cash-sale returns** refund from the salesman’s `cashInHand` (cloth is also returned to salesman inventory).
3. **Salesman expenses** are logged for reporting only and do **not** draw from `officeBalances`.
4. **Accountant scope** — commissions, expenses, and return confirmation are admin-only for now.
5. Client **WhatsApp number** is stored as optional `contact` on the client doc (not in the original schema, needed for receipts).

## Firestore indexes

If the console prompts for a composite index while testing, add it and record it in `firestore.indexes.json`. Prefix search uses `shopNameLower` / `nameLower` / `areaLower` / `cityLower`.

Likely single-field indexes (usually auto-created): `date`, `serialNumber`, `salesmanId`, `clientId`, `vendorId`.

## Deploy

```bash
npm run build
firebase deploy
```

Hosting rewrites all routes to `index.html` (SPA). Production env vars must be present at **build** time (`VITE_*`).

## Business letterhead

Edit `src/config/business.js` (`name`, `phone`, `address`) before sending real WhatsApp receipts.

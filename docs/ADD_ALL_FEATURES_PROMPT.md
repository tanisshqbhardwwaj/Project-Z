# PASTE THIS ENTIRE FILE into the React + Spring Boot project chat

You are adding **full Project Z feature parity** to this React + Java Spring Boot app. The current clone is too thin. Do **not** build a smaller MVP. Port **every** feature, screen, API, formula, and edge case from the original Next.js Project Z.

If a feature exists in the original, it must exist here with the same business rules. Ask only if a rule is truly ambiguous. After each slice, list what you added vs what is still missing.

---

## A. What the original uses → what you must use here

Do not keep Next.js / Prisma / NextAuth. Map 1:1:

| Original (Project Z Next.js) | Use in this rebuild |
|---|---|
| Next.js 16 App Router pages | React (Vite) + React Router |
| React 19, TypeScript | React 18+ / 19, TypeScript |
| Tailwind 4 + Radix / shadcn + lucide-react | Same UI stack (or equivalent shadcn) |
| TanStack Query + Zustand | Same |
| React Hook Form + Zod | Same on frontend; Bean Validation + DTO records on backend |
| date-fns, react-day-picker, Recharts | Same |
| jsbarcode (product + bill barcodes) | Same |
| Auth.js (NextAuth) credentials + JWT-style session, 30 days | Spring Security + JWT access/refresh (HttpOnly cookies OK) |
| Argon2id (`@node-rs/argon2`) | Spring Argon2 / BouncyCastle Argon2id (same params: memory 19456, time 2, hash 32, parallelism 1) |
| Prisma + SQLite/Postgres, UUID PKs | JPA + PostgreSQL 16 + Flyway. Port `prisma/schema.prisma` 1:1 |
| Money as BigInt **paise** | Java `Long` paise. Never `double` for money |
| `X-Organization-Id` header + org switch | Same header + `POST /api/v1/organizations/switch` |
| S3 / MinIO + AWS SDK presigned URLs | Spring S3 client (MinIO local, R2/S3 prod) |
| Resend emails (verify, reset, invites) | Resend or Spring Mail, same templates/flows |
| Groq / Gemini / manual AI + Inngest queue (3 retries) | Same providers + `@Async` / queue, 3 retries. HEIC normalize, PDF parse |
| pdf-parse, pdfjs, tesseract.js, heic-convert | Java PDF/image libs + Tesseract or keep a small Node helper; must accept pdf/jpg/png/webp/heic |
| next-intl (`en`, `hi`, `en_hi`) | react-i18n or similar; User.locale same enum |
| Theme light / dark / system (`pz-theme`) | Same |
| In-memory rate limits | Bucket4j / Redis: auth 10/15min, upload 20/hour, AI re-run 30/hour per IP |
| Structured logs + optional Sentry | Logback JSON + optional Sentry |
| Health `GET /api/v1/health` | Same |
| Vitest + Playwright | JUnit + Testcontainers; Vitest + Playwright on frontend |

**Hard rules (copy from original):**
- Multi-tenant: every query filtered by `organizationId`
- Max **3 orgs** per user
- Timezone default `Asia/Kolkata`; attendance uses org-local `YYYY-MM-DD`
- Currency INR, format `en-IN`
- Soft-delete expenses/payments/sales; purchases **cancel** (reverse stock); project delete is owner hard-delete after typing exact name
- Tenant header `X-Organization-Id` on every API after login

---

## B. Product in one paragraph

Project Z is an India-first multi-tenant SaaS. One login, up to 3 organizations. Each org is one of: **CONTRACTOR** (Work Orders + partners), **ARCHITECT** (Projects + collaborators), **BUILDER** (Sites + partners), **SHOPKEEPER** (retail POS, no Projects nav). Shopkeepers also pick a sector: GROCERY, HARDWARE, ELECTRONICS, CLOTHING, PHARMACY, RESTAURANT, GENERAL. Roles: OWNER, PARTNER, ACCOUNTANT, VIEWER, CASHIER. Modules are toggled per org. Nav labels change by business type.

---

## C. Add ALL of these features (nothing optional)

### 1. Auth & account
- Register (name, email, password min 8, optional phone), login, logout
- Email verify + resend; allowlisted beta emails auto-verify
- Register rollback if email send fails in prod
- Forgot / reset password; change password while logged in
- Profile: name, phone, locale
- Rate-limit auth
- Beta allowlist CRUD (owner, max 20) on profile page
- APIs: `/api/v1/auth/register|login|logout|me|verify-email|resend-verification|forgot-password|reset-password|change-password`

### 2. Orgs, onboarding, members, invites
- Onboarding: org name, business type cards; SHOPKEEPER must pick sector + optional Enable Staff
- Extra org via `?new=1` showing `count/3`
- Org switcher
- Settings: name, type, sector, module toggles, enableStaff, unmarkedDayPolicy, weeklyOffDays, payrollRoundTo, defaultCompletionDays, brandName, logo
- Members: invite email + role (7-day token), change role, remove, link member ↔ staff
- Project partner invite (7-day token) + request PENDING/APPROVED/REJECTED
- Owner can delete org when allowed
- APIs: organizations CRUD/list/switch, members, link, invite accept, project-invite accept, beta-test-emails

### 3. RBAC (copy matrix exactly)
- OWNER: everything including org.manage, shop purchase/expense manage, payroll, activity
- PARTNER: assigned projects, shop sales+inventory, view-only purchases/expenses, no payroll
- ACCOUNTANT: all projects, shop view (no purchase manage), staff+payroll
- VIEWER: assigned projects read, financial.view, staff.view
- CASHIER: shop.sales + attendance.view_own only → land on `/shop/invoices/new`
- Staff-only users → `/staff/me`
- Project scope: OWNER/ACCOUNTANT all projects; PARTNER/VIEWER only memberships

### 4. Module flags (hide nav + 403 APIs if off)
`staff`, `shop_sales`, `shop_inventory`, `shop_udhaar`, `shop_purchases`, `shop_expenses`, `shop_activity`, `contractor_boq`, `contractor_material`, `architect_stages`, `builder_units`

Defaults: shop sales/inventory/purchases/expenses/activity ON; udhaar OFF; staff OFF for shop unless enableStaff; contractor BOQ+material ON; architect stages ON; builder units ON.

### 5. Shell / UX (must ship)
- Desktop sidebar: Core / Modules / Tools
- Mobile bottom nav + More sheet + FAB (new expense / new work order)
- Org switcher, theme toggle, unread notification badge
- Command palette **Ctrl/Cmd+K** (nav + remote search + quick actions)
- Global search page
- Form warning vs error (not toast-only)
- Shop Scan in Tools when sales or inventory is on

### 6. Construction dashboard & projects
- Dashboard cards: active count, total contract, expenses, outstanding, expected vs actual profit, recent list
- Projects list + manual create + upload work order
- Detail tabs: overview, work-order, expenses, payments, vendors, documents, reports, activity
- Financial bar: contract, expenses, remaining budget, vendor outstanding, expected/actual profit, utilization%
  - `budget = budgetAmount ?? contract`
  - `expectedProfit = contract - budget`
  - `actualProfit = contract - expenses`
- Nickname vs official name
- Partners: EQUAL / PERCENT (sum 100) / CUSTOM; settlement who-owes-whom (greedy pairing, equal-split remainder +1 paise)
- Merge projects (move finance/docs/members, sum amounts, source ARCHIVED)
- Delete: owner types exact name, hard delete
- Statuses: DRAFT, ACTIVE, IN_PROGRESS, ON_HOLD, COMPLETED, CANCELLED, ARCHIVED
- Work order fields: number, date, client, headOfAccount, timeOfCompletion, paymentTerms, taxInfo

### 7. AI work-order upload
- POST multipart; pdf/jpg/png/webp/heic; rate 20/hour
- Extract: workOrderNumber, workOrderDate, timeOfCompletion, expectedCompletionDate, clientName, headOfAccount, projectName, projectLocation, description, tenderAmount, paymentTerms (value + confidence + accept/edit/reject)
- Queue 3 retries; Groq/Gemini/manual; quota fail → empty fields + manual message
- Completion date from text or `defaultCompletionDays`
- Accept merges AI + corrections → Project + WorkOrder + Document
- Document preview; re-run extraction (30/hour)

### 8. Construction expenses, payments, vendors
- Expenses: project, category (seeded by type), amount, date, vendor optional, receipt; paid/outstanding; soft delete; **edit own within 24h** (isEdited + originalAmount)
- Duplicate warning: same vendor + amount ±1 day (can skip)
- Vendor findOrCreate by normalized unique name
- Payments: VENDOR / SETTLEMENT / OTHER; methods CASH UPI BANK CARD CHEQUE CREDIT OTHER; allocate to expenses
- Vendor ledger: bills minus payments, running balance
- Documents list + preview (WORK_ORDER, RECEIPT, INVOICE, OTHER)
- Audit activity feed
- Expense report API

### 9. Staff / labour
- CRUD staff: name, phone, roleTitle, DAILY/MONTHLY wage, OT rate, joinedAt, LEFT, link user
- Wage history `effectiveFrom`
- Attendance: PRESENT 1, HALF_DAY 0.5, PAID_LEAVE 1, ABSENT 0; no future; no before join; OT 0–24; bulk mark
- Regularity 7–99 days: rates, streak, most/least regular
- Self-service `/staff/me`
- Payroll math:
  - Daily: `wage * paidUnits`
  - Monthly: deduct absents + half-days + unmarked-if-ABSENT from monthly salary
  - `gross = base + OT + lineEarnings`; `net = max(0, gross - advances - lineDeductions)`
- unmarkedDayPolicy PRESENT|ABSENT|EXCLUDED
- **Also apply weeklyOffDays + holidays to working days; apply payrollRoundTo** (original stores these but often does not apply — implement them)
- DRAFT → FINALIZED → PAID; PAID immutable; driftCalculatedPaise if attendance changes later
- Mark paid: shop expense + FIFO advance repayment
- Advances OPEN/CLOSED; payslip print
- Holidays CRUD

### 10. Shop dashboard
- Period today | month: sales, invoice count, profit, net profit, purchases, expenses, outstanding credit, stock value, low stock, products, customers, staff, held bills, offers, returns, top customer, payment split
- Staff sales vs monthly targets sidebar
- Quick links to bill / stock / buy / costs / udhaar / offers / settings

### 11. Shop POS — implement ALL of this (this is what clones miss)
- Routes: invoices list, `/shop/invoices/new`, invoice detail, settings, `/shop/sales` alias, scan, offers, returns, customers, top customers
- Cart: barcode scan, manual add, merge same SKU+price, inventory picker
- Infinite stock if qty ≥ **9999** (do not decrement; show ∞)
- Insufficient stock **blocks** sale
- Customer picker create-on-type; unique phone; GSTIN
- Sales boy from staff
- Live thermal/A4 preview while typing
- localStorage draft restore
- Discount ₹ and/or %; discountBasis subtotal|total
- Tax % , tax-included, **manual GST**; CGST/SGST = half
- **Round off always floor-down to whole rupee** (never up)
- Offers: exactly **one** per bill or skip; if several apply cashier must pick
  Types: PERCENT, FIXED_AMOUNT, CART_MIN_FLAT, PRODUCT_PERCENT, PRODUCT_FIXED, CATEGORY_PERCENT, CATEGORY_FIXED, BUY_X_GET_X (same SKU), BUY_X_GET_Y (cheapest units free). Group size = buy+get.
  Owner-only offer CRUD; usageCount + totalDiscountPaise
- Pay: CASH UPI CARD + CREDIT if udhaar on; API also BANK/CHEQUE/OTHER
- Partial paidRupees → PARTIAL + udhaar remainder
- Cash tender + change
- Hold bill 30 min TTL, incrementing holdNumber, resume/cancel/expire
- Bill no: `{PREFIX}-{YEAR}-{00001}` (default INV), increment nextBillSeq
- Scan also opens **bill barcode** (12 digits from bill number)
- Print: 58mm / 80mm / A4, margins, copies 1–5, logo, barcode, cashier, sales staff, customer phone/GSTIN, payment, subtotal, footer, terms
- Invoice settings page with live sample + staff monthly targets
- After save: print then reset cart; issueInvoice true; store itemsJson + pricingJson + totalCostPaise (WAC)

### 12. Returns
- RET-{YEAR}-{0001}; only COMPLETED sales
- Reasons DAMAGED DEFECTIVE WRONG_PRODUCT CUSTOMER_CHANGED_MIND OTHER
- RETURN or EXCHANGE; cannot exceed remaining qty per line
- Refund = qty × original unit price; restock (not infinite)
- Exchange: new sale; net refund = return − exchange total
- CREDIT refund → RETURN_REFUND ledger

### 13. Inventory
- sku, size, barcode unique/org, name, unit, qty, reorder, cost, sell, expiry, sectorMeta
- Alerts: low stock, expiry ≤30 days, no barcode
- Tools: CSV import, bulk barcodes, bulk prices (set / ±% / ±₹), receive stock, merge SKUs (OWNER/PARTNER)
- Weighted average cost on receive; reverse on purchase cancel/edit
- Labels small/full; header both|name|logo; print sheet
- Analytics: velocity, dead stock, insights panel
- Sector category trees (copy original inventory-categories)

### 14. Purchases & suppliers
- Supplier unique name + GST
- Bill: items, discount, tax, extraCharges, paid, PAID/PARTIAL/UNPAID, idempotencyKey
- Create increments stock + WAC; cancel reverses both
- Partial payment ledger

### 15. Shop expenses, recurring, profit, activity
- Categories; DAILY/MONTHLY/ONE_TIME; soft delete; receiptHash
- Recurring: monthly amount, dueDay, start/end, isActive
- Expense report
- Profit: today|week|month|custom; net = sales − COGS − returns − expenses
- Owner shop activity log

### 16. Udhaar
- Account: name, phone, limit, balance, totalPurchases
- Entries: OPENING SALE PAYMENT ADJUSTMENT RETURN_REFUND with balanceAfter
- Record payment; CREDIT sales auto-post

### 17. Contractor / architect / builder
- BOQ: code, description, unit, qty, ratePaise
- Measurement book linked to BOQ
- Material issue: item, qty, unit, issuedTo, date
- Design stages: PENDING/IN_PROGRESS/SUBMITTED/APPROVED + fee + due; drawing revisions
- Units: AVAILABLE/BOOKED/SOLD; bookings BOOKED/CANCELLED/HANDED_OVER

### 18. Search, notifications, audit
- Search projects/vendors/expenses/payments (scope + take 10)
- Notifications list/mark read/unread count (incl. inventory alerts)
- AuditLog on every mutating finance/org/shop action

---

## D. Port the data model 1:1

Copy every model/enum from original `prisma/schema.prisma`: User, org, members, invites, staff/attendance/payroll/advances/holidays, shop sales/holds/offers/returns/customers/inventory/credit/purchases/expenses, BOQ/measurements/material, design stages/revisions, units/bookings, Project/WorkOrder/Vendor/Expense/Payment/Allocation, Document/AIExtraction, Notification, AuditLog.

Do not invent a thinner schema.

---

## E. Every frontend route that must exist

```
/login /register /verify-email /forgot-password /reset-password
/onboarding
/invite/:token /project-invite/:token
/dashboard
/projects /projects/new /projects/:id /projects/:id/vendors/:vendorId
/work-orders/new
/expenses /expenses/new /payments /payments/new
/vendors /vendors/new /vendors/:id
/documents /activity /partners /reports /search /notifications
/staff /staff/me /staff/payslip/:id
/shop/invoices /shop/invoices/new /shop/invoices/:id /shop/invoices/settings
/shop/sales /shop/sales/invoice/:id
/shop/scan /shop/offers /shop/returns
/shop/customers /shop/customers/top
/shop/inventory /shop/inventory/report /shop/inventory/label/:id
/shop/purchases /shop/purchases/new /shop/purchases/:id
/shop/expenses /shop/expenses/report
/shop/udhaar /shop/udhaar/:id
/shop/activity
/contractor/boq /contractor/material
/architect/stages
/builder/units
/settings/profile /settings/organization /settings/members /settings/staff
```

Implement **every** `/api/v1/...` route from the original (about 90 endpoints). Keep the same paths and JSON shapes where possible so the React client can stay close.

---

## F. Formulas you must copy (do not simplify)

**Invoice:** subtotal → discount (basis subtotal or total) → GST (rate or manual, included or not) → floor to whole rupee → CGST/SGST half.

**BOGO:** free units = `floor(qty / (buy+get)) * get`. BUY_X_GET_Y frees cheapest matching units.

**WAC:** `(oldQty*oldCost + addQty*rate) / (oldQty+addQty)`; reverse on cancel.

**Settlement EQUAL:** `share = total/n`, remainder +1 paise to first partners; debtors pay creditors greedily.

**Payroll monthly:** deduct `(absent + unmarkedIfAbsent + half*0.5) / daysInMonth * wage`.

---

## G. Work order — how to add this into the existing repo

1. Diff current screens/APIs against sections C–E. Produce a missing-feature list first.
2. Implement in this order; do not mark a slice done until every bullet in that slice works:

   1. Auth, orgs, RBAC, onboarding, switch, members, invites, profile  
   2. Projects, expenses, payments, vendors, ledger, settlement, project tabs  
   3. Work-order upload + AI review + documents  
   4. Staff attendance, payroll math, advances, payslip, `/staff/me`  
   5. Shop POS complete (cart, scan, draft, hold, offers, GST, print, customers, credit)  
   6. Inventory + WAC + tools + labels + alerts  
   7. Purchases, expenses, recurring, profit, activity  
   8. Udhaar  
   9. BOQ, material, stages, units  
   10. Search, notifications, audit, command palette, theme, settings polish  

3. After each slice, walk the matching original pages mentally and tick every control (hold bill, cash tender, 24h expense edit, offer picker, etc.). Missing one control = incomplete.

4. Attach / read if available: original `REACT_SPRINGBOOT_PARITY.md` and `prisma/schema.prisma`. Prefer those over guessing.

**Start now:** audit this repo vs section C, print the missing list, then implement the first incomplete slice to full parity (not a stub).

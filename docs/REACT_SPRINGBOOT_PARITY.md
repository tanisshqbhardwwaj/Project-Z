# Project Z — Full Feature Parity Spec (React + Spring Boot)

Use this document as the **source of truth**. The previous short prompt was incomplete. Rebuild **every screen, API, formula, and edge case** listed here. If a feature exists in the current Next.js Project Z app, it must exist in the React + Spring Boot clone.

**Do not ship a thin MVP.** Implement in the order at the bottom, but do not mark a domain done until its checklist is complete.

---

## 0. Stack

| Layer | Choice |
|---|---|
| Frontend | React 18+ (Vite), TypeScript, React Router, TanStack Query, Zustand, React Hook Form + Zod, Tailwind, Radix/shadcn, Recharts, lucide-react, date-fns, jsbarcode |
| Backend | Java 21, Spring Boot 3.x, Spring Security, Spring Data JPA, Flyway |
| DB | PostgreSQL 16. **All money is BIGINT paise. Never Double/float.** |
| Auth | JWT access + refresh (HttpOnly cookies OK) or session cookie. Argon2id passwords. |
| Files | S3-compatible (MinIO local, R2/S3 prod), presigned download |
| Email | Resend or Spring Mail: verify, reset, org invite, project invite |
| Jobs | `@Async` / queue for AI extraction, 3 retries |
| Theme | light / dark / system (`pz-theme` localStorage) |
| i18n | `en` first; User.locale = `en` / `hi` / `en_hi` |
| Tenant header | Every API after login sends `X-Organization-Id` |

Health: `GET /api/v1/health` → `{ status: "ok" }` when DB is reachable.

---

## 1. Money, dates, IDs

- Store paise (`Long`). Convert rupees ↔ paise with `Math.round(rupees * 100)`.
- Display with `en-IN` INR formatting.
- Org timezone default `Asia/Kolkata`. Attendance/payroll use **org-local day keys** `YYYY-MM-DD`, never browser-local midnight.
- IDs: UUID strings.
- Soft-delete financial rows (`deletedAt`). Never hard-delete expenses, payments, sales, purchases.
- **Exception:** project delete is owner-only **hard delete** after typing the exact project name (cascades related rows). Shop purchases use cancel (reverse stock/WAC), not hard delete.

---

## 2. Multi-tenant orgs

- User may belong to **max 3 organizations**.
- After login, if no org → `/onboarding`. If orgs exist → `/dashboard`.
- Create extra org via `/onboarding?new=1` (shows `count/3 used`).
- Org switcher: `POST /api/v1/organizations/switch` then refresh session + `X-Organization-Id`.
- Org fields: `name`, unique `slug`, `businessType`, `shopSector?`, `enableStaff`, `timezone`, `defaultCompletionDays` (default 30), `currency` INR, `settings` JSON.

### Business types (copy labels exactly)

**CONTRACTOR** — Work Orders / Partner. Construction expense categories: Paint, Labour, Material, Transport, Equipment, Electricity, Food, Accommodation, Fuel, Tools, Contractor, Miscellaneous.

**ARCHITECT** — Projects / Collaborator / Total Fees. Categories: Design fees, Site visit, Printing, Software, Labour, Material, Transport, Consultant, Miscellaneous.

**BUILDER** — Sites / Partner. Same construction categories.

**SHOPKEEPER** — Retail Store Management / Co-owner. Must pick `shopSector`. Categories: Purchase, Inventory, Rent, Utilities, Packaging, Delivery, Staff wages, Marketing, Maintenance, Miscellaneous (sector extras below).

Nav wording changes by type (`workItemPlural`, partner label, empty-state copy). **Shopkeepers do not see Projects nav.** Construction orgs do not see shop POS nav unless a shop module is enabled (shop modules are SHOPKEEPER-only).

### Shop sectors

| Sector | Extra capabilities / inventory fields | Extra expense cats |
|---|---|---|
| GROCERY | udhaar, weight_units, expiry_tracking — weight, expiryDate | Delivery, Packaging |
| HARDWARE | variants, quotations — brand, size | Transport, Maintenance |
| ELECTRONICS | serial_tracking, warranty — serial, warrantyMonths | Marketing, Delivery |
| CLOTHING | size_color_matrix, udhaar — size, color | Marketing, Packaging |
| PHARMACY | batch_expiry, prescription_register — batch, expiryDate | Compliance, Delivery |
| RESTAURANT | menu, kot, recipe_consumption — recipeYield | Kitchen supplies, Packaging, Marketing |
| GENERAL | basic_inventory | all shop defaults |

Also ship **sector inventory category trees** (staples/rice, snacks, apparel sizes, etc.) used by inventory filters and offer category keys. Copy from `src/lib/shop/inventory-categories.ts`.

---

## 3. Roles & permissions (copy exactly)

Roles: `OWNER`, `PARTNER`, `ACCOUNTANT`, `VIEWER`, `CASHIER`.

| Permission | OWNER | PARTNER | ACCOUNTANT | VIEWER | CASHIER |
|---|---|---|---|---|---|
| org.manage / org.invite / settings.manage | ✓ | | | | |
| project.create / project.view_all | ✓ | | ✓ view_all | | |
| project.view_assigned | | ✓ | | ✓ | |
| expense.create / expense.edit_own | ✓ | ✓ | ✓ | | |
| expense.delete / payment.delete | ✓ | | | | |
| payment.create / payment.edit_own | ✓ | ✓ | ✓ | | |
| financial.view | ✓ | ✓ | ✓ | ✓ | |
| shop.sales | ✓ | ✓ | ✓ | | ✓ |
| shop.inventory.manage | ✓ | ✓ | ✓ | | |
| shop.purchase.manage | ✓ | | | | |
| shop.purchase.view | ✓ | ✓ | ✓ | | |
| shop.expense.manage | ✓ | | | | |
| shop.expense.view | ✓ | ✓ | ✓ | | |
| shop.profit.view | ✓ | ✓ | ✓ | | |
| shop.activity.view | ✓ | | | | |
| report.export / audit.view / vendor.manage / document.upload | ✓ | ✓ | ✓ | | |
| staff.view | ✓ | ✓ | ✓ | ✓ | |
| staff.manage / attendance.mark / payroll.manage | ✓ | | ✓ | | |
| attendance.view_own | | | | | ✓ |

**Project scope:** OWNER/ACCOUNTANT see all projects. PARTNER/VIEWER only projects they are members of. Apply this to expenses, payments, vendors, search, documents.

**Landing redirects:**
- CASHIER → `/shop/invoices/new`
- Role with only `attendance.view_own` → `/staff/me`
- Others → `/dashboard` (shopkeeper dashboard if `SHOPKEEPER`)

---

## 4. Module registry (toggle in org settings)

Settings JSON: `{ modules: { staff: true, ... }, weeklyOffDays: number[], unmarkedDayPolicy, payrollRoundTo, shop: { brandName, logoUrl, nextBillSeq, invoice: {...} } }`

| Key | Route | Available | Default ON |
|---|---|---|---|
| staff | `/staff` | all types | SHOPKEEPER off unless `enableStaff` |
| shop_sales | `/shop/invoices` | SHOPKEEPER | yes |
| shop_inventory | `/shop/inventory` | SHOPKEEPER | yes |
| shop_udhaar | `/shop/udhaar` | SHOPKEEPER | no |
| shop_purchases | `/shop/purchases` | SHOPKEEPER | yes |
| shop_expenses | `/shop/expenses` | SHOPKEEPER | yes |
| shop_activity | `/shop/activity` | SHOPKEEPER | yes |
| contractor_boq | `/contractor/boq` | CONTRACTOR | yes |
| contractor_material | `/contractor/material` | CONTRACTOR, BUILDER | yes |
| architect_stages | `/architect/stages` | ARCHITECT | yes |
| builder_units | `/builder/units` | BUILDER | yes |

Nav = Core (Dashboard, Projects if construction + role) + enabled modules the role can access + Tools (Scan if shop sales/inventory, Notifications, Profile).

Mobile: bottom bar, short labels (Home, Bills, Stock, Buy, Costs, Credit, Log, Staff, Me), overflow “More” sheet, FAB for new expense / new work order on construction.

---

## 5. Auth (must all exist)

**Screens:** `/login` `/register` `/verify-email` `/forgot-password` `/reset-password`

**APIs:**
- `POST /api/v1/auth/register` — name, email, password; send verification email
- `POST /api/v1/auth/login` — fail `USER_NOT_FOUND`, `INVALID_PASSWORD`, `EMAIL_NOT_VERIFIED`
- `POST /api/v1/auth/logout`
- `GET|PATCH /api/v1/auth/me` — profile name/phone/locale
- `POST /api/v1/auth/verify-email`
- `POST /api/v1/auth/resend-verification`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `POST /api/v1/auth/change-password` (current + new)

**Rules:**
- Email lowercase + trim. Password Argon2id (memoryCost 19456, timeCost 2, outputLen 32, parallelism 1).
- Session/JWT 30 days.
- Rate limit auth: **10 / 15 min / IP**.
- Optional beta allowlist: env `TEST_EMAIL_ALLOWLIST` + DB table `BetaTestEmail` (max **20**). Owner manages on Profile page. Allowlisted emails **auto-verify** (skip email confirmation).
- Register **rolls back the user** if verification email send fails in production; in dev return the verify URL.
- Org / project invites expire in **7 days**.

---

## 6. Onboarding & org settings

**Onboarding form:** org name (required), business type cards, if SHOPKEEPER: sector cards + “Enable staff” switch. Create → bootstrap → dashboard (or `/staff` if shop + staff on).

**APIs:**
- `POST/GET/PATCH /api/v1/organizations`
- `GET /api/v1/organizations/list`
- `POST /api/v1/organizations/switch`
- `DELETE /api/v1/organizations/{id}` — owner only, only if allowed (no leftover orgs constraint as implemented)
- `GET /api/v1/organizations/{id}/categories`
- `GET|POST /api/v1/organizations/{id}/members`
- `POST /api/v1/organizations/{id}/members/link` — link org member ↔ StaffMember
- `GET /api/v1/invite/{token}` + `POST .../accept`
- `GET /api/v1/project-invite/{token}` + `POST .../accept`
- `GET|POST|DELETE /api/v1/beta-test-emails`

**Organization settings page (`/settings/organization`):** name, business type, shop sector, module toggles, enable staff, unmarked-day policy (`PRESENT|ABSENT|EXCLUDED`), default completion days, brand name, logo URL, delete org dialog.

**Members (`/settings/members`):** list, invite email + role, change role, remove, link to staff.

**Profile (`/settings/profile`):** name, phone, change password, logout, org summary, **beta email allowlist CRUD** (owner).

**Staff settings (`/settings/staff`):** weekly off days, unmarked policy, payroll round-to.

**Shop invoice settings (`/shop/invoices/settings`):** see §11.

---

## 7. Construction dashboard & projects

### Dashboard (`/dashboard`) — non-shop

Cards: active count (type-specific label), total contract, total expenses, outstanding. Expected vs actual profit. Recent work items. Buttons: New work item, New expense.

`GET /api/v1/dashboard`

### Projects list (`/projects`)

Filter by status. Empty copy from business-type config. Actions: new, upload work order, nickname.

`GET|POST /api/v1/projects`

### Manual create (`/projects/new`, `/work-orders/new`)

Name, nickname, contract amount, budget, location, description, expected start/completion. Work-order extras: number, date, client, head of account, time of completion, payment terms.

### Project detail (`/projects/{id}`) — tabs

`overview` | `work-order` | `expenses` | `payments` | `vendors` | `documents` | `reports` | `activity`

- Financial summary bar: contract, expenses, remaining budget, vendor outstanding, expected/actual profit, utilization %
- Partner spending per person
- Nickname dialog
- Partners dialog (invite 7-day token, approve/reject requests, EQUAL/PERCENT/CUSTOM splits)
- **Merge projects:** move expenses, payments, documents, members to target; sum contract/budget; append description; source → ARCHIVED + soft-deleted. Cannot merge into self.
- **Delete project:** OWNER only; confirm by typing exact project name; hard-delete cascade.
- Edit expense within **24 hours** of create (`EDIT_WINDOW_MS`); mark `isEdited`, store `originalAmountPaise`
- Document preview dialog
- Long official name vs nickname display

**APIs:**
- `GET|PATCH|DELETE /api/v1/projects/{id}`
- `GET /api/v1/projects/{id}/summary`
- `GET /api/v1/projects/{id}/settlement`
- `POST /api/v1/projects/{id}/merge` — merge source project into this one
- `GET /api/v1/projects/{id}/members`
- `GET|POST /api/v1/projects/{id}/partners`
- `POST /api/v1/projects/{id}/partners/requests/{requestId}` — approve/reject
- `GET /api/v1/projects/{id}/documents`
- `GET /api/v1/projects/{id}/vendors`

### Budget formulas

```
budget = budgetAmount ?? contractAmount
remainingBudget = budget - totalExpenses
expectedProfit = contract - budget
actualProfit = contract - totalExpenses
utilization% = expenses / budget * 100
```

### Partner settlement

Contributions = sum of payments each partner **paid**.

- **EQUAL:** `share = total / n`, remainder +1 paise to first `remainder` partners.
- **PERCENT:** percents must sum to 100 (±0.01). `share = round(total * pct/100)`.
- **CUSTOM:** explicit paise shares.

`delta = paid - share`. Debtors (negative) pay creditors (positive) with greedy pairing → `owes[{from,to,amount}]`.

One partner → no owes.

### Work-order upload + AI

`POST /api/v1/work-orders/upload` (multipart)

- Files: pdf, jpg, jpeg, png, webp, heic, heif. Normalize HEIC.
- Rate limit **20 / hour / IP**.
- Store Document + AIExtraction (`PENDING|COMPLETED|FAILED|REVIEWED`).
- Providers: Groq / Gemini / manual. Queue with 3 retries; inline fallback if no queue.
- Extract fields (each with value, confidence, status pending/accepted/rejected/edited):
  `workOrderNumber, workOrderDate, timeOfCompletion, expectedCompletionDate, clientName, headOfAccount, projectName, projectLocation, description, tenderAmount, paymentTerms`
- Review UI: accept/edit/reject, then create project+work order. Accept **merges AI fields + user corrections** → Project + WorkOrder + linked Document.
- Expected completion: parse from document date + time-of-completion text, else `org.defaultCompletionDays`.
- AI quota exceeded → still COMPLETED with empty fields + “enter manually” message (do not leave the user stuck).
- `GET|POST /api/v1/work-orders/{id}/extraction` — poll / re-run (rate limit **30 / hour**).
- `GET /api/v1/work-orders/{id}/preview`
- `GET /api/v1/documents/{id}/preview`

---

## 8. Expenses, payments, vendors (construction)

### Expenses

Screens: `/expenses`, `/expenses/new`

- Required: project, category, amount, date. Optional vendor, description, receipt.
- `amountPaise`, `paidAmountPaise`, `outstandingPaise`.
- Soft delete. Edit own within 24h. Owner can delete.
- **Duplicate warning:** same vendor + same amount within **±1 day**. Return a warning; client may skip and create anyway.
- Receipt hash as extra duplicate signal.
- `findOrCreate` vendor by normalized name when typing a new vendor on the expense form.

`GET|POST /api/v1/expenses`  
`PATCH /api/v1/expenses/{id}`  
`GET /api/v1/reports/expenses` (date range / project / category)

### Payments

Screens: `/payments`, `/payments/new`

- Types: `VENDOR`, `SETTLEMENT`, `OTHER`
- Methods: `CASH`, `UPI`, `BANK`, `CARD`, `CHEQUE`, `CREDIT`, `OTHER`
- Allocate payment lines to expenses (`PaymentAllocation`)
- Settlement payments: paidBy + recipient partner

`GET|POST /api/v1/payments`

### Vendors

Screens: `/vendors`, `/vendors/new`, `/vendors/{id}`, `/projects/{id}/vendors/{vendorId}`

- Unique name per org. Phone, email, address, GST, notes. Soft delete.
- Ledger: chronological bills (expenses) minus payments. Running balance.
  - Expense line: “We bought: {description}”
  - Payment line: “{paidBy} paid (ref)”

`GET|POST /api/v1/vendors`  
`GET /api/v1/vendors/{id}/ledger`

### Documents / activity / partners pages

- `/documents` — org document list
- `/activity`, `/partners`, `/reports` currently **redirect to projects** in the Next.js app; still keep the APIs. In the rebuild you may keep the redirects **or** give them real pages — do not drop the APIs.
- `/shop/sales` redirects to `/shop/invoices`; keep the alias.

`GET /api/v1/activity`

---

## 9. Staff / Labour

Screens: `/staff`, `/staff/me`, `/staff/payslip/{id}`, `/settings/staff`

**Staff member:** name (2–100), phone, roleTitle, wageRupees, wagePeriod `DAILY|MONTHLY`, overtimeRate, joinedAt, notes, status `ACTIVE|LEFT`, optional `userId` (unique per org).

Wage history (`StaffWage`) with `effectiveFrom` — payroll uses wage effective on each day.

### Attendance

Statuses: `PRESENT` (1 day), `HALF_DAY` (0.5), `PAID_LEAVE` (1), `ABSENT` (0).

- Unique `(staffId, date)`. Cannot mark before `joinedAt` or future days.
- Overtime hours 0–24. Notes max 300.
- Bulk mark all / selected staff for a date.
- Org holidays (`OrgHoliday`) + `weeklyOffDays` in settings (0=Sun … 6=Sat).
  **Current Next.js app stores these but does not apply them to payroll day counts.** Rebuild should **apply them** (weekly offs + holidays excluded from working-day denominator) unless you explicitly choose to match the current bug.
- Regularity report: last **7–99** days — present/absent/half/leave/unmarked counts, attendance rate, current streak, most/least regular leaderboards.

`GET|POST /api/v1/staff/attendance`  
`GET /api/v1/staff/attendance/regularity?days=99`  
`GET /api/v1/staff/me` + `GET /api/v1/staff/me/attendance` (self)

### Payroll math (copy exactly)

**Daily wage:** `wage * paidUnits` (milli-precision: `wage * round(paidUnits*1000) / 1000`)

**Monthly wage:** deduct absents + half-days + unmarked-if-policy-ABSENT from monthly salary:

```
deductMilli = round(absent*1000 + unmarkedAbsent*1000 + half*500)
deduction = wage * deductMilli / (daysInMonth * 1000)
net = max(0, wage - deduction)
```

Unmarked policy:
- `EXCLUDED` — ignore unmarked (default)
- `ABSENT` — treat unmarked as absent
- `PRESENT` — treat unmarked as present (no deduct)

Then:

```
OT = overtimeRatePaise * overtimeHours
gross = base + OT + lineEarnings
net = max(0, gross - advanceDeduction - lineDeductions)
```

Optional `payrollRoundTo` rupees — **stored in settings today but not applied.** Rebuild should round net pay to that rupee step.

Statuses: `DRAFT` → `FINALIZED` → `PAID`. Unique `(staffId, year, month)`.
- **PAID payrolls are immutable** (do not recalculate). If attendance later changes, store `driftCalculatedPaise` so owners can see drift.
- Mark PAID: create shop expense (Staff category if shop org), apply advance repayments **FIFO**.
- Manual overrides: `adjustmentRupees`, `finalAmountRupees`, custom EARNING/DEDUCTION lines.

On PAID for shop orgs: create linked `ShopExpense` (staff wages). Store `shopExpenseId`.

Payslip page prints name, month, days, OT, lines, advances, net.

### Advances

Amount, notes, givenDate, paymentMethod. `repaidPaise`, optional `monthlyDeductionPaise`, status `OPEN|CLOSED`.  
On payroll finalize/pay: apply monthly deduction, close when repaid >= amount.  
Shop orgs: also post a shop expense for the advance.

`GET|POST /api/v1/staff`  
`PATCH /api/v1/staff/{id}`  
`GET|POST /api/v1/staff/advances`  
`GET|POST|PATCH /api/v1/staff/payroll`  
`GET /api/v1/staff/payroll/{id}`

---

## 10. Shop dashboard

`/dashboard` for SHOPKEEPER.

Period toggle **today | month**.

Cards: sales, invoice count, profit, net profit (sales − purchases − expenses), purchase total, expense total, outstanding credit, stock value, low-stock count, products, customers, staff, held bills, active offers, recent returns, top customer, payment-method split.

Recent invoices list. Staff sales sidebar: per sales-boy sales, invoice count, monthly target rupees, progress %. Click staff → filter invoices (`/api/v1/shop/dashboard/staff-invoices`).

Quick links: New bill, Inventory, Purchases, Expenses, Udhaar, Offers, Settings.

`GET /api/v1/shop/dashboard?period=today|month`  
`GET /api/v1/shop/dashboard/staff-invoices`  
`GET /api/v1/shop/profit`

---

## 11. Shop POS / invoices (this is the most-missed area — implement ALL of it)

Screens:
- `/shop/invoices` — list + search
- `/shop/invoices/new` — POS
- `/shop/invoices/{id}` — view + print + return
- `/shop/sales` and `/shop/sales/invoice/{id}` (aliases / older routes — keep working)
- `/shop/invoices/settings` — template
- `/shop/scan` — barcode lookup
- `/shop/offers`
- `/shop/returns`
- `/shop/customers`, `/shop/customers/top`

### POS cart (`InvoiceEntryForm`)

Must include:
1. **Barcode scan input** (auto-focus, lookup `GET /api/v1/shop/inventory/lookup?barcode=` and `/api/v1/shop/scan`)
2. Manual add: name, qty, price. Merge lines with same inventoryItemId+price (or same name+price if no item).
3. Inventory picker showing stock (`∞ unlimited` if qty ≥ **9999**). Infinite stock is **not decremented**.
4. **Customer picker** — search existing; create-on-the-fly name/phone/GSTIN. Unique phone per org.
5. Customer GSTIN field
6. **Sales boy** select from staff (if staff module on)
7. Live invoice preview (thermal/A4) as you type
8. **localStorage draft** restore if user leaves mid-bill
9. Discount rupees and/or percent; `discountBasis` subtotal|total from org settings
10. Tax rate %, tax-included toggle, **manual GST override**
11. **Round off always floor-down to whole rupee** (never round up)
12. Offer picker dialog — list applicable offers, cashier picks **exactly one** or skip
13. Payment: CASH / UPI / CARD; if udhaar module on: **CREDIT**. Also support BANK / CHEQUE / OTHER on API even if POS shows the short set.
14. Partial `paidRupees` when udhaar on and method ≠ CREDIT (and not full cash).
15. **Cash tender panel** — cash given, auto change
16. **Hold bill** — persist cart 30 min TTL; hold numbers increment per org; resume / cancel; auto-expire on list.
17. Save + print; `issueInvoice: true`. Total must be > 0. Insufficient stock (non-infinite) **blocks** the sale.
18. After save: print dialog with copies, then reset cart
19. **Staff sales sidebar** on POS (recent invoices by sales boy)
20. Scan input also resolves a **bill barcode** (12 digits derived from bill number) → open that invoice, not only products.

### Invoice pricing (copy exactly)

```
subtotal = Σ qty * price
if discountBasis == subtotal:
  discount = % of subtotal OR rupee cap
  tax on (subtotal - discount)
else:  # total
  tax on subtotal first
  discount on (tax-included ? subtotal : taxable+gst)

beforeRound = ...
roundOff = floor(beforeRound) - beforeRound   # always ≤ 0
total = beforeRound + roundOff
CGST = GST/2, SGST = GST - CGST
```

Store `pricingJson` on sale (subtotal, discounts, tax, CGST/SGST, taxIncluded, rate, roundOff, manualGst, offerDiscount, appliedOffers).

Bill number: `{PREFIX}-{YEAR}-{00001}` from `settings.shop.invoice.billPrefix` (default `INV`) + increment `settings.shop.nextBillSeq`.

Sale stores: `itemsJson`, `totalPaise`, `gstPaise`, `paidAmountPaise`, `totalCostPaise` (sum of weighted-average cost × qty), `paymentStatus` PAID/PARTIAL/UNPAID, `status` COMPLETED/VOID.

CREDIT sales create `CustomerCredit` + `CustomerCreditEntry` type SALE. Partial pay = PARTIAL + credit for remainder.

### Offers (one offer per bill, no stacking)

Types:
- `PERCENT` — % off whole bill
- `FIXED_AMOUNT` — flat off whole bill
- `CART_MIN_FLAT` — flat off if subtotal ≥ `minPurchasePaise`
- `PRODUCT_PERCENT` / `PRODUCT_FIXED` — matching `productIds`, optional `minQuantity`
- `CATEGORY_PERCENT` / `CATEGORY_FIXED` — matching `categoryKeys`
- `BUY_X_GET_X` — same item, free units = `floor(qty / (buy+get)) * get`
- `BUY_X_GET_Y` — across selected products; cheapest units are free

Fields: name, description, dates, isActive, priority, usageCount, totalDiscountPaise, soft `deletedAt`.

Preview API lists applicable (best savings, then priority). If several apply and cashier didn’t pick → `requiresSelection: true` (block save). `skipOffer` bills with no offer.
Create/update/delete offers: **OWNER only**. Cashiers may only preview. Track `usageCount` + `totalDiscountPaise` when a bill uses an offer.

`GET|POST /api/v1/shop/offers`  
`PATCH|DELETE /api/v1/shop/offers/{id}`  
`POST /api/v1/shop/offers/preview`

### Held bills

TTL **30 minutes**. Status ACTIVE → RESUMED | CANCELLED | EXPIRED. Unique holdNumber per org. Expire job on list.

`GET|POST|PATCH /api/v1/shop/held-bills`

### Returns / exchanges

Reasons: `DAMAGED`, `DEFECTIVE`, `WRONG_PRODUCT`, `CUSTOMER_CHANGED_MIND`, `OTHER`.  
Types: `RETURN`, `EXCHANGE`.  
Return number: `RET-{YEAR}-{0001}`. Only against COMPLETED sales. Per-line remaining qty = original − prior returns (cannot exceed).  
Refund = returnQty × original unit price. Restock (except infinite). CREDIT refunds write `RETURN_REFUND`.  
**Exchange:** create a new sale; **net refund = return value − exchange total**.

`GET|POST /api/v1/shop/returns`  
`GET /api/v1/shop/returns/returnable/{saleId}`

### Print

Paper: `58mm` | `80mm` | `A4`. Default thermal margin 0, A4 10mm. Copies 1–5.  
Toggles: logo, barcode (12-digit code from bill-number digits), cashier, sales staff, customer phone, customer GSTIN, payment method, subtotal.  
Header title, display name, address, phone, email, GSTIN, footer, terms.  
Live preview + print service (window.print with layout CSS).

### Invoice settings page

All of the above fields + default tax % + discount basis + staff monthly targets (default + per-staff map) + sample invoice preview + test print.

### Customers

List, search, top customers by **spend, visit count, avg ticket, last purchase**.  
`GET /api/v1/shop/customers`  
`GET /api/v1/shop/customers/{id}`  
`GET /api/v1/shop/customers/top`

### Sales APIs

`GET|POST /api/v1/shop/sales` (q, customerId)  
`GET /api/v1/shop/sales/{id}`

Create body supports: customer*, salesBoy, items[], discount*, tax*, paidRupees, paymentMethod, selectedOfferId, skipOffer, appliedOffers, notes, issueInvoice.

---

## 12. Inventory

Screen `/shop/inventory` + `/shop/inventory/report` + `/shop/inventory/label/{id}`

Item: sku, size, barcode (unique per org), name, description, unit (default pcs), quantity, reorderLevel, costPaise, sellPaise, expiryDate, `sectorMeta` JSON.

**Alerts:**
- Low stock: qty ≤ reorderLevel and not infinite
- Expiring soon: expiry within **30 days**
- No barcode

**Tools** `POST /api/v1/shop/inventory/tools`:
- `bulk-import` CSV
- `bulk-barcodes` generate missing
- `bulk-prices` mode: set | increase_percent | decrease_percent | add | subtract
- `receive-stock` lines (addQty, optional cost → weighted average)
- `merge` keep one item, combine stock optional

**Weighted average cost:**

```
if addQty<=0: keep current
if current infinite or qty<=0: use purchase rate
else: (qty*oldCost + addQty*rate) / (qty+addQty)
```

Reverse WAC on purchase edit/cancel.

**Labels:** small / full; header both | name | logo; barcode SVG; print sheets.

**Analytics:** `GET /api/v1/shop/inventory/analytics` — sales velocity, dead stock, plus the insights panel on the inventory page.  
**Merge SKUs:** OWNER or PARTNER only.

APIs: `GET|POST|PATCH|DELETE /api/v1/shop/inventory`  
`GET /api/v1/shop/inventory/{id}`  
`GET /api/v1/shop/inventory/lookup`

Scan page `/shop/scan`: camera/keyboard barcode → item card, jump to bill or stock.

---

## 13. Purchases & suppliers

Screens: `/shop/purchases`, `/shop/purchases/new`, `/shop/purchases/{id}`

Supplier unique name; phone, email, address, GST.

Purchase: date, billNumber, items (inventoryItemId optional, name, qty, rate), subtotal, discount, tax, extraCharges, total, paidAmount, paymentStatus PAID/PARTIAL/UNPAID, method, status ACTIVE/CANCELLED, **idempotencyKey**.

On create: increment stock + WAC. On cancel/edit: **reverse stock and WAC**. Idempotency key on create.

Partial payments: `ShopPurchasePayment` ledger.

`GET|POST /api/v1/shop/suppliers`  
`GET|POST /api/v1/shop/purchases`  
`GET|PATCH|DELETE /api/v1/shop/purchases/{id}`  
`GET|POST /api/v1/shop/purchases/{id}/payments`

---

## 14. Shop expenses + recurring

Screens: `/shop/expenses`, `/shop/expenses/report`

Categories (seed + custom). Types `DAILY|MONTHLY|ONE_TIME`. paidBy, receiptHash, notes, optional staffId / staffAdvanceId / payrollId. Soft delete.

Recurring: name, monthlyAmount, dueDay (1–28), start/end, isActive.

`GET|POST /api/v1/shop/expenses`  
`GET|PATCH|DELETE /api/v1/shop/expenses/{id}`  
`GET|POST /api/v1/shop/expenses/categories`  
`GET|POST /api/v1/shop/expenses/recurring`

---

## 15. Udhaar (customer credit)

Screens: `/shop/udhaar`, `/shop/udhaar/{id}`

Account: customerName, phone, shopCustomerId, balancePaise, creditLimitPaise, totalPurchasesPaise.

Ledger types: `OPENING`, `SALE`, `PAYMENT`, `ADJUSTMENT`, `RETURN_REFUND`. Each stores `balanceAfterPaise`.

`GET|POST|PATCH /api/v1/shop/udhaar`  
`GET /api/v1/shop/udhaar/{id}/ledger`  
`POST /api/v1/shop/udhaar/payments`

---

## 16. Shop activity + profit

`/shop/activity` — owner audit of shop actions (sale, hold, return, purchase, expense, inventory tools).  
`GET /api/v1/shop/activity`

Profit periods: **today | week | month | custom**.  
`net = revenue − COGS − returns − shop expenses` (COGS from `totalCostPaise` / line costs). Include purchase totals in the report variant.  
`GET /api/v1/shop/profit`

---

## 17. Contractor / Architect / Builder modules

### BOQ + measurements (`/contractor/boq`)

BOQ: itemCode, description, unit, qty, ratePaise.  
Measurements: description, qty, unit, date, notes, optional boqItemId.

`GET|POST|PATCH /api/v1/contractor/boq`  
`GET|POST /api/v1/contractor/measurements`

### Material issue (`/contractor/material`)

itemName, qty, unit, issuedTo, date, notes, projectId.

`GET|POST /api/v1/contractor/material`

### Architect stages (`/architect/stages`)

Stage: name, sortOrder, feePaise, status `PENDING|IN_PROGRESS|SUBMITTED|APPROVED`, dueDate, completedAt.  
Revisions: revisionNo, title, notes, submittedAt, approvedAt.

`GET|POST|PATCH /api/v1/architect/stages`

### Builder units (`/builder/units`)

Unit: unitNumber unique per project, floor, areaSqft, pricePaise, status `AVAILABLE|BOOKED|SOLD`.  
Booking: buyerName, phone, bookingPaise, status `BOOKED|CANCELLED|HANDED_OVER`. Booking a unit sets BOOKED; cancel returns AVAILABLE; hand-over → SOLD.

`GET|POST|PATCH /api/v1/builder/units`  
`GET|POST|PATCH /api/v1/builder/bookings`

---

## 18. Search, notifications, command palette

**Search** `/search` + palette: projects (name/location), vendors (name/phone), expenses (description), payments (notes/ref). Respect project scope. Take 10 each.

`GET /api/v1/search?q=`

**Notifications** `/notifications` — list, mark read, unread badge on nav.

`GET /api/v1/notifications`  
`PATCH /api/v1/notifications`  
`GET /api/v1/notifications/unread-count`

**Command palette** Ctrl/Cmd+K: jump to all nav routes + remote search results + quick actions (new expense, new project, new bill).

---

## 19. Audit log

Every mutating financial/org/shop action writes `AuditLog`: action, entityType, entityId, before, after, ipAddress.

Shop actions include: `shop.sale.create`, `shop.hold_bill.*`, `shop.return.create`, `shop.purchase.*`, `shop.expense.*`, `shop.inventory.*`.

Construction: expense/payment/project/partner/vendor/document/extraction.

---

## 20. Complete REST surface (implement every one)

```
GET    /api/v1/health

POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
PATCH  /api/v1/auth/me
POST   /api/v1/auth/verify-email
POST   /api/v1/auth/resend-verification
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
POST   /api/v1/auth/change-password

POST   /api/v1/organizations
GET    /api/v1/organizations
PATCH  /api/v1/organizations
GET    /api/v1/organizations/list
POST   /api/v1/organizations/switch
DELETE /api/v1/organizations/{id}
GET    /api/v1/organizations/{id}/categories
GET    /api/v1/organizations/{id}/members
POST   /api/v1/organizations/{id}/members
POST   /api/v1/organizations/{id}/members/link

GET    /api/v1/invite/{token}
POST   /api/v1/invite/{token}/accept
GET    /api/v1/project-invite/{token}
POST   /api/v1/project-invite/{token}/accept
GET    /api/v1/beta-test-emails
POST   /api/v1/beta-test-emails
DELETE /api/v1/beta-test-emails

GET    /api/v1/dashboard
GET    /api/v1/search
GET    /api/v1/activity
GET    /api/v1/notifications
PATCH  /api/v1/notifications
GET    /api/v1/notifications/unread-count
GET    /api/v1/reports/expenses

GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/{id}
PATCH  /api/v1/projects/{id}
DELETE /api/v1/projects/{id}
GET    /api/v1/projects/{id}/summary
GET    /api/v1/projects/{id}/settlement
POST   /api/v1/projects/{id}/merge
GET    /api/v1/projects/{id}/members
GET    /api/v1/projects/{id}/partners
POST   /api/v1/projects/{id}/partners
POST   /api/v1/projects/{id}/partners/requests/{requestId}
GET    /api/v1/projects/{id}/documents
GET    /api/v1/projects/{id}/vendors

POST   /api/v1/work-orders/upload
GET    /api/v1/work-orders/{id}/extraction
POST   /api/v1/work-orders/{id}/extraction
GET    /api/v1/work-orders/{id}/preview
GET    /api/v1/documents/{id}/preview

GET    /api/v1/expenses
POST   /api/v1/expenses
PATCH  /api/v1/expenses/{id}
GET    /api/v1/payments
POST   /api/v1/payments
GET    /api/v1/vendors
POST   /api/v1/vendors
GET    /api/v1/vendors/{id}/ledger

GET    /api/v1/staff
POST   /api/v1/staff
PATCH  /api/v1/staff/{id}
GET    /api/v1/staff/attendance
POST   /api/v1/staff/attendance
GET    /api/v1/staff/attendance/regularity
GET    /api/v1/staff/advances
POST   /api/v1/staff/advances
GET    /api/v1/staff/payroll
POST   /api/v1/staff/payroll
PATCH  /api/v1/staff/payroll
GET    /api/v1/staff/payroll/{id}
GET    /api/v1/staff/me
GET    /api/v1/staff/me/attendance

GET    /api/v1/shop/dashboard
GET    /api/v1/shop/dashboard/staff-invoices
GET    /api/v1/shop/profit
GET    /api/v1/shop/sales
POST   /api/v1/shop/sales
GET    /api/v1/shop/sales/{id}
GET    /api/v1/shop/held-bills
POST   /api/v1/shop/held-bills
PATCH  /api/v1/shop/held-bills
GET    /api/v1/shop/offers
POST   /api/v1/shop/offers
PATCH  /api/v1/shop/offers/{id}
DELETE /api/v1/shop/offers/{id}
POST   /api/v1/shop/offers/preview
GET    /api/v1/shop/returns
POST   /api/v1/shop/returns
GET    /api/v1/shop/returns/returnable/{saleId}
GET    /api/v1/shop/customers
GET    /api/v1/shop/customers/{id}
GET    /api/v1/shop/customers/top
GET    /api/v1/shop/scan
GET    /api/v1/shop/inventory
POST   /api/v1/shop/inventory
PATCH  /api/v1/shop/inventory
DELETE /api/v1/shop/inventory
GET    /api/v1/shop/inventory/{id}
GET    /api/v1/shop/inventory/lookup
GET    /api/v1/shop/inventory/analytics
POST   /api/v1/shop/inventory/tools
GET    /api/v1/shop/suppliers
POST   /api/v1/shop/suppliers
GET    /api/v1/shop/purchases
POST   /api/v1/shop/purchases
GET    /api/v1/shop/purchases/{id}
PATCH  /api/v1/shop/purchases/{id}
DELETE /api/v1/shop/purchases/{id}
GET    /api/v1/shop/purchases/{id}/payments
POST   /api/v1/shop/purchases/{id}/payments
GET    /api/v1/shop/expenses
POST   /api/v1/shop/expenses
GET    /api/v1/shop/expenses/{id}
PATCH  /api/v1/shop/expenses/{id}
DELETE /api/v1/shop/expenses/{id}
GET    /api/v1/shop/expenses/categories
POST   /api/v1/shop/expenses/categories
GET    /api/v1/shop/expenses/recurring
POST   /api/v1/shop/expenses/recurring
GET    /api/v1/shop/udhaar
POST   /api/v1/shop/udhaar
PATCH  /api/v1/shop/udhaar
GET    /api/v1/shop/udhaar/{id}/ledger
POST   /api/v1/shop/udhaar/payments
GET    /api/v1/shop/activity

GET    /api/v1/contractor/boq
POST   /api/v1/contractor/boq
PATCH  /api/v1/contractor/boq
GET    /api/v1/contractor/measurements
POST   /api/v1/contractor/measurements
GET    /api/v1/contractor/material
POST   /api/v1/contractor/material
GET    /api/v1/architect/stages
POST   /api/v1/architect/stages
PATCH  /api/v1/architect/stages
GET    /api/v1/builder/units
POST   /api/v1/builder/units
PATCH  /api/v1/builder/units
GET    /api/v1/builder/bookings
POST   /api/v1/builder/bookings
PATCH  /api/v1/builder/bookings
```

Port Prisma models 1:1 to JPA. See `prisma/schema.prisma` in this repo. Do not invent a thinner schema.

---

## 21. Complete frontend route list (every page)

```
/login /register /verify-email /forgot-password /reset-password
/onboarding
/invite/{token}
/project-invite/{token}

/dashboard
/projects /projects/new /projects/{id}
/projects/{id}/vendors/{vendorId}
/work-orders/new
/expenses /expenses/new
/payments /payments/new
/vendors /vendors/new /vendors/{id}
/documents /activity /partners /reports /search /notifications

/staff /staff/me /staff/payslip/{id}

/shop/invoices /shop/invoices/new /shop/invoices/{id} /shop/invoices/settings
/shop/sales /shop/sales/invoice/{id}
/shop/scan /shop/offers /shop/returns
/shop/customers /shop/customers/top
/shop/inventory /shop/inventory/report /shop/inventory/label/{id}
/shop/purchases /shop/purchases/new /shop/purchases/{id}
/shop/expenses /shop/expenses/report
/shop/udhaar /shop/udhaar/{id}
/shop/activity

/contractor/boq /contractor/material
/architect/stages
/builder/units

/settings/profile /settings/organization /settings/members /settings/staff
```

Shell: desktop sidebar Core/Modules/Tools, mobile bottom nav + More + FAB, org switcher, theme toggle, unread badge, command palette.

---

## 22. UI-only features people skip (do not skip)

- Live thermal invoice preview while billing
- Cash tender + change
- Hold/resume bills
- Invoice draft autosave
- Offer picker when multiple offers apply
- Return panel on invoice detail
- Barcode labels (small/full) + sheet print
- Inventory tools dialog (CSV, barcodes, prices, receive, merge)
- Inventory insights (low / expiry / no barcode)
- Staff sales sidebar + monthly targets
- Customer picker create-on-type
- Nickname vs official project name
- 24h expense edit window
- Document / work-order preview dialogs
- Partner request approve/reject
- Payslip print
- Command palette Ctrl+K
- Dark/light/system theme
- Form warning vs error feedback (don’t use toast-only)
- Sector-specific inventory fields and category tree

---

## 23. Rate limits & security

- Auth 10 / 15 min / IP
- Upload 20 / hour / IP
- AI re-run 30 / hour / IP
- Every query filtered by `organizationId`
- Project-scoped roles cannot see other projects’ finance
- Cashiers cannot open inventory/purchases/profit/org settings
- HTTPS + strong JWT secret in prod

---

## 24. Build order (each slice must be feature-complete)

1. Auth + verify/reset + orgs + RBAC + onboarding + switch + members + invites + profile
2. Construction projects + expenses + payments + vendors + ledger + settlement + budget + project tabs
3. Work-order upload + AI extraction review + documents
4. Staff + attendance + payroll math + advances + payslip + self-service
5. Shop POS **complete** (cart, scan, draft, hold, offers, GST, round-off, print, customers, credit)
6. Inventory + WAC + tools + labels + alerts + analytics
7. Purchases + suppliers + payments + expenses + recurring + profit + activity
8. Udhaar ledger
9. BOQ / measurements / material / stages / units
10. Search + notifications + audit + command palette + theme + settings polish

**Parity rule:** After each slice, walk the matching pages in the original Project Z app and tick every control. Missing a hold-bill button or a payroll unmarked policy counts as incomplete.

If a rule is unclear, open `prisma/schema.prisma` and the matching file under `src/lib/` or `src/services/` in the original repo and copy the behavior — do not simplify.

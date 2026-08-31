# Project Z (BusinessOS)

**BusinessOS by E-console** — multi-tenant SaaS for Indian contractors, architects, builders, and shopkeepers. This repository is the internal **Project Z** codebase that powers BusinessOS at [www.econsole.in](https://www.econsole.in).

## What it covers

| Business type | Core work | Extra modules |
|---------------|-----------|---------------|
| **Contractor** | Work orders, expenses, vendor ledgers, partner splits | BOQ & measurements, material issue |
| **Architect** | Projects, fees, collaborator accounting | Design stages & drawing revisions |
| **Builder** | Sites, expenses, partner settlements | Units, bookings, collections |
| **Shopkeeper** | Retail store operations (no Projects nav) | Invoices, inventory, purchases, expenses, udhaar, activity |

Roles: `OWNER`, `PARTNER`, `ACCOUNTANT`, `VIEWER`, `CASHIER`. Money is stored as integer paise and shown as INR.

### Shop (retail)

Shopkeeper orgs pick a sector (grocery, hardware, electronics, clothing, pharmacy, restaurant, or general). The POS includes:

- Invoice entry with barcode scan, held bills, offers, cash tender, and print/receipt layouts
- Inventory (stock, labels, bulk CSV, costing, low-stock alerts) and supplier purchases with payments
- Customers, returns, and udhaar (credit) ledgers
- Daily/recurring expenses, profit, and an owner activity log
- Optional staff: attendance, advances, and payroll

### Construction / partner accounting

Work-order and project orgs keep the original flow: document upload with AI extraction (Groq / Gemini / manual), expenses, payments, vendor ledgers, partner contributions, and settlements.

## Quick Start (Development)

Local default is SQLite. Docker is optional.

```bash
cp .env.example .env
npm install
npm run db:migrate:dev   # first time only
npm run dev
```

Open http://localhost:3000

Optional local services (MinIO for file uploads, Postgres if you prefer it over SQLite):

```bash
docker compose up -d
```

Node 20+ is required. Generate `AUTH_SECRET` with `openssl rand -base64 32`.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run lint` | ESLint |
| `npm run test` | Unit tests |
| `npm run test:e2e` | Playwright smoke tests |
| `npm run db:migrate` | Apply migrations (production/CI) |
| `npm run db:migrate:dev` | Create/apply migrations locally |
| `npm run db:push` | Schema sync without migrations (dev only) |
| `npm run db:studio` | Prisma Studio |
| `npm run db:seed` | Seed data |
| `npm run validate:env` | Check production env vars |

## Architecture

- **Next.js 16** App Router, React 19, Tailwind 4
- **PostgreSQL** (prod / Docker) or **SQLite** (local) / **Turso** (Vercel) via Prisma
- **S3-compatible storage** (MinIO locally, Cloudflare R2 / AWS S3 in prod)
- **Auth.js** credentials + email verification (Resend)
- **AI extraction** — Groq / Gemini / manual fallback, Inngest queue with inline fallback
- **i18n** — `en` / `hi` / mixed; theme light / dark / system

## Production

This repo includes:

- Versioned Prisma migrations (`prisma/migrations`)
- Rate limiting on auth, upload, and AI re-run endpoints
- Structured JSON logging + optional `SENTRY_DSN`
- CI — migrate, unit tests, build, e2e smoke tests
- Dockerfile for container deployment

See [DEPLOY.md](./DEPLOY.md) for production steps and [TRIAL_DEPLOY.md](./TRIAL_DEPLOY.md) for a free Vercel + Turso + R2 trial.

## Health Check

`GET /api/v1/health` — returns `{ status: "ok" }` when the database is reachable.

# Project Z — Work Order & Partner Accounting Platform

Multi-tenant SaaS for managing work orders, projects, expenses, vendor ledgers, partner contributions, and settlements.

## Quick Start (Development)

```bash
docker compose up -d
cp .env.example .env
npm install
npm run db:migrate:dev   # first time only
npm run dev
```

Open http://localhost:3000

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run test` | Unit tests |
| `npm run test:e2e` | Playwright smoke tests |
| `npm run db:migrate` | Apply migrations (production/CI) |
| `npm run db:migrate:dev` | Create/apply migrations locally |
| `npm run db:push` | Schema sync without migrations (dev only) |

## Production Readiness

This repo includes:

- **Versioned Prisma migrations** (`prisma/migrations`)
- **Rate limiting** on auth, upload, and AI re-run endpoints
- **Inngest-backed extraction queue** with local inline fallback
- **Structured JSON logging** + optional `SENTRY_DSN` hook
- **CI** — migrate, unit tests, build, e2e smoke tests
- **Dockerfile** for container deployment

See [DEPLOY.md](./DEPLOY.md) for production deployment steps.

## Architecture

- **Next.js 16** App Router
- **PostgreSQL** + Prisma ORM
- **S3-compatible storage** (MinIO locally, Cloudflare R2 / AWS S3 in prod)
- **Auth.js** credentials + email verification
- **AI extraction** — Groq / Gemini / manual fallback

## Health Check

`GET /api/v1/health` — returns `{ status: "ok" }` when the database is reachable.

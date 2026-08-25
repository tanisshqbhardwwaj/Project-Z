# Production Deployment Guide

## 1. Prerequisites

- PostgreSQL 16+
- S3-compatible object storage (Cloudflare R2 recommended)
- Resend account for transactional email
- Optional: [Inngest](https://www.inngest.com/) for reliable AI extraction jobs
- Optional: Sentry for error monitoring

## 2. Environment Variables

Copy `.env.example` to your hosting provider and set:

| Variable | Required | Notes |
|----------|----------|-------|
| `TURSO_DATABASE_URL` | Yes | From Turso dashboard (`libsql://...`) |
| `TURSO_AUTH_TOKEN` | Yes | From `turso db tokens create` |
| `DATABASE_URL` | Local only | `file:./dev.db` for local SQLite dev |
| `AUTH_SECRET` | Yes | `openssl rand -base64 32` |
| `AUTH_URL` | Yes | Public app URL, e.g. `https://app.example.com` |
| `NEXT_PUBLIC_APP_URL` | Yes | Same as `AUTH_URL` |
| `S3_*` | Yes | Production bucket credentials |
| `RESEND_API_KEY` | Yes | Email delivery |
| `EMAIL_FROM` | Yes | Verified sender domain |
| `AI_PROVIDER` | Yes | `groq`, `gemini`, or `manual` |
| `GROQ_API_KEY` / `GEMINI_API_KEY` | If using AI | |
| `INNGEST_EVENT_KEY` | Recommended | Enables durable extraction queue |
| `INNGEST_SIGNING_KEY` | Recommended | Secures `/api/inngest` |
| `SENTRY_DSN` | Optional | Error monitoring hook |

## 3. Database Migrations

**Never use `db push` in production.** Run migrations on deploy:

```bash
npx prisma migrate deploy
```

The Docker image runs this automatically before starting the server.

## 4. Docker Deployment

```bash
docker build -t project-z .
docker run -p 3000:3000 --env-file .env project-z
```

Use a process manager or orchestrator (Railway, Fly.io, ECS, etc.) with:

- Health check: `GET /api/v1/health`
- At least 512MB RAM (AI extraction is memory-heavy)
- Persistent outbound access for AI + email APIs

## 5. Inngest Setup (Recommended)

1. Create an Inngest app and copy event + signing keys.
2. Set `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY`.
3. Register your app's serve URL: `https://your-domain.com/api/inngest`
4. Work order uploads queue extraction jobs with **1 first run + 3 retries (4 attempts)**. Quota/429 errors complete with empty fields and do **not** retry.

Without Inngest, extraction runs inline with **no retries** (dev/small pilots only).

## 6. Backups

- **Postgres**: enable daily automated backups from your provider.
- **Object storage**: enable bucket versioning on R2/S3.

## 7. Security Checklist

- [ ] Strong `AUTH_SECRET`
- [ ] HTTPS only in production
- [ ] Production S3 credentials (not MinIO defaults)
- [ ] Verified email domain in Resend
- [ ] Rate limits: set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` on Vercel
- [ ] Inngest signing key set if using queue

## 8. Post-Deploy Verification

```bash
curl https://your-domain.com/api/v1/health
```

Then verify:

1. Register → verify email → login
2. Create organization
3. Upload work order
4. Add expense
5. Export CSV report

## 9. CI

GitHub Actions runs on every PR to `main`:

- `prisma migrate deploy`
- Unit tests
- Production build
- Playwright smoke tests

Fix any CI failures before promoting to production.

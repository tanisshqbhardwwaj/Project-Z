# Free Trial Deploy (No Custom Domain)

Deploy Project Z for **$0** using Turso (SQLite) + Vercel + R2. No PostgreSQL or Docker required.

## What you need (all free tiers)

| Service | Free URL | Purpose |
|---------|----------|---------|
| [GitHub](https://github.com) | — | Code |
| [Turso](https://turso.tech) | — | Database (SQLite, edge-hosted) |
| [Cloudflare R2](https://developers.cloudflare.com/r2/) | — | File storage |
| [Vercel](https://vercel.com) | `*.vercel.app` | Host the app |
| [Resend](https://resend.com) | — | Email |

---

## Step 1 — Turso database (5 min)

1. Sign up at https://turso.tech
2. Install CLI (optional but easiest):
   ```bash
   # macOS/Linux
   curl -sSfL https://get.tur.so/install.sh | bash
   # Windows — use WSL or create DB in Turso dashboard
   ```
3. Create database:
   ```bash
   turso auth login
   turso db create project-z
   turso db show project-z --url
   turso db tokens create project-z
   ```
4. Copy:
   - **URL** → `libsql://project-z-xxxxx.turso.io`
   - **Token** → `eyJhbG...`

No connection strings, no ports, no SSL config — just two env vars.

---

## Step 2 — Cloudflare R2 (10 min)

1. Cloudflare dashboard → **R2** → Create bucket (`project-z`)
2. Create API token with read/write
3. Set on Vercel:

```env
S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_REGION=auto
S3_ACCESS_KEY_ID=<your-key>
S3_SECRET_ACCESS_KEY=<your-secret>
S3_BUCKET=project-z
```

---

## Step 3 — Resend (5 min)

1. https://resend.com → API key
2. For trial use: `EMAIL_FROM=Project Z <onboarding@resend.dev>`

---

## Step 4 — Deploy on Vercel (10 min)

1. https://vercel.com → Import GitHub repo
2. Add **Environment Variables** (Production):

```env
TURSO_DATABASE_URL=libsql://project-z-xxxxx.turso.io
TURSO_AUTH_TOKEN=eyJhbG...
AUTH_SECRET=<openssl rand -base64 32>
AUTH_URL=https://YOUR-APP.vercel.app
NEXT_PUBLIC_APP_URL=https://YOUR-APP.vercel.app
AI_PROVIDER=manual
RESEND_API_KEY=re_...
EMAIL_FROM=Project Z <onboarding@resend.dev>
S3_ENDPOINT=https://...
S3_REGION=auto
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_BUCKET=project-z
```

3. **Remove** any old `DATABASE_URL` pointing at `localhost:5433` from Vercel — the build will fail if it's still there.
4. Deploy
5. After first deploy, set `AUTH_URL` and `NEXT_PUBLIC_APP_URL` to your exact `https://xxx.vercel.app` URL, then redeploy.

Migrations apply automatically to Turso during build.

---

## Step 5 — Try the app

Open `https://YOUR-APP.vercel.app` → Register → Create org → Upload work order.

---

## Why Turso instead of PostgreSQL?

| | PostgreSQL (Neon) | Turso (SQLite) |
|--|--|--|
| Free tier | 500MB, can sleep | 5GB storage, 500M rows read/mo |
| Setup | Connection strings, SSL, pooler | URL + token (2 vars) |
| Vercel fit | Cold starts, connection limits | HTTP-based, edge-native |
| Cost at scale | Higher | Cheaper |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `package.json#prisma` warning | Redeploy latest code — config is in `prisma.config.mjs` |
| `localhost:5433` in build log | Delete `DATABASE_URL` from Vercel env vars |
| Build env validation errors | Read bullet list in log — each var explained |
| Login redirect loop | `AUTH_URL` must match exact Vercel URL |
| Upload fails | Check R2 credentials |
| npm deprecated warnings | Harmless — from transitive deps, not your app |

---

## Local dev (no Turso needed)

```bash
cp .env.example .env
npm install
npx prisma migrate deploy
npm run dev
```

Uses local SQLite file at `prisma/dev.db` — no Docker Postgres.

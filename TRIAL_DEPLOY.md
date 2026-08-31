# Free Trial Deploy (BusinessOS)

Deploy **BusinessOS** (Project Z codebase) for **$0** using Turso (SQLite) + Vercel + R2. No PostgreSQL or Docker required.

Production domain: **`https://www.econsole.in`**

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

## Step 3 — Resend email (domain required for real users)

**Full guide:** see [`RESEND_DOMAIN.md`](./RESEND_DOMAIN.md)

Quick version:
1. [resend.com/domains](https://resend.com/domains) → **Add Domain** → add DNS records in Cloudflare → **Verify**
2. [resend.com/api-keys](https://resend.com/api-keys) → create key → `RESEND_API_KEY`
3. On Vercel: `EMAIL_FROM=E-console <noreply@admin.econsole.in>` (no quotes)

Temporary testing only (local dev): `EMAIL_FROM=BusinessOS <onboarding@resend.dev>` and register with your **Resend account email**.

---

## Step 4 — Deploy on Vercel (10 min)

1. https://vercel.com → Import GitHub repo
2. Add **Environment Variables** (Production):

```env
TURSO_DATABASE_URL=libsql://project-z-xxxxx.turso.io
TURSO_AUTH_TOKEN=eyJhbG...
AUTH_SECRET=<openssl rand -base64 32>
AUTH_URL=https://www.econsole.in
NEXT_PUBLIC_APP_URL=https://www.econsole.in
AI_PROVIDER=manual
RESEND_API_KEY=re_...
EMAIL_FROM=E-console <noreply@admin.econsole.in>
S3_ENDPOINT=https://...
S3_REGION=auto
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_BUCKET=project-z
```

3. **Remove** any old `DATABASE_URL` pointing at `localhost:5433` from Vercel — the build will fail if it's still there.
4. Deploy
5. After first deploy, confirm `AUTH_URL` and `NEXT_PUBLIC_APP_URL` are both `https://www.econsole.in`, then redeploy if you changed them.

Migrations apply automatically to Turso during build.

---

## Step 5 — Try the app

Open `https://YOUR-APP.vercel.app` → Register → Create org → Upload work order.

---

## Step 6 — Windows download on `/pricing`

The installer is **not** uploaded automatically. Vercel only serves files that are in git (or an external URL you configure).

**Option A — ship with the site (easiest)**

1. Copy your built installer to `public/downloads/project-z-setup.exe`  
   (build: `cd desktop && npm run build:win`, then copy from `desktop/src-tauri/target/release/bundle/nsis/`)
2. Commit and push that file (it is allowed in git; other `.exe` files stay ignored)
3. Redeploy Vercel → button links to `https://YOUR-APP.vercel.app/downloads/project-z-setup.exe`

**Option B — Cloudflare R2 / external URL**

1. Upload `project-z-setup.exe` to R2 (same bucket as uploads) with public read
2. Vercel env: `NEXT_PUBLIC_WINDOWS_DOWNLOAD_URL=https://.../project-z-setup.exe`
3. Redeploy

Android APK: same pattern with `NEXT_PUBLIC_ANDROID_APK_URL` (APK must point at your **https** Vercel URL when built).

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

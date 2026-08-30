# Free Trial Deploy (No Custom Domain)

Deploy Project Z for **$0** using Prisma Postgres Free + Vercel + Cloudflare R2.

This app used to run on Turso/libsql. Production is now standard PostgreSQL. Do not set `TURSO_DATABASE_URL` or `TURSO_AUTH_TOKEN`.

## What you need (all free tiers)

| Service | Free URL | Purpose |
|---------|----------|---------|
| [GitHub](https://github.com) | — | Code |
| [Prisma Postgres](https://console.prisma.io) | Free plan | Database (PostgreSQL) |
| [Cloudflare R2](https://developers.cloudflare.com/r2/) | — | File storage (keep your existing bucket) |
| [Vercel](https://vercel.com) | `*.vercel.app` | Host the app (unchanged) |
| [Resend](https://resend.com) | — | Email |

---

## Step 1 — Prisma Postgres Free in Singapore (5 min)

1. Sign in at https://console.prisma.io
2. Create a **Prisma Postgres** database on the **Free** plan
3. Region: **ap-southeast-1 (Singapore)** — pick this so it matches the product region
4. Copy the PostgreSQL connection string (starts with `postgres://` or `postgresql://`)
5. In Vercel → Project → Settings → Environment Variables:
   - **`DATABASE_URL`** = that connection string
   - **`DIRECT_URL`** = the direct / non-pooled URL if the console shows one; otherwise paste the same string as `DATABASE_URL`

Do not invent or commit secrets. Paste only from the Prisma console.

Then apply schema on the empty database (the Vercel build also runs this):

```bash
npx prisma migrate deploy
```

---

## Step 2 — Cloudflare R2 (keep as-is)

If R2 is already configured, leave `S3_*` variables unchanged.

New setup:

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
3. On Vercel: `EMAIL_FROM=Project Z <noreply@YOUR-DOMAIN.com>` (no quotes)

Temporary testing only (no domain): `EMAIL_FROM=Project Z <onboarding@resend.dev>` and register with your **Resend account email**.

---

## Step 4 — Deploy on Vercel (10 min)

1. https://vercel.com → Import GitHub repo (hosting stays on Vercel)
2. Add **Environment Variables** (Production):

```env
DATABASE_URL=postgresql://...   # from Prisma Postgres console
DIRECT_URL=postgresql://...     # same as DATABASE_URL unless a separate direct URL is shown
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

3. Remove leftover `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` if they are still on the project.
4. Deploy
5. After first deploy, set `AUTH_URL` and `NEXT_PUBLIC_APP_URL` to your exact `https://xxx.vercel.app` URL, then redeploy.

`prisma migrate deploy` runs during the Vercel build.

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

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `package.json#prisma` warning | Redeploy latest code — config is in `prisma.config.mjs` |
| Build env validation errors | Read bullet list in log — each var explained |
| Login redirect loop | `AUTH_URL` must match exact Vercel URL |
| Upload fails | Check R2 credentials (unchanged) |
| `migrate deploy` connection error | Set `DIRECT_URL` to the direct URL from the Prisma console |
| Old Turso vars | Delete `TURSO_*` from Vercel; this app no longer reads them |
| npm deprecated warnings | Harmless — from transitive deps, not your app |

---

## Local dev

```bash
cp .env.example .env
docker compose up -d postgres
npm install
npx prisma migrate deploy
npm run dev
```

Uses local Docker Postgres on port **5433** (`postgresql://projectz:projectz@localhost:5433/projectz`).

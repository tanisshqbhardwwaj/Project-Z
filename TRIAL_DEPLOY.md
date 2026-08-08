# Free Trial Deploy (No Custom Domain)

You can run Project Z online **without buying a domain**. Every service below gives you a free subdomain like `your-app.vercel.app`.

## What you need (all have free tiers)

| Service | Free URL | Purpose |
|---------|----------|---------|
| [GitHub](https://github.com) | — | Code (already set up) |
| [Neon](https://neon.tech) | — | PostgreSQL database |
| [Cloudflare R2](https://developers.cloudflare.com/r2/) | — | File storage (work order uploads) |
| [Vercel](https://vercel.com) | `*.vercel.app` | Host the Next.js app |
| [Resend](https://resend.com) | — | Email (verification, invites) |
| [Inngest](https://www.inngest.com) | — | Optional: reliable AI extraction queue |

**Total cost for trial: $0** (within free tier limits)

---

## Step 1 — Push code to GitHub

Already done if you ran the setup from the agent. Your repo should be on GitHub.

---

## Step 2 — Neon Postgres (5 min)

1. Sign up at https://neon.tech
2. Create a project → copy the **connection string**
3. It looks like: `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`

---

## Step 3 — Cloudflare R2 (10 min)

1. Cloudflare dashboard → **R2** → Create bucket (e.g. `project-z`)
2. Create **API token** with R2 read/write
3. Note: Account ID, Access Key, Secret Key, bucket name

For S3 env vars on Vercel:

```env
S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_REGION=auto
S3_ACCESS_KEY_ID=<your-key>
S3_SECRET_ACCESS_KEY=<your-secret>
S3_BUCKET=project-z
S3_PUBLIC_URL=
```

---

## Step 4 — Resend email (5 min)

1. Sign up at https://resend.com
2. For trial, use their test domain or verify your email
3. Copy API key → `RESEND_API_KEY`

---

## Step 5 — Deploy on Vercel (10 min)

1. Go to https://vercel.com → **Add New Project**
2. Import your **GitHub repo**
3. Framework: **Next.js** (auto-detected)
4. Add **Environment Variables**:

```env
DATABASE_URL=<neon-connection-string>
AUTH_SECRET=<run: openssl rand -base64 32>
AUTH_URL=https://YOUR-APP.vercel.app
NEXT_PUBLIC_APP_URL=https://YOUR-APP.vercel.app
AI_PROVIDER=manual
RESEND_API_KEY=<resend-key>
EMAIL_FROM=Project Z <onboarding@resend.dev>
S3_ENDPOINT=...
S3_REGION=auto
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_BUCKET=project-z
```

5. **Deploy**
6. After first deploy, open Vercel → Settings → Environment Variables and **update** `AUTH_URL` and `NEXT_PUBLIC_APP_URL` to your real `https://xxx.vercel.app` URL, then **Redeploy**

### Run database migrations

After first deploy, in Vercel project → **Settings → General** note the project, then locally:

```bash
DATABASE_URL="<your-neon-url>" npx prisma migrate deploy
```

Or add a **Build Command** override:

```bash
npx prisma migrate deploy && npm run build
```

---

## Step 6 — Try the app

Open `https://YOUR-APP.vercel.app`

1. Register → verify email (check Resend logs if using test domain)
2. Create organization
3. Upload a work order

---

## Optional: Inngest (AI extraction queue)

1. https://www.inngest.com → create app
2. Add keys to Vercel env: `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`
3. Sync URL: `https://YOUR-APP.vercel.app/api/inngest`

Without Inngest, set `AI_PROVIDER=manual` and fill fields by hand (works fine for trial).

---

## Alternative: Railway (one dashboard)

If Vercel + Neon + R2 feels like too many tabs:

1. https://railway.app → New Project → Deploy from GitHub
2. Add **PostgreSQL** plugin (auto `DATABASE_URL`)
3. Still add R2 for file uploads (or uploads won't work)
4. You get `https://xxx.up.railway.app` — no domain needed

---

## What you do NOT need for trial

- Custom domain
- Paid hosting
- MinIO (local only — use R2 in cloud)
- Docker (Vercel handles build)

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Login redirect loop | `AUTH_URL` must match exact Vercel URL |
| Upload fails | Check R2 credentials and bucket name |
| DB errors | Run `prisma migrate deploy` against Neon |
| Email not sent | Check Resend dashboard / use `onboarding@resend.dev` for trial |

Your trial URL to share with partners: **`https://YOUR-APP.vercel.app`** — no domain purchase required.

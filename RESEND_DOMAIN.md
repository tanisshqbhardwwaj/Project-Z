# Resend + Custom Domain Setup

Use this so **any user** can register and receive verification emails in production for **BusinessOS** (hosted at `https://www.econsole.in`).

Without a verified domain, `onboarding@resend.dev` only delivers to **the email on your Resend account**.

---

## What you need

- Domain **`econsole.in`** (or a subdomain you verify in Resend, e.g. `admin.econsole.in`)
- DNS managed at **BigRock** (or your registrar)
- A **Resend** account with an API key

---

## Step 1 — Add domain in Resend

1. Go to [resend.com/domains](https://resend.com/domains)
2. Click **Add Domain**
3. Enter your domain, e.g. `admin.econsole.in` or `econsole.in`
4. Resend shows DNS records to add (usually **SPF**, **DKIM**, and sometimes **MX**)

Keep this tab open — you'll copy records in Step 2.

---

## Step 2 — Add DNS records at BigRock

1. Log in at [manage.bigrock.in](https://manage.bigrock.in)
2. **Domain Manager** → **econsole.in** → **Manage DNS Records**
3. Add each record Resend shows (TXT/MX on names like `send` or `resend._domainkey`)

**Important:**
- Do **not** remove the website A/CNAME records for `@` and `www` (Vercel)
- Copy values **exactly** from Resend — no extra quotes or spaces

---

## Step 3 — Verify in Resend

1. Back in Resend → your domain → **Verify**
2. Can take **5–30 minutes** (sometimes up to 48h)
3. Status must show **Verified** (green)

---

## Step 4 — Create API key (if you don't have one)

1. [resend.com/api-keys](https://resend.com/api-keys) → **Create API Key**
2. Permission: **Sending access** (or Full access)
3. Copy key → starts with `re_`

---

## Step 5 — Update Vercel env vars

**Vercel → Project → Settings → Environment Variables → Production**

| Key | Value |
|-----|--------|
| `RESEND_API_KEY` | `re_xxxxxxxx` |
| `EMAIL_FROM` | `E-console <noreply@admin.econsole.in>` |
| `AUTH_URL` | `https://www.econsole.in` |
| `NEXT_PUBLIC_APP_URL` | `https://www.econsole.in` |

**Rules for `EMAIL_FROM`:**
- Use an address **on your verified Resend domain**
- Format: `E-console <noreply@admin.econsole.in>` or just `noreply@admin.econsole.in`
- **No quotes** in the Vercel value box
- Do **not** use `onboarding@resend.dev` in production

---

## Step 6 — Redeploy

Wait for a **new deployment** from latest GitHub commit (don't Redeploy an old one).

Then test:
1. Open `https://www.econsole.in` → **Register** with any real email
2. Check inbox (and spam) for verification email from BusinessOS

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Invalid `from` field | Fix `EMAIL_FROM` format — no quotes; use verified domain |
| Email not received | Domain not Verified in Resend yet; check DNS |
| Only Resend account email works | Still using `onboarding@resend.dev` — switch to your domain |
| DNS verified but no send | Redeploy Vercel after changing `EMAIL_FROM` |
| Gmail marks as spam | Wait 24h; ensure SPF + DKIM both green in Resend |
| Verify link goes to wrong host | `AUTH_URL` and `NEXT_PUBLIC_APP_URL` must both be `https://www.econsole.in` |

---

## Quick test without a domain (local dev only)

For **local development** only:

1. Keep `EMAIL_FROM=BusinessOS <onboarding@resend.dev>`
2. **Register using the same email you used to sign up for Resend**
3. Resend will deliver only to that address

For real users, you **need a verified domain** in production.

---

## Beta test allowlist (closed beta only)

For a **closed beta** (not public launch), you may temporarily set:

```env
ALLOW_BETA_EMAIL_BYPASS=true
TEST_EMAIL_ALLOWLIST=friend1@gmail.com,friend2@gmail.com
```

Those addresses **auto-verify on register** — no Resend email sent.

**Before public launch:**
- Remove `ALLOW_BETA_EMAIL_BYPASS` (or set to `false`)
- Remove `TEST_EMAIL_ALLOWLIST`
- Production builds **fail** if bypass is still enabled

---

## Example after setup

Domain verified: `admin.econsole.in`

Vercel:
```env
RESEND_API_KEY=re_abc123...
EMAIL_FROM=E-console <noreply@admin.econsole.in>
AUTH_URL=https://www.econsole.in
NEXT_PUBLIC_APP_URL=https://www.econsole.in
```

Users register with `partner@gmail.com` → they receive a BusinessOS verification email.

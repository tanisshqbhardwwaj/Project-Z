# Resend + Custom Domain Setup

Use this so **any user** can register and receive verification emails in production.

Without a verified domain, `onboarding@resend.dev` only delivers to **the email on your Resend account**.

---

## What you need

- A **domain you control** (e.g. `yourname.com`)
- DNS managed in **Cloudflare** (recommended — you may already use it for R2)
- A **Resend** account with an API key

---

## Step 1 — Add domain in Resend

1. Go to [resend.com/domains](https://resend.com/domains)
2. Click **Add Domain**
3. Enter your domain, e.g. `yourname.com` (not a subdomain first time — use root domain)
4. Resend shows DNS records to add (usually **SPF**, **DKIM**, and sometimes **MX**)

Keep this tab open — you’ll copy records in Step 2.

---

## Step 2 — Add DNS records in Cloudflare

1. [dash.cloudflare.com](https://dash.cloudflare.com) → select your domain
2. **DNS** → **Records** → **Add record** for each row Resend shows

Typical records (yours may differ — **use exactly what Resend shows**):

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| TXT | `@` or `send` | `v=spf1 include:...` (from Resend) | **DNS only** (grey cloud) |
| TXT | `resend._domainkey` | long DKIM string from Resend | DNS only |
| MX | `send` | feedback-smtp... (if Resend asks) | DNS only |

**Important:**
- Turn **proxy OFF** (grey cloud) for email DNS records
- Copy values **exactly** from Resend — no extra quotes or spaces

---

## Step 3 — Verify in Resend

1. Back in Resend → your domain → **Verify**
2. Can take **5–30 minutes** (sometimes up to 48h)
3. Status must show **Verified** (green)

---

## Step 4 — Create API key (if you don’t have one)

1. [resend.com/api-keys](https://resend.com/api-keys) → **Create API Key**
2. Permission: **Sending access** (or Full access)
3. Copy key → starts with `re_`

---

## Step 5 — Update Vercel env vars

**Vercel → Project → Settings → Environment Variables → Production**

| Key | Value |
|-----|--------|
| `RESEND_API_KEY` | `re_xxxxxxxx` |
| `EMAIL_FROM` | `Project Z <noreply@yourname.com>` |

**Rules for `EMAIL_FROM`:**
- Use an address **on your verified domain**, e.g. `noreply@yourname.com`
- Format: `Project Z <noreply@yourname.com>` or just `noreply@yourname.com`
- **No quotes** in the Vercel value box

Replace `yourname.com` with your real domain.

---

## Step 6 — Redeploy

Wait for a **new deployment** from latest GitHub commit (don’t Redeploy an old one).

Then test:
1. Open your app → **Register** with any real email
2. Check inbox (and spam) for verification email

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Invalid `from` field | Fix `EMAIL_FROM` format — no quotes; use verified domain |
| Email not received | Domain not Verified in Resend yet; check DNS |
| Only Resend account email works | Still using `onboarding@resend.dev` — switch to your domain |
| DNS verified but no send | Redeploy Vercel after changing `EMAIL_FROM` |
| Gmail marks as spam | Wait 24h; ensure SPF + DKIM both green in Resend |

---

## Quick test without a domain (temporary)

If you **don’t have a domain yet**:

1. Keep `EMAIL_FROM=Project Z <onboarding@resend.dev>`
2. **Register using the same email you used to sign up for Resend**
3. Resend will deliver only to that address

For real users/partners, you **need a verified domain**.

---

## Example after setup

Domain: `acmebuilders.in`

Vercel:
```env
RESEND_API_KEY=re_abc123...
EMAIL_FROM=Project Z <noreply@acmebuilders.in>
```

Users register with `partner@gmail.com` → they receive verification email.

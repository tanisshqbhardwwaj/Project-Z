# One-shot cloud deploy to Vercel (free *.vercel.app URL, then add custom domain in dashboard).
# Usage:
#   npm run deploy:once
# After deploy, set AUTH_URL + NEXT_PUBLIC_APP_URL to your URL and redeploy once.

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "`n=== Project Z — deploy once (Vercel) ===" -ForegroundColor Cyan

if (-not (Test-Path ".env")) {
  Write-Host "Missing .env — copy from .env.example first." -ForegroundColor Red
  exit 1
}

Write-Host @"

Before deploy, confirm in Vercel dashboard (Environment Variables):

  DATABASE_URL, DIRECT_URL (optional if DATABASE_URL is already direct)
  AUTH_SECRET
  AUTH_URL=https://YOUR-APP.vercel.app   (update after first deploy)
  NEXT_PUBLIC_APP_URL=https://YOUR-APP.vercel.app
  RESEND_API_KEY, EMAIL_FROM
  S3_* (Cloudflare R2)
  PLATFORM_ADMIN_EMAILS
  BILLING_CONTACT

Custom domain (later): Vercel → Project → Settings → Domains → add app.yourdomain.com
Then update AUTH_URL + NEXT_PUBLIC_APP_URL and redeploy.

"@ -ForegroundColor DarkGray

Write-Host "Running prisma migrate deploy..." -ForegroundColor Yellow
npx prisma migrate deploy

Write-Host "Deploying with npx vercel --prod ..." -ForegroundColor Yellow
npx vercel --prod
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host @"

Done. Next steps (one time):
  1. Copy the production URL from Vercel output
  2. Vercel → Settings → Environment Variables → set AUTH_URL and NEXT_PUBLIC_APP_URL to that URL
  3. Redeploy: npx vercel --prod
  4. Optional: add custom domain in Vercel Domains tab

"@ -ForegroundColor Green

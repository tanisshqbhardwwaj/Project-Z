# One-shot startup: migrate Postgres + run web dev server.
# Usage:  npm run go
#         npm run go -- -Port 3001

param([int]$Port = 3000)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "`n=== Project Z — start once ===" -ForegroundColor Cyan

# Load .env into process env (simple KEY=VALUE parser)
if (Test-Path ".env") {
  Get-Content ".env" | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') {
      $key = $Matches[1].Trim()
      $val = $Matches[2].Trim().Trim('"').Trim("'")
      [Environment]::SetEnvironmentVariable($key, $val, "Process")
    }
  }
}

$env:AUTH_URL = "http://localhost:$Port"
$env:NEXT_PUBLIC_APP_URL = "http://localhost:$Port"

Write-Host "Applying Prisma migrations..." -ForegroundColor Yellow
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`nOpen:" -ForegroundColor Green
Write-Host "  Dashboard     http://localhost:$Port/dashboard"
Write-Host "  Login         http://localhost:$Port/login"
Write-Host "  Billing       http://localhost:$Port/settings/billing"
Write-Host "  Operator ops  http://localhost:$Port/ops  (PLATFORM_ADMIN_EMAILS only)"
Write-Host ""

npx next dev -p $Port

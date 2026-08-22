# One-shot Windows desktop (local-first sidecar + Tauri shell).
# Prerequisite: Rust — https://rustup.rs/
# Usage:  npm run desktop:once

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "`n=== Project Z Desktop — start once ===" -ForegroundColor Cyan

if (-not (Get-Command rustc -ErrorAction SilentlyContinue)) {
  Write-Host "Rust is not installed. Install from https://rustup.rs/ then re-run:" -ForegroundColor Red
  Write-Host "  npm run desktop:once"
  Write-Host ""
  Write-Host "For browser-only on this PC (no .exe yet), use:" -ForegroundColor Yellow
  Write-Host "  npm run go"
  exit 1
}

$dataDir = Join-Path $env:APPDATA "ProjectZ"
$dbPath = Join-Path $dataDir "shop.db"
New-Item -ItemType Directory -Force -Path $dataDir | Out-Null

# Load .env
if (Test-Path ".env") {
  Get-Content ".env" | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') {
      $key = $Matches[1].Trim()
      $val = $Matches[2].Trim().Trim('"').Trim("'")
      [Environment]::SetEnvironmentVariable($key, $val, "Process")
    }
  }
}

$env:PROJECT_Z_DESKTOP = "true"
$env:PROJECT_Z_LOCAL_MODE = "true"
$env:PROJECT_Z_DATA_DIR = $dataDir
$env:DATABASE_URL = "file:$dbPath"
$env:AUTH_URL = "http://127.0.0.1:3000"
$env:NEXT_PUBLIC_APP_URL = "http://127.0.0.1:3000"

# Free port 3000 if another dev server is running
$on3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique
foreach ($procId in $on3000) {
  if ($procId -and $procId -ne 0) {
    Write-Host "Stopping process on port 3000 (PID $procId)..." -ForegroundColor Yellow
    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
  }
}

Write-Host "Generating Prisma client..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Building Next.js (standalone)..." -ForegroundColor Yellow
npm run build:local
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Applying migrations to local shop DB: $dbPath" -ForegroundColor Yellow
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Starting Next.js sidecar on http://127.0.0.1:3000 ..." -ForegroundColor Yellow
$sidecar = Start-Process -FilePath "npm" -ArgumentList "run", "start" -PassThru -NoNewWindow `
  -WorkingDirectory (Get-Location)

Start-Sleep -Seconds 4

if (-not (Get-Process -Id $sidecar.Id -ErrorAction SilentlyContinue)) {
  Write-Host "Sidecar failed to start. Check errors above." -ForegroundColor Red
  exit 1
}

Write-Host "Launching Tauri window..." -ForegroundColor Green
Push-Location desktop
if (-not (Test-Path "node_modules")) { npm install }
try {
  npm run dev
} finally {
  Pop-Location
  if (Get-Process -Id $sidecar.Id -ErrorAction SilentlyContinue) {
    Stop-Process -Id $sidecar.Id -Force -ErrorAction SilentlyContinue
  }
}

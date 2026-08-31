# Build BusinessOS Windows NSIS installer and copy to public/downloads/businessos-setup.exe
# Prerequisite: Rust - https://rustup.rs/
# Usage: npm run desktop:build:win

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "`n=== BusinessOS Windows installer build ===" -ForegroundColor Cyan

if (-not (Get-Command rustc -ErrorAction SilentlyContinue)) {
  Write-Host "Rust is not installed. Install from https://rustup.rs/ then re-run:" -ForegroundColor Red
  Write-Host "  npm run desktop:build:win"
  exit 1
}

Write-Host "Generating brand + icon assets..." -ForegroundColor Yellow
node scripts/generate-brand-assets.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

node scripts/generate-tauri-icon.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

node scripts/generate-nsis-assets.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# Tauri frontendDist must be static web assets only (no node_modules).
# The desktop app is a WebView shell that redirects to the hosted BusinessOS URL.
$desktopDist = Join-Path (Get-Location) "desktop\dist"
$shellTemplate = Join-Path (Get-Location) "desktop\shell\index.html"
if (-not (Test-Path $shellTemplate)) {
  Write-Host "Missing desktop/shell/index.html template." -ForegroundColor Red
  exit 1
}
if (Test-Path $desktopDist) { Remove-Item $desktopDist -Recurse -Force }
New-Item -ItemType Directory -Force -Path $desktopDist | Out-Null
Copy-Item -Path $shellTemplate -Destination (Join-Path $desktopDist "index.html") -Force

Write-Host "Syncing production URL into desktop shell..." -ForegroundColor Yellow
$env:NEXT_PUBLIC_APP_URL = "https://www.econsole.in"
node scripts/sync-native-app-url.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Building Tauri NSIS installer..." -ForegroundColor Yellow
Push-Location desktop
if (-not (Test-Path "node_modules")) { npm install }
$env:CARGO_TARGET_DIR = (Join-Path (Get-Location) "src-tauri\target")
npm run build:win
$buildExit = $LASTEXITCODE
Pop-Location
if ($buildExit -ne 0) { exit $buildExit }

$nsisDir = Join-Path (Get-Location) "desktop\src-tauri\target\release\bundle\nsis"
$installer = Get-ChildItem -Path $nsisDir -Filter "*setup*.exe" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1
if (-not $installer) {
  $installer = Get-ChildItem -Path $nsisDir -Filter "*.exe" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
}
if (-not $installer) {
  Write-Host "Installer not found under $nsisDir" -ForegroundColor Red
  exit 1
}

$destDir = Join-Path (Get-Location) "public\downloads"
New-Item -ItemType Directory -Force -Path $destDir | Out-Null
$dest = Join-Path $destDir "businessos-setup.exe"
Copy-Item -Path $installer.FullName -Destination $dest -Force

Write-Host "`nDone: $dest" -ForegroundColor Green
Write-Host "Deploy to Vercel so /downloads/businessos-setup.exe serves the new installer." -ForegroundColor Cyan

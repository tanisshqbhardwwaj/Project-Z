# Fast Windows desktop dev: Next.js sidecar + Tauri window (no production build).
# Usage: npm run desktop:start

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
  [System.Environment]::GetEnvironmentVariable("Path","User")

if (-not (Get-Command rustc -ErrorAction SilentlyContinue)) {
  Write-Host "Install Rust first: winget install Rustlang.Rustup" -ForegroundColor Red
  exit 1
}

$dataDir = Join-Path $env:APPDATA "ProjectZ"
New-Item -ItemType Directory -Force -Path $dataDir | Out-Null

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
# Keep Turso for auth/org; local shop DB path for future local-first writes
$env:DATABASE_URL = "file:$((Join-Path $dataDir 'shop.db'))"
$env:AUTH_URL = "http://127.0.0.1:3000"
$env:NEXT_PUBLIC_APP_URL = "http://127.0.0.1:3000"

$on3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique
foreach ($procId in $on3000) {
  if ($procId -and $procId -ne 0) {
    Write-Host "Stopping PID $procId on port 3000..."
    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
  }
}

$iconPath = Join-Path (Get-Location) "desktop\src-tauri\icons\icon.ico"
$brandSvg = Join-Path (Get-Location) "public\brand-mark.svg"
$regenIcon = -not (Test-Path $iconPath)
if (-not $regenIcon -and (Test-Path $brandSvg)) {
  $regenIcon = (Get-Item $brandSvg).LastWriteTime -gt (Get-Item $iconPath).LastWriteTime
}
if ($regenIcon) {
  Write-Host "Generating app icons from brand mark..."
  node scripts/generate-tauri-icon.mjs
}

Write-Host "Starting Next.js sidecar..."
$logFile = Join-Path $dataDir "sidecar.log"
$sidecar = Start-Process -FilePath "cmd.exe" `
  -ArgumentList "/c", "npx next dev -p 3000 > `"$logFile`" 2>&1" `
  -PassThru -WorkingDirectory (Get-Location) -WindowStyle Hidden

$deadline = (Get-Date).AddSeconds(180)
$ready = $false
while ((Get-Date) -lt $deadline) {
  try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:3000/api/v1/health" -UseBasicParsing -TimeoutSec 3
    if ($r.StatusCode -eq 200) { $ready = $true; break }
  } catch {}
  Start-Sleep -Seconds 2
}

if (-not $ready) {
  Write-Host "Sidecar did not become ready. Last log lines:" -ForegroundColor Red
  if (Test-Path $logFile) { Get-Content $logFile -Tail 20 }
  Stop-Process -Id $sidecar.Id -Force -ErrorAction SilentlyContinue
  exit 1
}

Write-Host "Launching Tauri window..."
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

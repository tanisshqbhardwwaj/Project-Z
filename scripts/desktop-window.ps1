# Open Project Z in a borderless browser window (works without Rust/Tauri).
# Usage: npm run desktop:window

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$url = "http://127.0.0.1:3000/dashboard"
$health = "http://127.0.0.1:3000/api/v1/health"

try {
  Invoke-WebRequest -Uri $health -UseBasicParsing -TimeoutSec 3 | Out-Null
} catch {
  Write-Host "Starting Next.js first (npm run go)..." -ForegroundColor Yellow
  Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -File `"$PSScriptRoot\go-once.ps1`"" -WorkingDirectory (Get-Location)
  $deadline = (Get-Date).AddSeconds(120)
  while ((Get-Date) -lt $deadline) {
    try {
      Invoke-WebRequest -Uri $health -UseBasicParsing -TimeoutSec 3 | Out-Null
      break
    } catch { Start-Sleep -Seconds 2 }
  }
}

$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
$edge64 = "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
$chrome = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"

if (Test-Path $edge64) { Start-Process $edge64 "--app=$url --new-window" }
elseif (Test-Path $edge) { Start-Process $edge "--app=$url --new-window" }
elseif (Test-Path $chrome) { Start-Process $chrome "--app=$url --new-window" }
else { Start-Process $url }

Write-Host "App window opened: $url" -ForegroundColor Green

# Build a sideload Android APK (debug) and copy to public/downloads/project-z.apk
# Usage: npm run android:build

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$env:ANDROID_HOME = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA "Android\Sdk" }
$env:PATH = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\tools\bin;$env:PATH"

$jdk21 = Get-ChildItem "C:\Program Files\Eclipse Adoptium\jdk-21*" -ErrorAction SilentlyContinue |
  Sort-Object Name -Descending |
  Select-Object -First 1
if ($jdk21) {
  $env:JAVA_HOME = $jdk21.FullName
  $env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
  Write-Host "JAVA_HOME=$env:JAVA_HOME"
} elseif (-not $env:JAVA_HOME) {
  Write-Host "Java 21 recommended for Capacitor 8. Set JAVA_HOME to a JDK 21 install." -ForegroundColor Yellow
}

if (-not (Test-Path $env:ANDROID_HOME)) {
  Write-Host "Android SDK not found. Install Android Studio or set ANDROID_HOME." -ForegroundColor Red
  exit 1
}

if (-not $env:CAPACITOR_SERVER_URL) {
  $env:CAPACITOR_SERVER_URL = "https://beta-project-z.vercel.app"
  Write-Host "CAPACITOR_SERVER_URL=$($env:CAPACITOR_SERVER_URL)"
}

Write-Host "Preparing brand icons..."
node scripts/android-prepare.mjs

Write-Host "Syncing Capacitor android..."
npx cap sync android

Push-Location android
try {
  Write-Host "Building debug APK (gradlew assembleDebug)..."
  if ($IsWindows -or $env:OS -match "Windows") {
    .\gradlew.bat assembleDebug --no-daemon
  } else {
    ./gradlew assembleDebug --no-daemon
  }
} finally {
  Pop-Location
}

$apk = Join-Path (Get-Location) "android\app\build\outputs\apk\debug\app-debug.apk"
$destDir = Join-Path (Get-Location) "public\downloads"
$dest = Join-Path $destDir "project-z.apk"

if (-not (Test-Path $apk)) {
  Write-Host "APK not found at $apk" -ForegroundColor Red
  exit 1
}

New-Item -ItemType Directory -Force -Path $destDir | Out-Null
Copy-Item $apk $dest -Force
Write-Host "APK ready: $dest ($((Get-Item $dest).Length) bytes)"

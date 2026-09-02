# Build a sideload Android APK and copy to public/downloads/businessos.apk
# Usage: npm run android:build            (release; requires signing config)
#        npm run android:build -- -Debug  (unsigned debug APK for local testing)
# Release builds FAIL if no keystore.properties is present — no silent debug fallback.

param(
  [switch]$Debug
)

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

# Release builds bundle static UI locally; set CAPACITOR_SERVER_URL only for LAN debug.
if ($env:CAPACITOR_SERVER_URL) {
  Write-Host "LAN debug remote URL: $($env:CAPACITOR_SERVER_URL)"
} else {
  if ($env:CAPACITOR_ALLOW_CLEARTEXT -eq "true" -and -not $Debug) {
    Write-Host "ERROR: CAPACITOR_ALLOW_CLEARTEXT is not allowed for release builds." -ForegroundColor Red
    exit 1
  }
  $env:NEXT_PUBLIC_APP_URL = "https://www.econsole.in"
  Write-Host "Building bundled static UI for Android..."
  node scripts/native-static-build.mjs
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  Remove-Item Env:CAPACITOR_SERVER_URL -ErrorAction SilentlyContinue
}

if (-not $env:NEXT_PUBLIC_APP_URL) {
  $env:NEXT_PUBLIC_APP_URL = if ($env:CAPACITOR_SERVER_URL) { $env:CAPACITOR_SERVER_URL } else { "https://www.econsole.in" }
}
Write-Host "NEXT_PUBLIC_APP_URL=$($env:NEXT_PUBLIC_APP_URL)"

Write-Host "Syncing native app URLs..."
node scripts/sync-native-app-url.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Preparing brand icons..."
node scripts/android-prepare.mjs

Write-Host "Syncing Capacitor android..."
npx cap sync android
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$keystoreProps = @("android\keystore.properties", "keystore.properties") |
  Where-Object { Test-Path $_ } |
  Select-Object -First 1

if (-not $Debug -and -not $keystoreProps) {
  Write-Host ""
  Write-Host "ERROR: Release build requested but no signing config found." -ForegroundColor Red
  Write-Host "A release APK MUST be signed. To set up signing:" -ForegroundColor Yellow
  Write-Host "  1. Copy keystore.properties.template to keystore.properties (repo root or android\)"
  Write-Host "  2. Generate a keystore:"
  Write-Host "       keytool -genkeypair -v -keystore android\app\project-z-release.keystore ``"
  Write-Host "         -alias project-z -keyalg RSA -keysize 2048 -validity 10000"
  Write-Host "  3. Fill in storeFile/keyAlias/storePassword/keyPassword in keystore.properties"
  Write-Host ""
  Write-Host "For an unsigned local test build, re-run with: -Debug" -ForegroundColor Yellow
  exit 1
}

if ($Debug) {
  $gradleTask = "assembleDebug"
  $apkRelative = "android\app\build\outputs\apk\debug\app-debug.apk"
} else {
  $gradleTask = "assembleRelease"
  $apkRelative = "android\app\build\outputs\apk\release\app-release.apk"
  Write-Host "Signing config: $keystoreProps"
}

Push-Location android
try {
  Write-Host "Building APK (gradlew $gradleTask)..."
  if ($IsWindows -or $env:OS -match "Windows") {
    .\gradlew.bat $gradleTask --no-daemon
  } else {
    ./gradlew $gradleTask --no-daemon
  }
} finally {
  Pop-Location
}

$apk = Join-Path (Get-Location) $apkRelative

$destDir = Join-Path (Get-Location) "public\downloads"
$dest = Join-Path $destDir "businessos.apk"

if (-not (Test-Path $apk)) {
  Write-Host "APK not found at $apk" -ForegroundColor Red
  exit 1
}

New-Item -ItemType Directory -Force -Path $destDir | Out-Null
Copy-Item $apk $dest -Force
Write-Host "APK ready ($gradleTask): $dest ($((Get-Item $dest).Length) bytes)"

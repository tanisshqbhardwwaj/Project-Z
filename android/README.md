# Android (Capacitor)

The APK loads the live **BusinessOS by E-console** web app in a WebView and stores shop data in **SQLCipher** on the device.

- **Launcher name:** BusinessOS (home screen)
- **Window title:** BusinessOS · E-console
- **Production host:** `https://www.econsole.in`

## Build (Windows)

```bash
npm run android:build
```

This sets `CAPACITOR_SERVER_URL` (default from NEXT_PUBLIC_APP_URL), syncs Capacitor, builds a debug APK, and copies it to `public/downloads/businessos.apk`.

Override the host:

```powershell
$env:CAPACITOR_SERVER_URL="https://your-host.vercel.app"
npm run android:build
```

LAN debug against `next dev`:

```powershell
$env:CAPACITOR_SERVER_URL="http://192.168.1.10:3000"
$env:CAPACITOR_ALLOW_CLEARTEXT="true"
npx cap sync android
npm run android:open
```

## Open in Android Studio

```bash
npm run android:open
```

## Offline behaviour

- First launch needs internet: sign in and download shop data.
- After that, billing works offline; sync runs when the network returns.

## Plugins

| Plugin | Use |
|--------|-----|
| `@capacitor-community/sqlite` | Encrypted shop database |
| `@capacitor/camera` | Barcode scan |
| `@capacitor/network` | Auto-sync when online |
| `@capacitor/app` | Sync on resume |
| `@capacitor-community/keep-awake` | Screen on during billing |

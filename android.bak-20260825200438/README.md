# Android (Capacitor)

Shipping build: SQLCipher on-device, HTTPS only, CSP on the WebView host.

Point the WebView at your **https** app:

```bash
set CAPACITOR_SERVER_URL=https://your-projectz-host
npx cap sync android
npx cap open android
```

LAN debug against `next dev` (not for Play Store):

```bash
set CAPACITOR_SERVER_URL=http://192.168.1.10:3000
set CAPACITOR_ALLOW_CLEARTEXT=true
npx cap sync android
```

The shop UI is the same Next.js app. On a phone it talks to **encrypted SQLite** and syncs to the cloud when Wi‑Fi is back.

Android keeps the **full product catalog** plus **invoices from the last 90 days**.

## Offline behaviour

- First launch needs internet: sign in and **download shop data**.
- After that, open the app with Wi‑Fi off. New bills, returns (for bills already on this phone), stock, customers, and udhaar still work.
- When Wi‑Fi returns, pending rows upload (`POST /api/v1/sync/push`). Failed application rows retry up to **8** times then dead-letter.
- Cloud **file** quota being full does **not** stop billing. Only photo/backup upload is blocked. See **Settings → Storage & Sync**.

## Plugins

| Plugin | Use |
|--------|-----|
| `@capacitor-community/sqlite` | SQLCipher shop database (secret in Android Keystore) |
| `@capacitor/camera` | Barcode scan on New invoice / Returns |
| `@capacitor/network` | Auto-sync when connectivity returns |
| `@capacitor/app` | Sync again when the app resumes |
| `@capacitor-community/keep-awake` | Screen stays on during billing |

If `npx cap add android` says the platform already exists, temporarily move this README out of `android/`, run the command, then copy the README back.

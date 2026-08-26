# Project Z Desktop (Tauri 2)

Windows shop POS shell. Shop data is a **DPAPI-encrypted** snapshot at `%AppData%\ProjectZ\{orgId}\shop.db` (tied to the Windows user). The WebView CSP is set in `src-tauri/tauri.conf.json`. Offline mutations sync through `/api/v1/sync/push`; the sidecar also drains `/api/v1/sync/outbox/drain` (8 attempts, then failed).

## Prerequisites

- [Rust](https://rustup.rs/)
- [Node.js 20+](https://nodejs.org/)
- WebView2 (Windows 10/11)

## Environment (sidecar)

From the repo root, build Next standalone then point the shell at it:

```bash
npm run build:local
set PROJECT_Z_DESKTOP=true
set PROJECT_Z_DATA_DIR=%AppData%\ProjectZ
set DATABASE_URL=file:%AppData%\ProjectZ\shop.db
npm run start
```

The Tauri app loads `http://127.0.0.1:3000` and sets `PROJECT_Z_DESKTOP=true` for the sidecar process.

Counter layout is a wide window (min 1024×680) with thermal/A4 print from local bills.

## Commands

```bash
cd desktop
npm install
npm run dev          # Windows dev
npm run build:win    # Release .msi / .exe
```

## LAN pairing

Shop Android phones pair to the Windows PC via **Settings → Devices** (API: `/api/v1/desktop/devices`). The PC exposes a 6-digit PIN on the local network.

## License

Desktop builds call `GET /api/v1/desktop/plan` — subscription must be `ACTIVE` or `TRIAL`.

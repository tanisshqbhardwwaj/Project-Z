# Project Z Desktop (Tauri 2)

Windows and Android shells for the shop POS. The UI is the existing Next.js app run as a **local sidecar**; this folder is the native wrapper.

## Prerequisites

- [Rust](https://rustup.rs/)
- [Node.js 20+](https://nodejs.org/)
- WebView2 (Windows 10/11)
- For Android: Android Studio, NDK (see [Tauri mobile prerequisites](https://v2.tauri.app/start/prerequisites/))

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

## Commands

```bash
cd desktop
npm install
npm run dev          # Windows dev
npm run build:win    # Release .msi / .exe
npm run android:dev  # Android (after tauri android init)
```

## LAN pairing

Shop Android phones pair to the Windows PC via **Settings → Devices** (API: `/api/v1/desktop/devices`). The PC exposes a 6-digit PIN on the local network.

## License

Desktop builds call `GET /api/v1/desktop/plan` — subscription must be `ACTIVE` or `TRIAL`.

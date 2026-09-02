# Codebase Map — Project Z (BusinessOS)

This document explains how the repository is organized and where to find platform-specific vs shared code.

## One codebase, three shells

Project Z is **one shared Next.js + React application** that runs in three places:

| Platform | Shell location | What it does |
|----------|----------------|--------------|
| **Website** | `src/` (browser / Vercel) | Full SaaS UI + API |
| **Windows desktop** | `desktop/` (Tauri 2) | Loads the same web UI in a native window |
| **Android** | `android/` (Capacitor 8) | Loads the same web UI in a WebView |

~95% of application code lives in `src/` and is shared. Native shells (`desktop/`, `android/`) are thin wrappers.

```
src/  ──► Browser (Website)
  │
  ├──► desktop/  (Tauri → Windows)
  └──► android/  (Capacitor → Android)
```

## Layered architecture (dependency flows down)

```
app/           Routes & pages (Next.js App Router)
  ↓
components/    React UI
  ↓
hooks/ stores/ Client state
  ↓
services/      Server business logic (Prisma)
  ↓
lib/           Shared domain utilities
  ↓
platform/      Native runtime detection & adapters
  ↓
prisma/        Database schema & migrations
```

**Rule:** imports flow downward only. `app` must not import from `services` directly in client components; API routes call services.

## Domain vocabulary (same names in every layer)

| Domain | app routes | components | lib | services |
|--------|-----------|------------|-----|----------|
| Shop / retail | `app/(app)/shop/` | `components/shop/` | `lib/shop/` | `services/shop/` |
| Staff | `app/(app)/staff/` | `components/staff/` | `lib/staff/` | `services/staff/` |
| Billing | settings/billing | `components/billing/` | `lib/billing/` | `services/billing/` |
| Projects | `app/(app)/projects/` | `components/project/` | `lib/project/` | `services/projects/` |
| Service business | `app/(app)/service/` | `components/service/` | `lib/service/` | `services/service/` |
| Restaurant | `app/(app)/restaurant/` | — | — | `services/restaurant/` |
| Org / auth | settings, onboarding | `components/layout/` | `lib/org/`, `lib/auth/` | `services/org/` |

## Platform-specific code index

All native branching is isolated under `src/platform/`.

### Common (detection hub)

| File | Purpose |
|------|---------|
| `src/platform/common/native.ts` | `isTauriRuntime()`, `isCapacitorNative()`, `isCapacitorAndroid()`, `isNativeShell()`, `tauriInvoke()` |

Legacy shim: `src/lib/platform/native.ts` re-exports from `@/platform/common/native`.

### Desktop (Windows / Tauri)

| File | Purpose |
|------|---------|
| `src/platform/desktop/tauri-sql.ts` | Encrypted local DB via Tauri IPC |
| `desktop/src-tauri/` | Rust shell, NSIS installer, window config |

Legacy shim: `src/lib/sync/adapters/tauri-sql.ts` re-exports from `@/platform/desktop/tauri-sql`.

Server-side desktop mode (not Tauri client):

| File | Purpose |
|------|---------|
| `src/lib/desktop/local-mode.ts` | `PROJECT_Z_LOCAL_MODE` env, outbox processing |
| `src/app/api/v1/desktop/` | Plan, license, devices, backup API routes |

### Android (Capacitor)

| File | Purpose |
|------|---------|
| `src/platform/android/capacitor-sqlite.ts` | SQLCipher local DB |
| `src/platform/android/barcode-scan.ts` | ML Kit + camera barcode scanning |
| `src/platform/android/use-keep-awake.ts` | Screen wake lock during billing |
| `src/platform/android/android-back-button.tsx` | Hardware back button handler |
| `android/` | Gradle project, Capacitor plugins |

Legacy shims remain at old import paths for backward compatibility.

### Shared offline/sync (all platforms, adapter varies)

| Folder | Purpose |
|--------|---------|
| `src/lib/local-db/` | Adapter factory: Capacitor → Tauri → IndexedDB |
| `src/lib/sync/` | Sync engine, outbox, push policy |
| `src/components/sync/` | Offline banner, sync badge UI |

## Top-level repo layout

```
Project Z/
├── src/              Website + all shared application code
├── desktop/          Windows Tauri shell
├── android/          Android Capacitor shell
├── prisma/           Database schema & migrations
├── public/           Static assets, brand, downloads
├── docs/             Documentation (this file, deploy guides, architecture)
├── assets/           Large binary assets (OCR training data)
├── scripts/          Build, deploy, DB scripts
├── messages/         i18n JSON (en.json)
└── tests/            Unit + e2e tests
```

## Config files (do not relocate)

| File | Purpose |
|------|---------|
| `next.config.ts` | Next.js config, CSP, standalone output |
| `capacitor.config.ts` | Capacitor app ID, webDir, SQLite encryption |
| `desktop/src-tauri/tauri.conf.json` | Tauri product name, devUrl, NSIS bundle |
| `tsconfig.json` | Path alias `@/*` → `./src/*` |

## What is web-only (won't run in native shells as server code)

- All of `src/app/api/**` (~164 API routes)
- `src/middleware.ts`
- `src/inngest/`
- Nearly all of `src/services/` (Prisma / server DB)
- `src/app/(marketing)/`, `src/app/(ops)/`

Native shells load the same React UI; local SQLite adapters handle offline data on device.

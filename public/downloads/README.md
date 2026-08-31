# App downloads (BusinessOS by E-console)

- `businessos-setup.exe` — Windows installer (saved as **BusinessOS-Setup.exe** in the browser)
- `businessos.apk` — Android APK (saved as **BusinessOS.apk** in the browser)

## Windows (Vercel / git)

1. Build locally: `npm run desktop:build:win`
2. This copies the NSIS installer to `public/downloads/businessos-setup.exe`
3. Commit and redeploy → **Download for Windows** works at `/downloads/businessos-setup.exe`

Installer shows **BusinessOS** branding (not Project Z) and uses the BusinessOS icon.

No env var needed if the file is in `public/downloads/`.

## CDN (optional)

```env
NEXT_PUBLIC_WINDOWS_DOWNLOAD_URL=https://your-cdn/businessos-setup.exe
NEXT_PUBLIC_ANDROID_APK_URL=https://your-cdn/businessos.apk
```

## Legacy names

Older builds used `project-z.apk` and `project-z-setup.exe` (internal repo name). Those are no longer linked from the website.

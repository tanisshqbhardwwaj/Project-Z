Put release installers here so the pricing page can serve them:

- `project-z-setup.exe` — Windows (commit this file, then push + redeploy Vercel)
- `project-z.apk` — Android (optional; or set `NEXT_PUBLIC_ANDROID_APK_URL` on Vercel)

## Vercel (recommended)

1. Build locally: `npm run desktop:build:win` (or copy your `.exe` here as `project-z-setup.exe`)
2. Commit and push:
   ```bash
   git add public/downloads/project-z-setup.exe
   git commit -m "Add Windows installer for pricing downloads"
   git push
   ```
3. Vercel redeploys → **Download for Windows** works at `/downloads/project-z-setup.exe`

No env var needed if the file is in `public/downloads/`.

## Alternative: host elsewhere

Upload to Cloudflare R2 / S3 / GitHub Releases, then on Vercel set:

```
NEXT_PUBLIC_WINDOWS_DOWNLOAD_URL=https://your-cdn/project-z-setup.exe
NEXT_PUBLIC_ANDROID_APK_URL=https://your-cdn/project-z.apk
```

Redeploy after changing env vars.

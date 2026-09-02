# Sign in with Google — setup (one time)

Google does **not** give free login until you create an OAuth app in **your** Google Cloud account. This takes about 5 minutes.

## 1. Open Google Cloud

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with the Google account you want to own the app (e.g. admin@econsole.in)
3. Click the project dropdown (top) → **New project**
   - Name: `E-console` (or anything)
   - Click **Create**

## 2. OAuth consent screen (required first)

1. Menu → **APIs & Services** → **OAuth consent screen**
2. User type: **External** → **Create**
3. Fill in:
   - **App name:** E-console (or BusinessOS)
   - **User support email:** your email
   - **Developer contact:** your email
4. **Save and continue**
5. **Scopes:** leave default → **Save and continue**
6. **Test users** (while app is in *Testing*):
   - Add every Gmail address that should log in during testing (yours + testers)
7. **Save and continue** → **Back to dashboard**

## 3. Create OAuth Client ID

1. Menu → **APIs & Services** → **Credentials**
2. **+ Create credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `E-console local` (or `E-console production`)
5. **Authorized redirect URIs** — add **every** URL you use (exact match, no trailing slash):

   ```
   http://localhost:3000/api/auth/callback/google
   http://127.0.0.1:3000/api/auth/callback/google
   ```

   If you open the app via the Network URL from `npm run dev` (e.g. `http://172.x.x.x:3000`), add that too:
   ```
   http://YOUR-IP:3000/api/auth/callback/google
   ```

   Production:
   ```
   https://www.econsole.in/api/auth/callback/google
   ```

   **Use `/api/auth/callback/google` — not `/login`.**

6. **Create**
7. Copy **Client ID** and **Client secret**

## 4. Add to `.env`

```env
GOOGLE_CLIENT_ID="paste-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="paste-client-secret"
NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED=true
```

Restart the dev server:

```bash
npm run dev
```

## 5. Try it

Open http://localhost:3000/login → **Continue with Google**

---

## Common issues

| Problem | Fix |
|--------|-----|
| Button not visible | Set `NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED=true` and restart dev server |
| `redirect_uri_mismatch` | In Google → Credentials → your OAuth client → add **exact** redirect URI(s) above. Open the app at `http://localhost:3000` (not the Network IP). Restart dev server after fixing `.env`. |
| `Access blocked` / app not verified | Add your Gmail under **OAuth consent screen → Test users** |
| `invalid_client` | Wrong client ID/secret in `.env`; restart after editing |

## Until Google is set up

Use **email + password** on `/login` — that works without Google Cloud.

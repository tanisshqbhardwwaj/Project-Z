# User-facing errors

BusinessOS maps every API error **code** and common server message to plain-language text shown in the app.

## Layout

```
src/lib/errors/
├── index.ts           # resolveUserError(), isKnownBusinessError()
├── codes.ts           # ErrorCodes constants
├── zod-bridge.ts      # Zod validation → friendly field messages
└── messages/
    ├── auth.ts
    ├── org.ts
    ├── shop.ts
    ├── staff.ts
    ├── projects.ts
    ├── billing.ts
    └── generic.ts
```

## Adding a new error

1. Add a stable code in `codes.ts` (if the API returns `{ error: { code } }`).
2. Add the user message in the matching `messages/*.ts` file.
3. If the server uses `throw new Error("…")` without a code, add the exact string to `*MessageByText` in that file, or add a regex in `dynamicPatterns` in `index.ts` for template messages.

## Usage

```typescript
import { resolveUserError } from "@/lib/errors";

resolveUserError({ code: "EMAIL_NOT_VERIFIED" });
// → "Please verify your email before signing in…"

resolveUserError({ message: "Staff member not found" });
// → "Staff member not found."
```

The API client and `handleApi` call this automatically — forms using `applyFormError` / `ApiClientError` inherit friendly text.

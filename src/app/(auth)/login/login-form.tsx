"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import {
  AuthDivider,
  GoogleSignInButton,
} from "@/components/auth/google-sign-in-button";
import {
  FIELD_LIMITS,
  firstValidationIssue,
  requireEmail,
  requireField,
} from "@/lib/api/validation";
import { appFetch } from "@/lib/api/client";
import { isNativeShell } from "@/platform/common/native";
import { saveNativeTokens } from "@/platform/common/native-tokens";
import { useAuthStore } from "@/stores/auth-store";

export default function LoginForm({ googleLoginEnabled = false }: { googleLoginEnabled?: boolean }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const inviteToken = callbackUrl.startsWith("/invite/")
    ? callbackUrl.slice("/invite/".length).split("?")[0]
    : null;
  const registerHref = inviteToken
    ? `/register?invite=${encodeURIComponent(inviteToken)}${
        searchParams.get("email")
          ? `&email=${encodeURIComponent(searchParams.get("email")!)}`
          : ""
      }`
    : "/register";
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [totpStep, setTotpStep] = useState(false);
  const [mfaToken, setMfaToken] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const { warning, error, clear, showWarning, applyResponseError } = useFormFeedback();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const oauthError = searchParams.get("error");
    if (!oauthError) return;

    const messages: Record<string, string> = {
      Configuration:
        "Google sign-in hit a server setup issue. Restart npm run dev and try again. If it persists, check the terminal for auth errors.",
      AccessDenied:
        "Google sign-in could not finish. If you use a @econsole.in account, ensure you completed the Google prompt ΓÇö or try email/password login.",
      OAuthAccountNotLinked:
        "This email is already registered with a password. Log in with email/password, or use the same Google account after linking.",
      Callback:
        "Google sign-in callback failed. Confirm redirect URI in Google Cloud matches exactly, then restart npm run dev.",
      OAuthSignin: "Could not start Google sign-in. Restart the dev server and try again.",
      OAuthCallback: "Google sign-in callback failed. Check client ID/secret in .env.",
    };

    showWarning(messages[oauthError] ?? "Google sign-in failed. Try again or use email/password.");
  }, [searchParams, showWarning]);

  
  async function completeLogin(data: { data?: { native?: unknown } }) {
    if (isNativeShell() && data?.data?.native) {
      await saveNativeTokens(data.data.native as Parameters<typeof saveNativeTokens>[0]);
    }
    await useAuthStore.getState().bootstrap();
    router.push(callbackUrl);
    router.refresh();
  }
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    clear();

    if (totpStep) {
      if (totpCode.replace(/\s/g, "").length < 6) {
        showWarning("Enter the 6-digit code from Google Authenticator");
        return;
      }
      setLoading(true);
      const res = await appFetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mfaToken, totpCode }),
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) {
        applyResponseError(data, "Verification failed");
        if (data?.error?.code === "MFA_TOKEN_EXPIRED") {
          setTotpStep(false);
          setMfaToken("");
          setTotpCode("");
        }
        return;
      }
      await completeLogin(data);
      return;
    }

    const validationMessage = firstValidationIssue([
      requireEmail(email),
      requireField(password, "password"),
    ]);
    if (validationMessage) {
      showWarning(validationMessage);
      return;
    }

    setLoading(true);

    const res = await appFetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      applyResponseError(data, "Login failed");
      return;
    }

    if (data?.data?.requiresTotp && data?.data?.mfaToken) {
      setMfaToken(data.data.mfaToken);
      setTotpStep(true);
      setTotpCode("");
      return;
    }

    await completeLogin(data);
  }

  return (
    <Card className="w-full rounded-2xl shadow-md">
      <CardHeader>
        <CardTitle className="text-2xl">
          {totpStep ? "Authenticator code" : t("loginTitle")}
        </CardTitle>
        <CardDescription>
          {totpStep
            ? "Enter the 6-digit code from Google Authenticator"
            : t("login")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <GoogleSignInButton callbackUrl={callbackUrl} enabled={googleLoginEnabled} />
          {googleLoginEnabled ? <AuthDivider label="or sign in with email" /> : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormFeedback warning={warning} error={error} />
          {!totpStep && error && error.toLowerCase().includes("verify") && (
            <Link href="/verify-email" className="text-sm text-primary hover:underline">
              Resend verification email ΓåÆ
            </Link>
          )}
          {!totpStep ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={FIELD_LIMITS.EMAIL_MAX}
              required
            />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("password")}</Label>
                <div className="relative has-password-toggle">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    maxLength={FIELD_LIMITS.PASSWORD_MAX}
                autoComplete="current-password"
                    className="pr-11"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="totp-code">Authenticator code</Label>
              <Input
                id="totp-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                required
                autoFocus
              />
              <button
                type="button"
                className="text-sm text-primary hover:underline"
                onClick={() => {
                  setTotpStep(false);
                  setMfaToken("");
                  setTotpCode("");
                  clear();
                }}
              >
                ΓåÉ Back to password
              </button>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "..." : totpStep ? "Verify" : t("login")}
          </Button>
          {!totpStep ? (
            <div className="flex justify-between text-sm">
              <Link href="/forgot-password" className="text-primary hover:underline">
                {t("forgotPassword")}
              </Link>
              <Link href={registerHref} className="text-primary hover:underline">
                {t("noAccount")} {t("register")}
              </Link>
            </div>
          ) : null}
        </form>
        </div>
      </CardContent>
    </Card>
  );
}

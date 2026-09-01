"use client";

import { useState } from "react";
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
import { firstValidationIssue, requireEmail, requireField } from "@/lib/api/validation";
import { appFetch } from "@/lib/api/client";
import { isNativeShell } from "@/platform/common/native";
import { saveNativeTokens } from "@/platform/common/native-tokens";
import { useAuthStore } from "@/stores/auth-store";

export default function LoginForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { warning, error, clear, showWarning, applyResponseError } = useFormFeedback();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    clear();

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
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      applyResponseError(data, "Login failed");
      return;
    }

    if (isNativeShell() && data?.data?.native) {
      await saveNativeTokens(data.data.native);
    }

    await useAuthStore.getState().bootstrap();

    router.push(searchParams.get("callbackUrl") ?? "/dashboard");
    router.refresh();
  }

  return (
    <Card className="w-full rounded-2xl shadow-md">
      <CardHeader>
        <CardTitle className="text-2xl">{t("loginTitle")}</CardTitle>
        <CardDescription>{t("login")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormFeedback warning={warning} error={error} />
          {error && error.toLowerCase().includes("verify") && (
            <Link href="/verify-email" className="text-sm text-primary hover:underline">
              Resend verification email →
            </Link>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("password")}</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
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
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "..." : t("login")}
          </Button>
          <div className="flex justify-between text-sm">
            <Link href="/forgot-password" className="text-primary hover:underline">
              {t("forgotPassword")}
            </Link>
            <Link href="/register" className="text-primary hover:underline">
              {t("noAccount")} {t("register")}
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

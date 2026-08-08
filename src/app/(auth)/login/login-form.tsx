"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { firstValidationIssue, requireEmail, requireField } from "@/lib/api/validation";

export default function LoginForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

    const res = await fetch("/api/v1/auth/login", {
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

    router.push(searchParams.get("callbackUrl") ?? "/dashboard");
    router.refresh();
  }

  return (
    <Card>
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("password")}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
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

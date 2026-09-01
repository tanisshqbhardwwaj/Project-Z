"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { firstValidationIssue, requireEmail, requireField } from "@/lib/api/validation";

export default function RegisterForm() {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite") ?? "";
  const [form, setForm] = useState({
    name: "",
    email: searchParams.get("email") ?? "",
    password: "",
    phone: "",
  });
  const [message, setMessage] = useState("");
  const { warning, error, clear, showWarning, applyResponseError } = useFormFeedback();
  const [loading, setLoading] = useState(false);

  const loginHref = inviteToken
    ? `/login?callbackUrl=${encodeURIComponent(`/invite/${inviteToken}`)}${
        form.email ? `&email=${encodeURIComponent(form.email)}` : ""
      }`
    : "/login";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    clear();
    setMessage("");

    const validationMessage = firstValidationIssue([
      requireField(form.name, "name"),
      requireEmail(form.email),
      form.password.length < 8 ? "Password must be at least 8 characters" : null,
    ]);
    if (validationMessage) {
      showWarning(validationMessage);
      return;
    }

    setLoading(true);

    const res = await fetch("/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        inviteToken: inviteToken || undefined,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      applyResponseError(data, "Registration failed");
      return;
    }

    const serverMessage =
      typeof data.data?.message === "string"
        ? data.data.message
        : "Check your email to verify your account before logging in.";
    setMessage(serverMessage);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{t("registerTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormFeedback warning={warning} error={error} />
          {inviteToken ? (
            <p className="text-sm text-muted-foreground">
              After you verify your email, log in and you&apos;ll return to the invitation.
            </p>
          ) : null}
          {message && (
            <div className="space-y-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-100">
              <p>{message}</p>
              <Link href={loginHref} className="font-medium text-primary hover:underline">
                Go to login →
              </Link>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">{t("name")}</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{t("phone")}</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("password")}</Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              minLength={8}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {t("register")}
          </Button>
          <p className="text-center text-sm">
            {t("hasAccount")}{" "}
            <Link href={loginHref} className="text-primary hover:underline">
              {t("login")}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

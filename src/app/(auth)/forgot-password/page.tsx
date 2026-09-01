"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { requireEmail } from "@/lib/api/validation";
import { FIELD_LIMITS } from "@/lib/validation/fields";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const { warning, error, clear, showWarning, applyResponseError } = useFormFeedback();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    clear();
    setMessage("");

    const validationMessage = requireEmail(email);
    if (validationMessage) {
      showWarning(validationMessage);
      return;
    }

    const res = await fetch("/api/v1/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) {
      applyResponseError(data, "Could not send reset email");
      return;
    }
    setMessage("If the email exists, a reset link has been sent.");
  }

  return (
    <Card>
      <CardHeader><CardTitle>{t("forgotPassword")}</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <FormFeedback warning={warning} error={error} />
          {message && <p className="text-sm text-green-600">{message}</p>}
          <div className="space-y-2">
            <Label>{t("email")}</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={FIELD_LIMITS.EMAIL_MAX}
              autoComplete="email"
              required
            />
          </div>
          <Button type="submit" className="w-full">{t("resetPassword")}</Button>
          <Link href="/login" className="block text-center text-sm text-primary">Back to login</Link>
        </form>
      </CardContent>
    </Card>
  );
}

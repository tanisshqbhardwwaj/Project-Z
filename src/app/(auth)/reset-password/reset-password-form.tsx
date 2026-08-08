"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { requireField } from "@/lib/api/validation";

export default function ResetPasswordForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const { warning, error, clear, showWarning, applyResponseError } = useFormFeedback();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    clear();

    const validationMessage =
      requireField(password, "password") ??
      (password.length < 8 ? "Password must be at least 8 characters" : null);
    if (validationMessage) {
      showWarning(validationMessage);
      return;
    }

    const res = await fetch("/api/v1/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: searchParams.get("token"), password }),
    });
    const data = await res.json();
    if (res.ok) {
      router.push("/login");
    } else {
      applyResponseError(data, "Invalid or expired link");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("resetPassword")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <FormFeedback warning={warning} error={error} />
          <div className="space-y-2">
            <Label>{t("password")}</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full">
            {t("resetPassword")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

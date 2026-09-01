"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { FIELD_LIMITS, requireEmail } from "@/lib/api/validation";

export default function VerifyEmailForm() {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [resendEmail, setResendEmail] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const { warning, clear, showWarning } = useFormFeedback();

  const token = searchParams.get("token");

  useEffect(() => {
    if (!token || status !== "idle") return;

    async function verify() {
      setStatus("loading");
      const res = await fetch("/api/v1/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      setStatus(res.ok ? "success" : "error");
    }

    void verify();
  }, [token, status]);

  async function resendVerification(e: React.FormEvent) {
    e.preventDefault();
    clear();
    setResendMessage("");

    const validationMessage = requireEmail(resendEmail);
    if (validationMessage) {
      showWarning(validationMessage);
      return;
    }

    setResendLoading(true);

    const res = await fetch("/api/v1/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: resendEmail }),
    });

    const data = await res.json();
    setResendLoading(false);

    if (res.ok) {
      setResendMessage("Verification email sent! Check your inbox.");
    } else {
      setResendMessage(data.error?.message ?? "Failed to send email");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("verifyEmail")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {status === "loading" && <p>Verifying...</p>}
          {status === "success" && (
          <>
            <p className="text-green-600">Email verified successfully!</p>
            <Link
              href={
                searchParams.get("next")
                  ? `/login?callbackUrl=${encodeURIComponent(searchParams.get("next")!)}`
                  : "/login"
              }
            >
              <Button>{t("login")}</Button>
            </Link>
          </>
        )}
        {status === "error" && (
          <p className="text-destructive">Invalid or expired link. Request a new one below.</p>
        )}
        {!token && status !== "success" && (
          <p className="text-muted-foreground">Check your email for the verification link.</p>
        )}

        <div className="border-t pt-4">
          <p className="mb-3 text-sm font-medium">Didn&apos;t receive the email?</p>
          <form onSubmit={resendVerification} className="space-y-3">
            <FormFeedback warning={warning} />
            <div className="space-y-2">
              <Label htmlFor="resend-email">{t("email")}</Label>
              <Input
                id="resend-email"
                type="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                maxLength={FIELD_LIMITS.EMAIL_MAX}
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </div>
            {resendMessage && (
              <p
                className={`text-sm ${resendMessage.includes("sent") ? "text-green-600" : "text-destructive"}`}
              >
                {resendMessage}
              </p>
            )}
            <Button type="submit" variant="outline" disabled={resendLoading}>
              {resendLoading ? "Sending..." : "Resend verification email"}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { FIELD_LIMITS } from "@/lib/api/validation";

type SetupPayload = {
  secret: string;
  qrDataUrl: string;
  otpauthUrl: string;
};

export function AuthenticatorSettings() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [setup, setSetup] = useState<SetupPayload | null>(null);
  const [enableCode, setEnableCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const { warning, error, clear, showWarning, applyError } = useFormFeedback();

  useEffect(() => {
    apiFetch<{ enabled: boolean }>("/api/v1/auth/totp")
      .then((data) => setEnabled(data.enabled))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function startSetup() {
    clear();
    setMessage("");
    setBusy(true);
    try {
      const data = await apiFetch<SetupPayload>("/api/v1/auth/totp?action=setup", {
        method: "POST",
      });
      setSetup(data);
      setEnableCode("");
    } catch (err) {
      applyError(err, "Could not start authenticator setup");
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnable() {
    clear();
    setMessage("");
    if (enableCode.replace(/\s/g, "").length < 6) {
      showWarning("Enter the 6-digit code from Google Authenticator");
      return;
    }
    setBusy(true);
    try {
      await apiFetch("/api/v1/auth/totp?action=enable", {
        method: "POST",
        body: JSON.stringify({ code: enableCode }),
      });
      setEnabled(true);
      setSetup(null);
      setEnableCode("");
      setMessage("Google Authenticator enabled");
    } catch (err) {
      applyError(err, "Could not enable authenticator");
    } finally {
      setBusy(false);
    }
  }

  async function disableTotp() {
    clear();
    setMessage("");
    if (!disablePassword) {
      showWarning("Enter your password");
      return;
    }
    if (disableCode.replace(/\s/g, "").length < 6) {
      showWarning("Enter the 6-digit code from Google Authenticator");
      return;
    }
    setBusy(true);
    try {
      await apiFetch("/api/v1/auth/totp?action=disable", {
        method: "POST",
        body: JSON.stringify({ code: disableCode, password: disablePassword }),
      });
      setEnabled(false);
      setSetup(null);
      setDisableCode("");
      setDisablePassword("");
      setMessage("Google Authenticator disabled");
    } catch (err) {
      applyError(err, "Could not disable authenticator");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="rounded-2xl border-0 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Google Authenticator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Add a second step at sign-in using Google Authenticator or any TOTP app.
        </p>
        <FormFeedback warning={warning} error={error} />
        {message ? (
          <p className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            {message}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading security settings...</p>
        ) : enabled ? (
          <div className="space-y-4">
            <p className="text-sm font-medium text-green-700">
              Authenticator is enabled on your account.
            </p>
            <div className="space-y-2">
              <Label htmlFor="disable-totp-code">Authenticator code</Label>
              <Input
                id="disable-totp-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="disable-totp-password">Password</Label>
              <Input
                id="disable-totp-password"
                type="password"
                autoComplete="current-password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                maxLength={FIELD_LIMITS.PASSWORD_MAX}
                className="h-12 rounded-xl"
              />
            </div>
            <Button
              variant="outline"
              className="h-12 rounded-xl"
              onClick={disableTotp}
              disabled={busy}
            >
              {busy ? "Removing..." : "Disable authenticator"}
            </Button>
          </div>
        ) : setup ? (
          <div className="space-y-4">
            <p className="text-sm">
              Scan this QR code in Google Authenticator, then enter the 6-digit code to
              confirm.
            </p>
            <div className="flex justify-center rounded-xl border bg-white p-4">
              <Image
                src={setup.qrDataUrl}
                alt="Authenticator QR code"
                width={220}
                height={220}
                unoptimized
              />
            </div>
            <p className="break-all text-xs text-muted-foreground">
              Manual key: <span className="font-mono">{setup.secret}</span>
            </p>
            <div className="space-y-2">
              <Label htmlFor="enable-totp-code">Verification code</Label>
              <Input
                id="enable-totp-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                value={enableCode}
                onChange={(e) => setEnableCode(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button className="h-12 rounded-xl" onClick={confirmEnable} disabled={busy}>
                {busy ? "Enabling..." : "Enable authenticator"}
              </Button>
              <Button
                variant="outline"
                className="h-12 rounded-xl"
                onClick={() => setSetup(null)}
                disabled={busy}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button className="h-12 rounded-xl" onClick={startSetup} disabled={busy}>
            {busy ? "Preparing..." : "Set up Google Authenticator"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

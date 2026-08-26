"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  SECRET_PLACEHOLDER,
  TERMINAL_PROVIDER_CATALOG,
  terminalProviderMeta,
  type PaymentTerminalConfigPublic,
  type PaymentTerminalEnvironment,
  type PaymentTerminalProvider,
} from "@/lib/shop/payment-terminal";
import { cn } from "@/lib/utils";
import { Cable, Loader2, Wifi } from "lucide-react";

type PaymentTerminalSettingsProps = {
  value: PaymentTerminalConfigPublic;
  disabled?: boolean;
  onChange: (next: PaymentTerminalConfigPublic) => void;
  onSecretsChange: (secrets: { merchantKey?: string; bridgeApiKey?: string }) => void;
};

export function PaymentTerminalSettingsPanel({
  value,
  disabled,
  onChange,
  onSecretsChange,
}: PaymentTerminalSettingsProps) {
  const [testing, setTesting] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const meta = terminalProviderMeta(value.provider);

  async function testConnection() {
    setTesting(true);
    setTestMessage(null);
    try {
      const res = await apiFetch<{ message: string }>(
        "/api/v1/shop/payment-terminal/test",
        { method: "POST" }
      );
      setTestMessage(res.message);
    } catch (err) {
      setTestMessage(err instanceof Error ? err.message : "Connection test failed");
    } finally {
      setTesting(false);
    }
  }

  function setProvider(provider: PaymentTerminalProvider) {
    onChange({
      ...value,
      provider,
      enabled: provider !== "none" ? value.enabled : false,
    });
  }

  function showField(
    field: "mid" | "merchantKey" | "clientId" | "terminalId" | "storeId" | "bridgeUrl" | "bridgeApiKey"
  ) {
    return meta.credentialFields.includes(field);
  }

  return (
    <Card className="rounded-2xl border-0 shadow-md">
      <CardHeader>
        <CardTitle className="text-lg">Card machine</CardTitle>
        <p className="text-sm text-muted-foreground">
          Connect Paytm, Pine Labs, Razorpay POS, PhonePe, MSwipe, or a local USB
          bridge. Machine rent and MDR are billed to the shop — not Project Z.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {TERMINAL_PROVIDER_CATALOG.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={disabled}
              onClick={() => setProvider(p.id)}
              className={cn(
                "rounded-xl border px-3 py-2 text-left text-xs transition-colors sm:min-w-[9rem]",
                value.provider === p.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "text-muted-foreground hover:border-foreground/30"
              )}
            >
              <span className="font-medium">{p.label}</span>
            </button>
          ))}
        </div>

        {value.provider !== "none" ? (
          <>
            <p className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
              {meta.description}{" "}
              {meta.connection === "wireless" ? (
                <span className="inline-flex items-center gap-1">
                  <Wifi className="h-3 w-3" /> Wireless
                </span>
              ) : meta.connection === "bridge" ? (
                <span className="inline-flex items-center gap-1">
                  <Cable className="h-3 w-3" /> Bridge / USB
                </span>
              ) : null}
            </p>

            <div className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <p className="text-sm font-medium">Enable card machine</p>
                <p className="text-xs text-muted-foreground">
                  Push bill amount to the machine when collecting Card/UPI
                </p>
              </div>
              <Switch
                checked={value.enabled}
                disabled={disabled}
                onCheckedChange={(enabled) => onChange({ ...value, enabled })}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <p className="text-sm font-medium">Auto-collect on complete</p>
                <p className="text-xs text-muted-foreground">
                  Wait for machine payment before saving the bill
                </p>
              </div>
              <Switch
                checked={value.autoCollect}
                disabled={disabled || !value.enabled}
                onCheckedChange={(autoCollect) => onChange({ ...value, autoCollect })}
              />
            </div>

            <div className="space-y-2">
              <Label>Environment</Label>
              <div className="flex gap-2">
                {(
                  [
                    ["production", "Production"],
                    ["staging", "Staging / test"],
                  ] as const
                ).map(([env, label]) => (
                  <button
                    key={env}
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      onChange({ ...value, environment: env as PaymentTerminalEnvironment })
                    }
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-medium",
                      value.environment === env
                        ? "border-primary bg-primary/10 text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {showField("mid") ? (
                <div className="space-y-2">
                  <Label>Merchant ID (MID)</Label>
                  <Input
                    value={value.mid ?? ""}
                    disabled={disabled}
                    onChange={(e) => onChange({ ...value, mid: e.target.value })}
                    className="h-11 rounded-xl font-mono text-sm"
                    placeholder="From Paytm / acquirer dashboard"
                  />
                </div>
              ) : null}
              {showField("clientId") ? (
                <div className="space-y-2">
                  <Label>Client ID</Label>
                  <Input
                    value={value.clientId ?? ""}
                    disabled={disabled}
                    onChange={(e) => onChange({ ...value, clientId: e.target.value })}
                    className="h-11 rounded-xl font-mono text-sm"
                    placeholder="Paytm POS integration ID"
                  />
                </div>
              ) : null}
              {showField("terminalId") ? (
                <div className="space-y-2">
                  <Label>Terminal ID (TID)</Label>
                  <Input
                    value={value.terminalId ?? ""}
                    disabled={disabled}
                    onChange={(e) => onChange({ ...value, terminalId: e.target.value })}
                    className="h-11 rounded-xl font-mono text-sm"
                  />
                </div>
              ) : null}
              {showField("storeId") ? (
                <div className="space-y-2">
                  <Label>Store ID (optional)</Label>
                  <Input
                    value={value.storeId ?? ""}
                    disabled={disabled}
                    onChange={(e) => onChange({ ...value, storeId: e.target.value })}
                    className="h-11 rounded-xl font-mono text-sm"
                  />
                </div>
              ) : null}
              {showField("merchantKey") ? (
                <div className="space-y-2 sm:col-span-2">
                  <Label>Merchant key</Label>
                  <Input
                    type="password"
                    disabled={disabled}
                    placeholder={value.hasMerchantKey ? SECRET_PLACEHOLDER : "Paste merchant key"}
                    className="h-11 rounded-xl font-mono text-sm"
                    onChange={(e) => onSecretsChange({ merchantKey: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Stored securely on the server; never shown again after save.
                  </p>
                </div>
              ) : null}
              {showField("bridgeUrl") ? (
                <div className="space-y-2 sm:col-span-2">
                  <Label>Bridge URL</Label>
                  <Input
                    value={value.bridgeUrl ?? ""}
                    disabled={disabled}
                    onChange={(e) => onChange({ ...value, bridgeUrl: e.target.value })}
                    className="h-11 rounded-xl font-mono text-sm"
                    placeholder="http://127.0.0.1:9100"
                  />
                  <p className="text-xs text-muted-foreground">
                    Local middleware for wired USB or vendor SDK (Pine Labs, Razorpay, etc.).
                  </p>
                </div>
              ) : null}
              {showField("bridgeApiKey") ? (
                <div className="space-y-2 sm:col-span-2">
                  <Label>Bridge API key (optional)</Label>
                  <Input
                    type="password"
                    disabled={disabled}
                    placeholder={value.hasBridgeApiKey ? SECRET_PLACEHOLDER : "Bearer token"}
                    className="h-11 rounded-xl font-mono text-sm"
                    onChange={(e) => onSecretsChange({ bridgeApiKey: e.target.value })}
                  />
                </div>
              ) : null}
            </div>

            {value.enabled ? (
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={disabled || testing}
                  onClick={() => void testConnection()}
                  className="rounded-xl"
                >
                  {testing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Test connection
                </Button>
                {testMessage ? (
                  <p className="text-xs text-muted-foreground">{testMessage}</p>
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Select a provider above to connect a card machine, or keep None and record
            Card/UPI manually.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

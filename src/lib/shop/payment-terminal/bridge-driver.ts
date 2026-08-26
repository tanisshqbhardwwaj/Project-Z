import type {
  PaymentTerminalConfig,
  PaymentTerminalProvider,
  TerminalCollectResult,
  TerminalStatusResult,
} from "@/lib/shop/payment-terminal/types";

/** Standard bridge contract for Pine Labs / Razorpay POS / PhonePe / MSwipe / wired ECR. */
const BRIDGE_PROVIDERS: PaymentTerminalProvider[] = [
  "pine_labs",
  "razorpay_pos",
  "phonepe",
  "mswipe",
  "generic_bridge",
];

function bridgeHeaders(config: PaymentTerminalConfig): HeadersInit {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.bridgeApiKey) {
    headers.Authorization = `Bearer ${config.bridgeApiKey}`;
  }
  return headers;
}

function merchantTxnId(): string {
  return `PZ${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function formatTxnDate(d = new Date()): string {
  return d.toISOString();
}

export function isBridgeProvider(provider: PaymentTerminalProvider): boolean {
  return BRIDGE_PROVIDERS.includes(provider);
}

export async function bridgeCreatePaymentRequest(
  config: PaymentTerminalConfig,
  amountPaise: bigint
): Promise<TerminalCollectResult> {
  if (!config.bridgeUrl) {
    throw new Error("Bridge URL is required — set the local middleware address");
  }

  const txnDate = formatTxnDate();
  const mTxnId = merchantTxnId();
  const res = await fetch(`${config.bridgeUrl}/v1/sale`, {
    method: "POST",
    headers: bridgeHeaders(config),
    body: JSON.stringify({
      provider: config.provider,
      merchantTxnId: mTxnId,
      amountPaise: amountPaise.toString(),
      txnDate,
      mid: config.mid,
      terminalId: config.terminalId,
      paymentMode: "ALL",
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Bridge sale request failed (${res.status})`);
  }

  const json = (await res.json()) as {
    sessionId?: string;
    externalId?: string;
    displayHint?: string;
  };

  const externalId = json.sessionId ?? json.externalId ?? mTxnId;
  return {
    provider: config.provider,
    merchantTxnId: mTxnId,
    amountPaise: amountPaise.toString(),
    txnDate,
    externalId,
    displayHint:
      json.displayHint ??
      "Complete payment on the connected card machine.",
  };
}

export async function bridgePaymentStatus(
  config: PaymentTerminalConfig,
  input: { externalId: string; merchantTxnId: string }
): Promise<TerminalStatusResult> {
  if (!config.bridgeUrl) {
    throw new Error("Bridge URL is not configured");
  }

  const res = await fetch(
    `${config.bridgeUrl}/v1/status/${encodeURIComponent(input.externalId)}?merchantTxnId=${encodeURIComponent(input.merchantTxnId)}`,
    { headers: bridgeHeaders(config) }
  );

  if (!res.ok) {
    throw new Error(`Bridge status check failed (${res.status})`);
  }

  const json = (await res.json()) as {
    status?: string;
    paymentMethod?: string;
    reference?: string;
    message?: string;
  };

  return {
    status: mapBridgeStatus(json.status),
    paymentMethod:
      json.paymentMethod === "UPI"
        ? "UPI"
        : json.paymentMethod === "CARD"
          ? "CARD"
          : "OTHER",
    reference: json.reference,
    message: json.message,
  };
}

function mapBridgeStatus(raw?: string): TerminalStatusResult["status"] {
  const s = (raw ?? "PENDING").toUpperCase();
  if (s === "COMPLETED" || s === "SUCCESS") return "COMPLETED";
  if (s === "FAILED") return "FAILED";
  if (s === "EXPIRED") return "EXPIRED";
  if (s === "CANCELLED") return "CANCELLED";
  if (s === "IN_QUEUE") return "IN_QUEUE";
  return "PENDING";
}

export async function bridgeTestConnection(config: PaymentTerminalConfig): Promise<string> {
  const res = await fetch(`${config.bridgeUrl}/v1/health`, {
    headers: bridgeHeaders(config),
  });
  if (!res.ok) {
    throw new Error(`Bridge health check failed (${res.status})`);
  }
  const json = (await res.json().catch(() => ({}))) as { message?: string };
  return json.message ?? "Bridge is reachable.";
}

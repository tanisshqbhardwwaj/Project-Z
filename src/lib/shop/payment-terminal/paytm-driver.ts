import PaytmChecksum from "paytmchecksum";
import type {
  PaymentTerminalConfig,
  TerminalCollectResult,
  TerminalStatusResult,
} from "@/lib/shop/payment-terminal/types";
import { paytmEdcBaseUrl } from "@/lib/shop/payment-terminal/settings";

function formatTxnDate(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function merchantTxnId(): string {
  return `PZ${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

async function paytmReqHash(body: Record<string, string>, merchantKey: string): Promise<string> {
  const bodyStr = JSON.stringify(body);
  return PaytmChecksum.generateSignature(bodyStr, merchantKey);
}

async function paytmStatusHash(
  cpayId: string,
  mid: string,
  txnDate: string,
  merchantKey: string
): Promise<string> {
  const payload = `${cpayId}${mid}${txnDate}`;
  return PaytmChecksum.generateSignature(payload, merchantKey);
}

export async function paytmCreatePaymentRequest(
  config: PaymentTerminalConfig,
  amountPaise: bigint
): Promise<TerminalCollectResult> {
  if (!config.mid || !config.merchantKey || !config.clientId) {
    throw new Error("Paytm MID, merchant key, and client ID are required");
  }

  const txnDate = formatTxnDate();
  const mTxnId = merchantTxnId();
  const body = {
    txnDate,
    merchantTxnId: mTxnId,
    txnAmount: amountPaise.toString(),
    mid: config.mid,
  };

  const reqHash = await paytmReqHash(body, config.merchantKey);
  const base = paytmEdcBaseUrl(config.environment);
  const res = await fetch(`${base}/edc-integration-service/payment/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      head: { clientId: config.clientId, reqHash },
      body,
    }),
  });

  const json = (await res.json()) as {
    body?: {
      resultStatus?: string;
      resultMsg?: string;
      cpayId?: string;
    };
  };

  if (json.body?.resultStatus !== "SUCCESS" || !json.body.cpayId) {
    throw new Error(json.body?.resultMsg ?? "Paytm payment request failed");
  }

  return {
    provider: "paytm",
    merchantTxnId: mTxnId,
    amountPaise: amountPaise.toString(),
    txnDate,
    externalId: json.body.cpayId,
    displayHint: `On Paytm machine: open payment request ${json.body.cpayId}`,
  };
}

export async function paytmPaymentStatus(
  config: PaymentTerminalConfig,
  input: { externalId: string; txnDate: string }
): Promise<TerminalStatusResult> {
  if (!config.mid || !config.merchantKey || !config.clientId) {
    throw new Error("Paytm is not configured");
  }

  const reqHash = await paytmStatusHash(
    input.externalId,
    config.mid,
    input.txnDate,
    config.merchantKey
  );
  const base = paytmEdcBaseUrl(config.environment);
  const qs = new URLSearchParams({
    cpayId: input.externalId,
    mid: config.mid,
    txnDate: input.txnDate,
  });
  if (config.storeId) qs.set("storeId", config.storeId);

  const res = await fetch(`${base}/edc-integration-service/txn/status?${qs}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      head: { clientId: config.clientId, reqHash },
    }),
  });

  const json = (await res.json()) as {
    body?: {
      resultStatus?: string;
      resultMsg?: string;
      txnStatus?: string;
      paymentMode?: string;
      bankTxnId?: string;
      merchantReferenceId?: string;
    };
  };

  const rawStatus = (json.body?.txnStatus ?? "").toUpperCase();
  const status = mapPaytmStatus(rawStatus);

  return {
    status,
    paymentMethod: mapPaytmPaymentMode(json.body?.paymentMode),
    reference: json.body?.bankTxnId ?? json.body?.merchantReferenceId,
    message: json.body?.resultMsg,
  };
}

function mapPaytmStatus(raw: string): TerminalStatusResult["status"] {
  switch (raw) {
    case "COMPLETED":
    case "SUCCESS":
      return "COMPLETED";
    case "FAILED":
      return "FAILED";
    case "EXPIRED":
      return "EXPIRED";
    case "CANCELLED":
      return "CANCELLED";
    case "IN_QUEUE":
      return "IN_QUEUE";
    default:
      return "PENDING";
  }
}

function mapPaytmPaymentMode(mode?: string): TerminalStatusResult["paymentMethod"] {
  const m = (mode ?? "").toUpperCase();
  if (m.includes("UPI")) return "UPI";
  if (m.includes("CARD") || m.includes("DEBIT") || m.includes("CREDIT")) return "CARD";
  return "OTHER";
}

export async function paytmTestConnection(config: PaymentTerminalConfig): Promise<string> {
  const result = await paytmCreatePaymentRequest(config, BigInt(100));
  return `Connected — test request ${result.externalId} created (₹1.00). Cancel on the machine if it appears.`;
}

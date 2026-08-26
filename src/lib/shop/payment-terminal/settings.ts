import type {
  PaymentTerminalConfig,
  PaymentTerminalConfigPublic,
  PaymentTerminalEnvironment,
  PaymentTerminalProvider,
} from "@/lib/shop/payment-terminal/types";
import { defaultPaymentTerminalConfig } from "@/lib/shop/payment-terminal/types";

const SECRET_PLACEHOLDER = "********";

export function parsePaymentTerminalConfig(raw: unknown): PaymentTerminalConfig {
  const base = defaultPaymentTerminalConfig();
  if (!raw || typeof raw !== "object") return { ...base };
  const r = raw as Record<string, unknown>;

  const provider = parseProvider(r.provider) ?? base.provider;
  const environment =
    r.environment === "staging" || r.environment === "production"
      ? r.environment
      : base.environment;

  return {
    enabled: r.enabled === true,
    provider,
    autoCollect: r.autoCollect !== false,
    environment,
    mid: typeof r.mid === "string" ? r.mid.trim() || undefined : undefined,
    clientId: typeof r.clientId === "string" ? r.clientId.trim() || undefined : undefined,
    terminalId:
      typeof r.terminalId === "string" ? r.terminalId.trim() || undefined : undefined,
    storeId: typeof r.storeId === "string" ? r.storeId.trim() || undefined : undefined,
    bridgeUrl:
      typeof r.bridgeUrl === "string" ? r.bridgeUrl.trim().replace(/\/$/, "") || undefined : undefined,
    merchantKey:
      typeof r.merchantKey === "string" && r.merchantKey && r.merchantKey !== SECRET_PLACEHOLDER
        ? r.merchantKey
        : undefined,
    bridgeApiKey:
      typeof r.bridgeApiKey === "string" &&
      r.bridgeApiKey &&
      r.bridgeApiKey !== SECRET_PLACEHOLDER
        ? r.bridgeApiKey
        : undefined,
    hasMerchantKey: Boolean(r.hasMerchantKey) || Boolean(r.merchantKey),
    hasBridgeApiKey: Boolean(r.hasBridgeApiKey) || Boolean(r.bridgeApiKey),
  };
}

function parseProvider(value: unknown): PaymentTerminalProvider | undefined {
  const providers = [
    "none",
    "paytm",
    "pine_labs",
    "razorpay_pos",
    "phonepe",
    "mswipe",
    "generic_bridge",
  ] as const;
  if (typeof value === "string" && (providers as readonly string[]).includes(value)) {
    return value as PaymentTerminalProvider;
  }
  return undefined;
}

/** Strip secrets before sending settings to the browser. */
export function sanitizePaymentTerminalConfig(
  config: PaymentTerminalConfig
): PaymentTerminalConfigPublic {
  const { merchantKey: _mk, bridgeApiKey: _bk, ...rest } = config;
  return {
    ...rest,
    hasMerchantKey: Boolean(config.merchantKey || config.hasMerchantKey),
    hasBridgeApiKey: Boolean(config.bridgeApiKey || config.hasBridgeApiKey),
  };
}

export function mergePaymentTerminalConfig(
  prev: PaymentTerminalConfig | undefined,
  patch: Partial<PaymentTerminalConfig> | undefined
): PaymentTerminalConfig | undefined {
  if (!patch) return prev;
  const base = prev ?? parsePaymentTerminalConfig({});
  const next: PaymentTerminalConfig = { ...base, ...patch };

  if (patch.merchantKey === SECRET_PLACEHOLDER || patch.merchantKey === "") {
    next.merchantKey = base.merchantKey;
  }
  if (patch.bridgeApiKey === SECRET_PLACEHOLDER || patch.bridgeApiKey === "") {
    next.bridgeApiKey = base.bridgeApiKey;
  }

  if (patch.provider === "none") {
    next.enabled = false;
  }

  if (!next.merchantKey) {
    next.hasMerchantKey = Boolean(base.merchantKey);
  } else {
    next.hasMerchantKey = true;
  }
  if (!next.bridgeApiKey) {
    next.hasBridgeApiKey = Boolean(base.bridgeApiKey);
  } else {
    next.hasBridgeApiKey = true;
  }

  if (!next.enabled || next.provider === "none") {
    return {
      ...next,
      enabled: next.enabled && next.provider !== "none",
    };
  }

  return next;
}

export function isTerminalConfigured(config: PaymentTerminalConfig): boolean {
  if (!config.enabled || config.provider === "none") return false;
  const hasKey = Boolean(config.merchantKey || config.hasMerchantKey);
  if (config.provider === "paytm") {
    return Boolean(config.mid && config.clientId && hasKey);
  }
  if (config.provider === "generic_bridge") {
    return Boolean(config.bridgeUrl);
  }
  return Boolean(config.bridgeUrl || (config.mid && hasKey));
}

export function paytmEdcBaseUrl(environment: PaymentTerminalEnvironment): string {
  return environment === "staging"
    ? "https://securestage.paytmpayments.com"
    : "https://securegw-edc.paytm.in";
}

export { SECRET_PLACEHOLDER };

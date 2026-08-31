export const PAYMENT_TERMINAL_PROVIDERS = [
  "none",
  "paytm",
  "pine_labs",
  "razorpay_pos",
  "phonepe",
  "mswipe",
  "generic_bridge",
] as const;

export type PaymentTerminalProvider = (typeof PAYMENT_TERMINAL_PROVIDERS)[number];

export type PaymentTerminalEnvironment = "staging" | "production";

/** Public config returned to the browser (secrets redacted). */
export type PaymentTerminalConfigPublic = {
  enabled: boolean;
  provider: PaymentTerminalProvider;
  autoCollect: boolean;
  environment: PaymentTerminalEnvironment;
  mid?: string;
  clientId?: string;
  terminalId?: string;
  storeId?: string;
  bridgeUrl?: string;
  hasMerchantKey: boolean;
  hasBridgeApiKey: boolean;
};

/** Full config including secrets — server-side only. */
export type PaymentTerminalConfig = PaymentTerminalConfigPublic & {
  merchantKey?: string;
  bridgeApiKey?: string;
};

export type TerminalPaymentStatus =
  | "IN_QUEUE"
  | "PENDING"
  | "COMPLETED"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED";

export type TerminalCollectResult = {
  provider: PaymentTerminalProvider;
  merchantTxnId: string;
  amountPaise: string;
  txnDate: string;
  externalId: string;
  displayHint: string;
};

export type TerminalStatusResult = {
  status: TerminalPaymentStatus;
  paymentMethod?: "CARD" | "UPI" | "OTHER";
  reference?: string;
  message?: string;
};

export type TerminalProviderMeta = {
  id: PaymentTerminalProvider;
  label: string;
  description: string;
  connection: "wireless" | "bridge" | "manual";
  credentialFields: Array<
    "mid" | "merchantKey" | "clientId" | "terminalId" | "storeId" | "bridgeUrl" | "bridgeApiKey"
  >;
};

export const TERMINAL_PROVIDER_CATALOG: TerminalProviderMeta[] = [
  {
    id: "none",
    label: "None (manual)",
    description: "Enter amount on the machine yourself; BusinessOS records Card/UPI only.",
    connection: "manual",
    credentialFields: [],
  },
  {
    id: "paytm",
    label: "Paytm EDC",
    description: "Wireless Payment Request — amount is pushed to Paytm card machines on your MID.",
    connection: "wireless",
    credentialFields: ["mid", "merchantKey", "clientId", "terminalId"],
  },
  {
    id: "pine_labs",
    label: "Pine Labs (Plutus)",
    description: "Uses your Pine Labs wireless bridge URL or local ECR service.",
    connection: "bridge",
    credentialFields: ["mid", "merchantKey", "terminalId", "bridgeUrl", "bridgeApiKey"],
  },
  {
    id: "razorpay_pos",
    label: "Razorpay POS",
    description: "Connect via Razorpay POS bridge or merchant-configured endpoint.",
    connection: "bridge",
    credentialFields: ["mid", "merchantKey", "terminalId", "bridgeUrl", "bridgeApiKey"],
  },
  {
    id: "phonepe",
    label: "PhonePe EDC",
    description: "Connect via PhonePe merchant bridge URL (local or cloud).",
    connection: "bridge",
    credentialFields: ["mid", "merchantKey", "terminalId", "bridgeUrl", "bridgeApiKey"],
  },
  {
    id: "mswipe",
    label: "MSwipe",
    description: "Connect via MSwipe ECR bridge on the billing PC.",
    connection: "bridge",
    credentialFields: ["mid", "terminalId", "bridgeUrl", "bridgeApiKey"],
  },
  {
    id: "generic_bridge",
    label: "Generic bridge",
    description: "Any machine with a local HTTP bridge (wired USB ECR, custom middleware).",
    connection: "bridge",
    credentialFields: ["bridgeUrl", "bridgeApiKey", "terminalId"],
  },
];

export function terminalProviderMeta(
  provider: PaymentTerminalProvider
): TerminalProviderMeta {
  return (
    TERMINAL_PROVIDER_CATALOG.find((p) => p.id === provider) ??
    TERMINAL_PROVIDER_CATALOG[0]
  );
}

export function defaultPaymentTerminalConfig(): PaymentTerminalConfigPublic {
  return {
    enabled: false,
    provider: "none",
    autoCollect: true,
    environment: "production",
    hasMerchantKey: false,
    hasBridgeApiKey: false,
  };
}

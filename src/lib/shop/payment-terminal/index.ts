import type {
  PaymentTerminalConfig,
  TerminalCollectResult,
  TerminalStatusResult,
} from "@/lib/shop/payment-terminal/types";
import {
  isBridgeProvider,
  bridgeCreatePaymentRequest,
  bridgePaymentStatus,
  bridgeTestConnection,
} from "@/lib/shop/payment-terminal/bridge-driver";
import {
  paytmCreatePaymentRequest,
  paytmPaymentStatus,
  paytmTestConnection,
} from "@/lib/shop/payment-terminal/paytm-driver";
import { isTerminalConfigured } from "@/lib/shop/payment-terminal/settings";

export async function terminalCreatePaymentRequest(
  config: PaymentTerminalConfig,
  amountPaise: bigint
): Promise<TerminalCollectResult> {
  if (!isTerminalConfigured(config)) {
    throw new Error("Payment terminal is not configured");
  }

  switch (config.provider) {
    case "paytm":
      return paytmCreatePaymentRequest(config, amountPaise);
    default:
      if (isBridgeProvider(config.provider)) {
        return bridgeCreatePaymentRequest(config, amountPaise);
      }
      throw new Error("Unsupported payment terminal provider");
  }
}

export async function terminalPaymentStatus(
  config: PaymentTerminalConfig,
  input: {
    externalId: string;
    txnDate: string;
    merchantTxnId: string;
  }
): Promise<TerminalStatusResult> {
  switch (config.provider) {
    case "paytm":
      return paytmPaymentStatus(config, {
        externalId: input.externalId,
        txnDate: input.txnDate,
      });
    default:
      if (isBridgeProvider(config.provider)) {
        return bridgePaymentStatus(config, {
          externalId: input.externalId,
          merchantTxnId: input.merchantTxnId,
        });
      }
      throw new Error("Unsupported payment terminal provider");
  }
}

export async function terminalTestConnection(config: PaymentTerminalConfig): Promise<string> {
  if (!isTerminalConfigured(config)) {
    throw new Error("Configure the terminal before testing");
  }

  switch (config.provider) {
    case "paytm":
      return paytmTestConnection(config);
    default:
      if (isBridgeProvider(config.provider)) {
        return bridgeTestConnection(config);
      }
      throw new Error("Unsupported payment terminal provider");
  }
}

export {
  parsePaymentTerminalConfig,
  mergePaymentTerminalConfig,
  sanitizePaymentTerminalConfig,
  isTerminalConfigured,
  SECRET_PLACEHOLDER,
} from "@/lib/shop/payment-terminal/settings";
export * from "@/lib/shop/payment-terminal/types";

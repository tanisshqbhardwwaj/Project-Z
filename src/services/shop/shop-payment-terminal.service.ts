import { prisma } from "@/lib/db/prisma";
import { parseShopInvoiceSettings } from "@/lib/org/shop-settings";
import {
  parsePaymentTerminalConfig,
  terminalCreatePaymentRequest,
  terminalPaymentStatus,
  terminalTestConnection,
  type TerminalCollectResult,
  type TerminalStatusResult,
} from "@/lib/shop/payment-terminal";

async function loadTerminalConfig(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { settings: true },
  });
  if (!org) throw new Error("Organization not found");
  const invoice = parseShopInvoiceSettings(org.settings ?? {});
  return parsePaymentTerminalConfig(invoice.paymentTerminal ?? {});
}

export async function createTerminalPaymentRequest(
  organizationId: string,
  amountPaise: bigint
): Promise<TerminalCollectResult> {
  const config = await loadTerminalConfig(organizationId);
  return terminalCreatePaymentRequest(config, amountPaise);
}

export async function getTerminalPaymentStatus(
  organizationId: string,
  input: {
    externalId: string;
    txnDate: string;
    merchantTxnId: string;
  }
): Promise<TerminalStatusResult> {
  const config = await loadTerminalConfig(organizationId);
  return terminalPaymentStatus(config, input);
}

export async function testTerminalConnection(organizationId: string): Promise<string> {
  const config = await loadTerminalConfig(organizationId);
  return terminalTestConnection(config);
}

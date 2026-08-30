import { formatINR } from "@/lib/finance/money";

export function buildUdhaarReminderMessage(input: {
  shopName: string;
  customerName: string;
  balancePaise: string | number | bigint;
  shopPhone?: string | null;
}): string {
  const balance = formatINR(input.balancePaise);
  const lines = [
    `Hi ${input.customerName.trim() || "there"},`,
    "",
    `This is a friendly reminder from *${input.shopName.trim() || "our store"}*.`,
    `Your outstanding udhaar balance is *${balance}*.`,
    "",
    "Please contact us to settle at your convenience. Thank you!",
  ];
  if (input.shopPhone?.trim()) {
    lines.push("", `Contact: ${input.shopPhone.trim()}`);
  }
  return lines.join("\n");
}

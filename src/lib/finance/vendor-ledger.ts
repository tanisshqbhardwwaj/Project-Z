export interface LedgerEntry {
  date: Date;
  description: string;
  billPaise: bigint;
  paymentPaise: bigint;
  balancePaise: bigint;
  metadata?: Record<string, string>;
}

export interface VendorLedgerInput {
  expenses: Array<{
    id: string;
    expenseDate: Date;
    description: string | null;
    amountPaise: bigint;
  }>;
  payments: Array<{
    id: string;
    paymentDate: Date;
    amountPaise: bigint;
    paidByName: string;
    referenceNumber: string | null;
  }>;
}

export function buildVendorLedger(input: VendorLedgerInput): LedgerEntry[] {
  const events: Array<{
    date: Date;
    sortKey: string;
    billPaise: bigint;
    paymentPaise: bigint;
    description: string;
  }> = [];

  for (const exp of input.expenses) {
    const label = exp.description?.trim() || "Items";
    events.push({
      date: exp.expenseDate,
      sortKey: `exp-${exp.id}`,
      billPaise: exp.amountPaise,
      paymentPaise: BigInt(0),
      description: `We bought: ${label}`,
    });
  }

  for (const pay of input.payments) {
    events.push({
      date: pay.paymentDate,
      sortKey: `pay-${pay.id}`,
      billPaise: BigInt(0),
      paymentPaise: pay.amountPaise,
      description: `${pay.paidByName} paid${pay.referenceNumber ? ` (${pay.referenceNumber})` : ""}`,
    });
  }

  events.sort((a, b) => {
    const d = a.date.getTime() - b.date.getTime();
    return d !== 0 ? d : a.sortKey.localeCompare(b.sortKey);
  });

  let balance = BigInt(0);
  return events.map((e) => {
    balance = balance + e.billPaise - e.paymentPaise;
    return {
      date: e.date,
      description: e.description,
      billPaise: e.billPaise,
      paymentPaise: e.paymentPaise,
      balancePaise: balance,
    };
  });
}

export function getVendorBalance(entries: LedgerEntry[]): bigint {
  if (entries.length === 0) return BigInt(0);
  return entries[entries.length - 1].balancePaise;
}

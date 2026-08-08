import type { SplitType } from "@prisma/client";

export interface PartnerContribution {
  userId: string;
  userName: string;
  totalPaidPaise: bigint;
}

export interface SettlementSplit {
  userId: string;
  userName: string;
  sharePaise: bigint;
  paidPaise: bigint;
  deltaPaise: bigint;
}

export interface SettlementResult {
  totalContributionsPaise: bigint;
  splits: SettlementSplit[];
  owes: Array<{ fromUserId: string; toUserId: string; amountPaise: bigint }>;
}

export function calculateEqualSplit(
  contributions: PartnerContribution[]
): SettlementResult {
  const total = contributions.reduce((s, c) => s + c.totalPaidPaise, BigInt(0));
  const count = BigInt(Math.max(contributions.length, 1));
  const share = total / count;
  const remainder = total % count;

  const splits: SettlementSplit[] = contributions.map((c, i) => {
    const extra = i < Number(remainder) ? BigInt(1) : BigInt(0);
    const userShare = share + extra;
    return {
      userId: c.userId,
      userName: c.userName,
      sharePaise: userShare,
      paidPaise: c.totalPaidPaise,
      deltaPaise: c.totalPaidPaise - userShare,
    };
  });

  return buildSettlementResult(total, splits);
}

export function calculatePercentSplit(
  contributions: PartnerContribution[],
  percents: Record<string, number>
): SettlementResult {
  const total = contributions.reduce((s, c) => s + c.totalPaidPaise, BigInt(0));
  const totalPercent = Object.values(percents).reduce((s, p) => s + p, 0);

  if (Math.abs(totalPercent - 100) > 0.01 && totalPercent > 0) {
    throw new Error("Percent splits must sum to 100");
  }

  const splits: SettlementSplit[] = contributions.map((c) => {
    const pct = percents[c.userId] ?? 0;
    const share = BigInt(Math.round(Number(total) * (pct / 100)));
    return {
      userId: c.userId,
      userName: c.userName,
      sharePaise: share,
      paidPaise: c.totalPaidPaise,
      deltaPaise: c.totalPaidPaise - share,
    };
  });

  return buildSettlementResult(total, splits);
}

export function calculateCustomSplit(
  contributions: PartnerContribution[],
  customShares: Record<string, bigint>
): SettlementResult {
  const total = contributions.reduce((s, c) => s + c.totalPaidPaise, BigInt(0));

  const splits: SettlementSplit[] = contributions.map((c) => {
    const share = customShares[c.userId] ?? BigInt(0);
    return {
      userId: c.userId,
      userName: c.userName,
      sharePaise: share,
      paidPaise: c.totalPaidPaise,
      deltaPaise: c.totalPaidPaise - share,
    };
  });

  return buildSettlementResult(total, splits);
}

export function calculateSettlement(
  splitType: SplitType,
  contributions: PartnerContribution[],
  config?: { percents?: Record<string, number>; customShares?: Record<string, bigint> }
): SettlementResult {
  if (contributions.length === 0) {
    return { totalContributionsPaise: BigInt(0), splits: [], owes: [] };
  }
  if (contributions.length === 1) {
    const c = contributions[0];
    return {
      totalContributionsPaise: c.totalPaidPaise,
      splits: [
        {
          userId: c.userId,
          userName: c.userName,
          sharePaise: c.totalPaidPaise,
          paidPaise: c.totalPaidPaise,
          deltaPaise: BigInt(0),
        },
      ],
      owes: [],
    };
  }

  switch (splitType) {
    case "PERCENT":
      return calculatePercentSplit(contributions, config?.percents ?? {});
    case "CUSTOM":
      return calculateCustomSplit(contributions, config?.customShares ?? {});
    case "EQUAL":
    default:
      return calculateEqualSplit(contributions);
  }
}

function buildSettlementResult(
  total: bigint,
  splits: SettlementSplit[]
): SettlementResult {
  const owes: SettlementResult["owes"] = [];
  const debtors = splits
    .filter((s) => s.deltaPaise < BigInt(0))
    .map((s) => ({ ...s, remaining: -s.deltaPaise }));
  const creditors = splits
    .filter((s) => s.deltaPaise > BigInt(0))
    .map((s) => ({ ...s, remaining: s.deltaPaise }));

  let di = 0;
  let ci = 0;
  while (di < debtors.length && ci < creditors.length) {
    const amount =
      debtors[di].remaining < creditors[ci].remaining
        ? debtors[di].remaining
        : creditors[ci].remaining;
    if (amount > BigInt(0)) {
      owes.push({
        fromUserId: debtors[di].userId,
        toUserId: creditors[ci].userId,
        amountPaise: amount,
      });
    }
    debtors[di].remaining -= amount;
    creditors[ci].remaining -= amount;
    if (debtors[di].remaining === BigInt(0)) di++;
    if (creditors[ci].remaining === BigInt(0)) ci++;
  }

  return { totalContributionsPaise: total, splits, owes };
}

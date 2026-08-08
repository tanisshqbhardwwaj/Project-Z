import { describe, it, expect } from "vitest";
import { calculateEqualSplit, calculatePercentSplit } from "@/lib/finance/settlement";

describe("settlement", () => {
  it("calculates equal split — Owner owes Partner B ₹15,000", () => {
    const result = calculateEqualSplit([
      { userId: "owner", userName: "Owner", totalPaidPaise: BigInt(5000000) },
      { userId: "partner", userName: "Partner B", totalPaidPaise: BigInt(8000000) },
    ]);

    expect(result.totalContributionsPaise).toBe(BigInt(13000000));
    expect(result.splits[0].sharePaise).toBe(BigInt(6500000));
    expect(result.splits[1].sharePaise).toBe(BigInt(6500000));
    expect(result.owes).toHaveLength(1);
    expect(result.owes[0].amountPaise).toBe(BigInt(1500000));
    expect(result.owes[0].fromUserId).toBe("owner");
    expect(result.owes[0].toUserId).toBe("partner");
  });

  it("calculates percent split 60/40", () => {
    const result = calculatePercentSplit(
      [
        { userId: "a", userName: "A", totalPaidPaise: BigInt(5000000) },
        { userId: "b", userName: "B", totalPaidPaise: BigInt(8000000) },
      ],
      { a: 40, b: 60 }
    );

    expect(result.splits.find((s) => s.userId === "b")?.sharePaise).toBe(BigInt(7800000));
    expect(result.splits.find((s) => s.userId === "a")?.sharePaise).toBe(BigInt(5200000));
  });
});

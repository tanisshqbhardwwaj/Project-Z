import { describe, expect, it } from "vitest";
import { buildCashTender } from "@/components/shop/cash-tender-panel";

describe("buildCashTender", () => {
  it("computes change when customer pays more than total", () => {
    expect(buildCashTender(800, "1000")).toEqual({
      receivedRupees: 1000,
      changeRupees: 200,
    });
  });

  it("shows zero change when customer pays less (short payment)", () => {
    expect(buildCashTender(800, "500")).toEqual({
      receivedRupees: 500,
      changeRupees: 0,
    });
  });

  it("handles exact cash", () => {
    expect(buildCashTender(800, "800")).toEqual({
      receivedRupees: 800,
      changeRupees: 0,
    });
  });
});

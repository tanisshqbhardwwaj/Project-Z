import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/inngest/client", () => ({
  inngest: {
    send: vi.fn(),
  },
  EXTRACTION_EVENT: "work-order/extraction.requested",
  isInngestEnabled: vi.fn(),
}));

vi.mock("@/services/shared/extraction.service", () => ({
  runWorkOrderExtraction: vi.fn(),
}));

import { inngest, isInngestEnabled } from "@/inngest/client";
import { runWorkOrderExtraction } from "@/services/shared/extraction.service";
import { queueWorkOrderExtraction } from "@/services/shared/extraction-queue.service";

describe("extraction queue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends an Inngest event when configured", async () => {
    vi.mocked(isInngestEnabled).mockReturnValue(true);

    await queueWorkOrderExtraction({
      documentId: "doc-1",
      extractionId: "ext-1",
    });

    expect(inngest.send).toHaveBeenCalledWith({
      name: "work-order/extraction.requested",
      data: { documentId: "doc-1", extractionId: "ext-1" },
    });
    expect(runWorkOrderExtraction).not.toHaveBeenCalled();
  });

  it("falls back to inline extraction when Inngest is disabled", async () => {
    vi.mocked(isInngestEnabled).mockReturnValue(false);
    vi.mocked(runWorkOrderExtraction).mockResolvedValue(undefined);

    await queueWorkOrderExtraction({
      documentId: "doc-2",
      extractionId: "ext-2",
    });

    expect(inngest.send).not.toHaveBeenCalled();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(runWorkOrderExtraction).toHaveBeenCalledWith("doc-2", "ext-2");
  });
});

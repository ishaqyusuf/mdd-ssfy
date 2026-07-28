import { describe, expect, it } from "bun:test";
import { buildPackItemTaskPayload } from "./pack-task-payload";

describe("buildPackItemTaskPayload", () => {
  it("builds update-sales-control payload with packingLines only", () => {
    const result = buildPackItemTaskPayload({
      salesId: 101,
      dispatchId: 5001,
      dispatchStatus: "queue",
      authorId: 7,
      authorName: "Driver",
      packingLines: [
        {
          salesItemId: 9,
          submissionId: 7001,
          qty: { qty: 2 },
          note: "packed from mobile",
        },
      ],
    });

    expect(result.taskName).toBe("update-sales-control");
    expect(result.payload.packItems.packMode).toBe("selection");
    expect(result.payload.packItems.packingLines).toHaveLength(1);
    expect(result.payload.packItems.packingLines[0]).toEqual({
      salesItemId: 9,
      submissionId: 7001,
      qty: { qty: 2 },
      note: "packed from mobile",
    });
    expect((result.payload.packItems as any).packingList).toBeUndefined();
  });
});

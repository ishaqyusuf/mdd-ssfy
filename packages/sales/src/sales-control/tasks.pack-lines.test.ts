import { describe, expect, it } from "bun:test";
import { buildAutoPackingLines } from "./tasks";

describe("buildAutoPackingLines", () => {
  it("includes deliverables for both production and non-production items", () => {
    const lines = buildAutoPackingLines({
      items: [
        {
          itemId: 10,
          itemConfig: { production: true },
          deliverables: [
            { submissionId: 1001, qty: { qty: 2, noHandle: true } },
            { submissionId: 1002, qty: { qty: 0, noHandle: true } },
          ],
        },
        {
          itemId: 20,
          itemConfig: { production: false },
          deliverables: [{ submissionId: 2001, qty: { qty: 3, noHandle: true } }],
        },
        {
          itemId: null,
          itemConfig: { production: false },
          deliverables: [{ submissionId: 3001, qty: { qty: 5, noHandle: true } }],
        },
      ],
    } as any);

    expect(lines).toEqual([
      { salesItemId: 10, submissionId: 1001, qty: { qty: 2, noHandle: true } },
      { salesItemId: 20, submissionId: 2001, qty: { qty: 3, noHandle: true } },
    ]);
  });
});

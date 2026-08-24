import { describe, expect, it } from "bun:test";

import {
  getDispatchInventoryReadiness,
  resolvePackedLegacyInventoryReadiness,
} from "./inventory-readiness";

describe("dispatch inventory readiness", () => {
  it("distinguishes ready, reserved, backordered, and review states", () => {
    expect(
      getDispatchInventoryReadiness([
        { requiredQty: 2, allocations: [{ qty: 2, status: "picked" }] },
      ]),
    ).toBe("ready_to_load");
    expect(
      getDispatchInventoryReadiness([
        { requiredQty: 2, allocations: [{ qty: 2, status: "reserved" }] },
      ]),
    ).toBe("reserved");
    expect(
      getDispatchInventoryReadiness([
        { requiredQty: 2, allocations: [], inboundQty: 2 },
      ]),
    ).toBe("backordered");
    expect(
      getDispatchInventoryReadiness([
        {
          requiredQty: 2,
          allocations: [{ qty: 2, status: "pending_review" }],
        },
      ]),
    ).toBe("inventory_review");
  });

  it("accepts fully packed legacy lines only when no component ledger exists", () => {
    expect(
      resolvePackedLegacyInventoryReadiness({
        readiness: "inventory_review",
        componentCount: 0,
        packedQty: 7,
        targetQty: 7,
      }),
    ).toBe("ready_to_load");
    expect(
      resolvePackedLegacyInventoryReadiness({
        readiness: "inventory_review",
        componentCount: 0,
        packedQty: 6,
        targetQty: 7,
      }),
    ).toBe("inventory_review");
    expect(
      resolvePackedLegacyInventoryReadiness({
        readiness: "inventory_review",
        componentCount: 1,
        packedQty: 7,
        targetQty: 7,
      }),
    ).toBe("inventory_review");
  });
});

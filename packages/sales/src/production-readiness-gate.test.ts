import { describe, expect, it } from "bun:test";
import { buildSalesProductionPlan } from "./sales-fulfillment-plan";
import { evaluateProductionReadinessGate } from "./production-readiness-gate";

describe("evaluateProductionReadinessGate", () => {
  it("allows production when all required components are allocated or fulfilled", () => {
    const plan = buildSalesProductionPlan([
      {
        id: 1,
        uid: "line-1",
        qty: 2,
        components: [
          {
            id: 10,
            required: true,
            qty: 2,
            stockAllocations: [{ qty: 2, status: "reserved" }],
          },
          {
            id: 11,
            required: true,
            qty: 1,
            stockAllocations: [{ qty: 1, status: "consumed" }],
          },
        ],
      },
    ]);

    const result = evaluateProductionReadinessGate(plan);

    expect(result.allowed).toBe(true);
    expect(result.blockers).toHaveLength(0);
    expect(result.readiness).toBe("ready_for_production");
  });

  it("blocks production when a required component awaits inbound stock", () => {
    const plan = buildSalesProductionPlan([
      {
        id: 1,
        uid: "line-1",
        title: "Entry Door",
        qty: 2,
        components: [
          {
            id: 10,
            required: true,
            qty: 2,
            stockAllocations: [{ qty: 1, status: "reserved" }],
            inboundDemands: [{ qty: 1, qtyReceived: 0, status: "ordered" }],
          },
        ],
      },
    ]);

    const result = evaluateProductionReadinessGate(plan);

    expect(result.allowed).toBe(false);
    expect(result.readiness).toBe("awaiting_inbound");
    expect(result.blockers[0]).toMatchObject({
      componentId: 10,
      lineTitle: "Entry Door",
      readiness: "awaiting_inbound",
      reason: "awaiting_inbound",
    });
  });

  it("blocks production while allocation is still pending review", () => {
    const plan = buildSalesProductionPlan([
      {
        id: 1,
        uid: "line-1",
        qty: 1,
        components: [
          {
            id: 10,
            required: true,
            qty: 1,
            stockAllocations: [{ qty: 1, status: "pending_review" }],
          },
        ],
      },
    ]);

    const result = evaluateProductionReadinessGate(plan);

    expect(result.allowed).toBe(false);
    expect(result.blockers[0]?.reason).toBe("allocation_review");
  });

  it("blocks production when inventory line components are missing", () => {
    const plan = buildSalesProductionPlan([]);

    const result = evaluateProductionReadinessGate(plan);

    expect(result.allowed).toBe(false);
    expect(result.readiness).toBe("not_synced");
    expect(result.blockers[0]?.reason).toBe("missing_inventory_components");
  });
});

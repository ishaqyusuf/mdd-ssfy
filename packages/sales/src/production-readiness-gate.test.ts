import { describe, expect, it } from "bun:test";
import { buildProductionReadinessRevision } from "./production-readiness-evidence";
import {
  evaluateProductionReadinessGate,
  evaluateProductionReadinessGateWithOverride,
  shouldEnforceProductionReadinessGate,
} from "./production-readiness-gate";
import { buildSalesProductionPlan } from "./sales-fulfillment-plan";

function requireRevision(revision: string | null) {
  expect(revision).toMatch(/^[a-f0-9]{64}$/);
  if (!revision) throw new Error("Expected a production readiness revision.");
  return revision;
}

function trackedInventory(id: number) {
  return {
    inventory: {
      id,
      stockMode: "monitored",
    },
  };
}

describe("evaluateProductionReadinessGate", () => {
	it("does not enforce inventory readiness for assignment or submission", () => {
    expect(
      shouldEnforceProductionReadinessGate({
        createAssignments: {},
      }),
    ).toBe(false);
    expect(
      shouldEnforceProductionReadinessGate({
        submitAll: {},
      }),
		).toBe(false);
  });

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
            ...trackedInventory(100),
            stockAllocations: [{ qty: 2, status: "reserved" }],
          },
          {
            id: 11,
            required: true,
            qty: 1,
            ...trackedInventory(101),
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
            ...trackedInventory(100),
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
            ...trackedInventory(100),
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

  it("allows assignment through an active override for the exact inventory revision", () => {
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
            ...trackedInventory(100),
            inboundDemands: [{ qty: 1, qtyReceived: 0, status: "ordered" }],
          },
        ],
      },
    ]);
    const revision = requireRevision(buildProductionReadinessRevision(plan));

    const result = evaluateProductionReadinessGateWithOverride(plan, {
      status: "ACTIVE",
      revision,
    });

    expect(result).toMatchObject({
      allowed: true,
      overridden: true,
      overrideRevision: revision,
    });
  });

  it("matches an order-wide override while evaluating one selected line", () => {
    const fullOrderPlan = buildSalesProductionPlan([
      {
        id: 1,
        uid: "line-1",
        qty: 1,
        components: [
          {
            id: 10,
            required: true,
            qty: 1,
            ...trackedInventory(100),
            inboundDemands: [{ qty: 1, qtyReceived: 0, status: "ordered" }],
          },
        ],
      },
      {
        id: 2,
        uid: "line-2",
        qty: 1,
        components: [
          {
            id: 20,
            required: true,
            qty: 1,
            ...trackedInventory(200),
            inboundDemands: [{ qty: 1, qtyReceived: 0, status: "ordered" }],
          },
        ],
      },
    ]);
    const selectedLinePlan = buildSalesProductionPlan([
      {
        id: 1,
        uid: "line-1",
        qty: 1,
        components: [
          {
            id: 10,
            required: true,
            qty: 1,
            ...trackedInventory(100),
            inboundDemands: [{ qty: 1, qtyReceived: 0, status: "ordered" }],
          },
        ],
      },
    ]);
    const revision = requireRevision(
      buildProductionReadinessRevision(fullOrderPlan),
    );

    const result = evaluateProductionReadinessGateWithOverride(
      selectedLinePlan,
      {
        status: "ACTIVE",
        revision,
      },
      fullOrderPlan,
    );

    expect(result).toMatchObject({
      allowed: true,
      overridden: true,
      overrideRevision: revision,
    });
  });

  it("rejects a stale override after inventory evidence changes", () => {
    const original = buildSalesProductionPlan([
      {
        id: 1,
        uid: "line-1",
        qty: 1,
        components: [
          {
            id: 10,
            required: true,
            qty: 1,
            ...trackedInventory(100),
            inboundDemands: [{ qty: 1, qtyReceived: 0, status: "ordered" }],
          },
        ],
      },
    ]);
    const changed = buildSalesProductionPlan([
      {
        id: 1,
        uid: "line-1",
        qty: 1,
        components: [
          {
            id: 10,
            required: true,
            qty: 1,
            ...trackedInventory(100),
            inboundDemands: [{ qty: 1, qtyReceived: 0.5, status: "ordered" }],
          },
        ],
      },
    ]);

    const originalRevision = requireRevision(
      buildProductionReadinessRevision(original),
    );
    const result = evaluateProductionReadinessGateWithOverride(changed, {
      status: "ACTIVE",
      revision: originalRevision,
    });

    expect(result.allowed).toBe(false);
    expect(result.overridden).toBe(false);
  });

  it("does not truncate complete-order readiness evidence at 100 components", () => {
    const components = Array.from({ length: 101 }, (_, index) => ({
      id: index + 1,
      required: true,
      qty: 1,
      ...trackedInventory(index + 1000),
      inboundDemands: [
        {
          id: index + 1,
          qty: 1,
          qtyReceived: 0,
          status: "ordered",
        },
      ],
    }));
    const defaultPlan = buildSalesProductionPlan([
      { id: 1, uid: "line-1", qty: 1, components },
    ]);
    const completePlan = buildSalesProductionPlan(
      [{ id: 1, uid: "line-1", qty: 1, components }],
      { completeOrder: true },
    );

    expect(defaultPlan.components).toHaveLength(100);
    expect(completePlan.components).toHaveLength(101);
    expect(evaluateProductionReadinessGate(completePlan).blockers).toHaveLength(
      101,
    );
  });
});

import { describe, expect, it } from "bun:test";
import {
  buildInventoryProductionProjection,
  mergeMetaWithProduction,
} from "./inventory-production-lifecycle";

const fixedNow = new Date("2026-06-15T12:00:00.000Z");

describe("buildInventoryProductionProjection", () => {
  it("marks a line assigned when production is assigned but not submitted", () => {
    const projection = buildInventoryProductionProjection(
      {
        uid: "line-1",
        salesItemId: 10,
        qty: 4,
      },
      [
        {
          itemId: 10,
          salesItemControlUid: "line-1",
          qtyAssigned: 4,
          submissions: [],
        },
      ],
      fixedNow,
    );

    expect(projection).toEqual({
      orderedQty: 4,
      assignedQty: 4,
      fulfilledQty: 0,
      remainingQty: 4,
      status: "assigned",
      updatedAt: fixedNow.toISOString(),
    });
  });

  it("keeps partial production completion open", () => {
    const projection = buildInventoryProductionProjection(
      {
        uid: "line-1",
        salesItemId: 10,
        qty: 4,
      },
      [
        {
          itemId: 10,
          salesItemControlUid: "line-1",
          qtyAssigned: 4,
          submissions: [{ qty: 2 }],
        },
      ],
      fixedNow,
    );

    expect(projection.status).toBe("partially_fulfilled");
    expect(projection.fulfilledQty).toBe(2);
    expect(projection.remainingQty).toBe(2);
  });

  it("marks production fulfilled when submitted quantity reaches ordered quantity", () => {
    const projection = buildInventoryProductionProjection(
      {
        uid: "line-1",
        salesItemId: 10,
        qty: 4,
      },
      [
        {
          itemId: 10,
          salesItemControlUid: "line-1",
          qtyAssigned: 4,
          submissions: [{ qty: 1 }, { lhQty: 1, rhQty: 2 }],
        },
      ],
      fixedNow,
    );

    expect(projection.status).toBe("fulfilled");
    expect(projection.fulfilledQty).toBe(4);
    expect(projection.remainingQty).toBe(0);
  });

  it("matches by control uid when sales item id is unavailable", () => {
    const projection = buildInventoryProductionProjection(
      {
        uid: "control-uid-1",
        salesItemId: null,
        qty: 1,
      },
      [
        {
          itemId: null,
          salesItemControlUid: "control-uid-1",
          qtyAssigned: 1,
          submissions: [{ qty: 1 }],
        },
      ],
      fixedNow,
    );

    expect(projection.status).toBe("fulfilled");
    expect(projection.assignedQty).toBe(1);
  });

  it("preserves Dyke produceable metadata when refreshing production lifecycle", () => {
    const meta = mergeMetaWithProduction(
      {
        production: {
          produceable: false,
          source: "dyke",
        },
        inventorySync: {
          productionProduceable: false,
        },
      },
      {
        orderedQty: 4,
        assignedQty: 4,
        fulfilledQty: 2,
        remainingQty: 2,
        status: "partially_fulfilled",
        updatedAt: fixedNow.toISOString(),
      },
    );

    expect(meta).toEqual({
      production: {
        produceable: false,
        source: "dyke",
        orderedQty: 4,
        assignedQty: 4,
        fulfilledQty: 2,
        remainingQty: 2,
        status: "partially_fulfilled",
        updatedAt: fixedNow.toISOString(),
      },
      inventorySync: {
        productionProduceable: false,
      },
    });
  });
});

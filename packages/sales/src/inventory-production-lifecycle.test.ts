import { beforeEach, describe, expect, it, mock } from "bun:test";

const syncSalesInventoryLineItemsMock = mock(async () => ({
  lineItems: 0,
}));

mock.module("./sync-sales-inventory-line-items", () => ({
  syncSalesInventoryLineItems: syncSalesInventoryLineItemsMock,
}));

const {
  buildInventoryProductionProjection,
  mergeMetaWithProduction,
  syncInventoryProductionLifecycleForSale,
} = await import("./inventory-production-lifecycle");

const fixedNow = new Date("2026-06-15T12:00:00.000Z");

describe("buildInventoryProductionProjection", () => {
  beforeEach(() => {
    syncSalesInventoryLineItemsMock.mockClear();
  });

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

describe("syncInventoryProductionLifecycleForSale", () => {
  beforeEach(() => {
    syncSalesInventoryLineItemsMock.mockClear();
  });

  it("counts only line items confirmed active by the production projection write", async () => {
    const updatePayloads: unknown[] = [];
    const db = {
      lineItem: {
        findMany: async () => [
          {
            id: 10,
            uid: "line-10",
            salesItemId: 100,
            qty: 4,
            meta: {},
          },
          {
            id: 11,
            uid: "line-11",
            salesItemId: 101,
            qty: 2,
            meta: {},
          },
        ],
        updateMany: async (payload: unknown) => {
          updatePayloads.push(payload);
          return { count: updatePayloads.length === 1 ? 1 : 0 };
        },
      },
      orderItemProductionAssignments: {
        findMany: async () => [
          {
            itemId: 100,
            salesItemControlUid: "line-10",
            qtyAssigned: 4,
            lhQty: 0,
            rhQty: 0,
            submissions: [{ qty: 4 }],
          },
          {
            itemId: 101,
            salesItemControlUid: "line-11",
            qtyAssigned: 2,
            lhQty: 0,
            rhQty: 0,
            submissions: [{ qty: 1 }],
          },
        ],
      },
    };

    const result = await syncInventoryProductionLifecycleForSale(db as any, 9001);

    expect(syncSalesInventoryLineItemsMock).toHaveBeenCalledWith(db, {
      salesOrderId: 9001,
      source: "repair",
    });
    expect(result).toEqual({
      lineItems: 2,
      updated: 1,
    });
    expect(updatePayloads[0]).toMatchObject({
      where: {
        id: 10,
        deletedAt: null,
      },
      data: {
        meta: {
          production: {
            orderedQty: 4,
            assignedQty: 4,
            fulfilledQty: 4,
            remainingQty: 0,
            status: "fulfilled",
          },
        },
      },
    });
    expect(updatePayloads[1]).toMatchObject({
      where: {
        id: 11,
        deletedAt: null,
      },
      data: {
        meta: {
          production: {
            orderedQty: 2,
            assignedQty: 2,
            fulfilledQty: 1,
            remainingQty: 1,
            status: "partially_fulfilled",
          },
        },
      },
    });
  });
});

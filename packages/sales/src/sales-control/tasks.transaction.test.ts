import { beforeEach, describe, expect, it, mock } from "bun:test";

const submitNonProductionsActionMock = mock(async () => ({}));
const submitAssignmentsActionMock = mock(async () => ({}));
const packDispatchItemsActionMock = mock(async () => ({ created: 1, skipped: 0 }));
const resetSalesActionMock = mock(async () => ({}));
const createSalesAssignmentActionMock = mock(async () => ({}));
const getSaleInformationMock = mock(async () => ({
  order: { id: 9001 },
  items: [],
}));

mock.module("./actions", () => ({
  submitNonProductionsAction: submitNonProductionsActionMock,
  submitAssignmentsAction: submitAssignmentsActionMock,
  packDispatchItemsAction: packDispatchItemsActionMock,
  resetSalesAction: resetSalesActionMock,
  createSalesAssignmentAction: createSalesAssignmentActionMock,
}));

mock.module("./get-sale-information", () => ({
  getSaleInformation: getSaleInformationMock,
}));

const tasksModule = await import("./tasks");

describe("sales-control task transactions", () => {
  beforeEach(() => {
    submitNonProductionsActionMock.mockClear();
    submitAssignmentsActionMock.mockClear();
    packDispatchItemsActionMock.mockClear();
    resetSalesActionMock.mockClear();
    createSalesAssignmentActionMock.mockClear();
    getSaleInformationMock.mockClear();
  });

  it("clearPackingTask updates and resets within the same transaction", async () => {
    const tx = {
      orderItemDelivery: {
        updateMany: mock(async () => ({})),
      },
    };
    const db = {
      $transaction: async (fn: any) => fn(tx),
    };

    await tasksModule.clearPackingTask(db as any, {
      meta: { salesId: 321, authorName: "Tester" },
      clearPackings: { dispatchId: 44 },
    } as any);

    expect(tx.orderItemDelivery.updateMany).toHaveBeenCalledTimes(1);
    expect(resetSalesActionMock).toHaveBeenCalledTimes(1);
    expect(resetSalesActionMock).toHaveBeenCalledWith(tx, 321);
  });

  it("cancelDispatchTask transitions dispatch and resets within same transaction", async () => {
    const tx = {
      orderDelivery: {
        update: mock(async () => ({})),
      },
    };
    const db = {
      $transaction: async (fn: any) => fn(tx),
    };

    await tasksModule.cancelDispatchTask(db as any, {
      meta: { salesId: 777 },
      cancelDispatch: { dispatchId: 55 },
    } as any);

    expect(tx.orderDelivery.update).toHaveBeenCalledTimes(1);
    expect(tx.orderDelivery.update).toHaveBeenCalledWith({
      where: { id: 55 },
      data: { status: "cancelled" },
    });
    expect(resetSalesActionMock).toHaveBeenCalledTimes(1);
    expect(resetSalesActionMock).toHaveBeenCalledWith(tx, 777);
  });

  it("packDispatchItemTask packs and resets within same transaction client", async () => {
    const tx = {
      orderDelivery: {
        update: mock(async () => ({})),
      },
    };
    const db = {
      $transaction: async (fn: any) => fn(tx),
    };

    const response = await tasksModule.packDispatchItemTask(db as any, {
      meta: { salesId: 909, authorId: 12, authorName: "Operator" },
      packItems: {
        dispatchId: 90,
        dispatchStatus: "queue",
        packMode: "selection",
        packingLines: [{ salesItemId: 1, submissionId: 2, qty: { qty: 1 } }],
      },
    } as any);

    expect(getSaleInformationMock).toHaveBeenCalledTimes(1);
    expect(packDispatchItemsActionMock).toHaveBeenCalledTimes(1);
    expect(packDispatchItemsActionMock.mock.calls[0]?.[0]).toBe(tx);
    expect(tx.orderDelivery.update).toHaveBeenCalledTimes(1);
    expect(resetSalesActionMock).toHaveBeenCalledTimes(1);
    expect(resetSalesActionMock).toHaveBeenCalledWith(tx, 909);
    expect(response).toEqual({ created: 1, skipped: 0 });
  });

  it("packDispatchItemTask can replace existing dispatch packings atomically", async () => {
    const tx = {
      orderItemDelivery: {
        updateMany: mock(async () => ({})),
      },
      orderDelivery: {
        update: mock(async () => ({})),
      },
    };
    const db = {
      $transaction: async (fn: any) => fn(tx),
    };

    await tasksModule.packDispatchItemTask(db as any, {
      meta: { salesId: 901, authorId: 17, authorName: "Operator" },
      packItems: {
        dispatchId: 91,
        dispatchStatus: "queue",
        packMode: "selection",
        replaceExisting: true,
        packingLines: [{ salesItemId: 1, submissionId: 2, qty: { qty: 1 } }],
      },
    } as any);

    expect(tx.orderItemDelivery.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.orderItemDelivery.updateMany).toHaveBeenCalledWith({
      where: {
        orderDeliveryId: 91,
        packingStatus: {
          not: "unpacked",
        },
      },
      data: {
        packingStatus: "unpacked",
        unpackedBy: "Operator",
      },
    });
    expect(packDispatchItemsActionMock).toHaveBeenCalledTimes(1);
    expect(tx.orderDelivery.update).toHaveBeenCalledTimes(1);
  });

  it("does not reset when transactional mutation fails", async () => {
    const tx = {
      orderItemDelivery: {
        updateMany: mock(async () => {
          throw new Error("update failed");
        }),
      },
    };
    const db = {
      $transaction: async (fn: any) => fn(tx),
    };

    await expect(
      tasksModule.clearPackingTask(db as any, {
        meta: { salesId: 99, authorName: "Tester" },
        clearPackings: { dispatchId: 88 },
      } as any),
    ).rejects.toThrow("update failed");
    expect(resetSalesActionMock).toHaveBeenCalledTimes(0);
  });
});

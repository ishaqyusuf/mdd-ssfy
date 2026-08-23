import { describe, expect, it } from "bun:test";
import { packDispatchItemsAction } from "./actions";

function createDbStub(
  existingPacked: any[] = [],
  eligibleSubmissions?: any[],
  approvedReport?: any,
) {
  const createdRows: any[] = [];

  return {
    db: {
      orderItemDelivery: {
        findMany: async () => existingPacked,
        createMany: async ({ data }: { data: any[] }) => {
          createdRows.push(...data);
          return { count: data.length };
        },
      },
      orderProductionSubmissions: {
        findMany: async ({ where }: any) =>
          eligibleSubmissions || where.id.in.map((id: number) => ({ id })),
      },
      salesPackingReport: {
        findFirst: async () => approvedReport || null,
      },
    },
    createdRows,
  };
}

describe("packDispatchItemsAction", () => {
  it("packs from canonical packingLines payload", async () => {
    const { db, createdRows } = createDbStub();

    const response = await packDispatchItemsAction(db as any, {
      data: { order: { id: 101 } } as any,
      authorId: 1,
      authorName: "Tester",
      update: false,
      packItems: {
        dispatchId: 5001,
        dispatchStatus: "queue" as any,
        packingLines: [
          { salesItemId: 11, submissionId: 1001, qty: { qty: 2 } as any },
          { salesItemId: 12, submissionId: 1002, qty: { qty: 1 } as any },
        ],
      } as any,
    });

    expect(response).toEqual({ created: 2, skipped: 0 });
    expect(createdRows.length).toBe(2);
    expect(createdRows[0].orderItemId).toBe(11);
    expect(createdRows[0].orderProductionSubmissionId).toBe(1001);
    expect(createdRows[0].qty).toBe(2);
    expect(createdRows[1].orderItemId).toBe(12);
    expect(createdRows[1].orderProductionSubmissionId).toBe(1002);
    expect(createdRows[1].qty).toBe(1);
  });

  it("supports legacy packingList payload as fallback", async () => {
    const { db, createdRows } = createDbStub();

    const response = await packDispatchItemsAction(db as any, {
      data: { order: { id: 102 } } as any,
      authorId: 1,
      authorName: "Tester",
      update: false,
      packItems: {
        dispatchId: 5002,
        dispatchStatus: "queue" as any,
        packingList: [
          {
            salesItemId: 21,
            note: "legacy",
            submissions: [
              { submissionId: 2001, qty: { qty: 3 } as any },
              { submissionId: 2002, qty: { qty: 1 } as any },
            ],
          },
        ],
      } as any,
    });

    expect(response).toEqual({ created: 2, skipped: 0 });
    expect(createdRows.length).toBe(2);
    expect(createdRows[0].note).toBe("legacy");
    expect(createdRows[0].orderProductionSubmissionId).toBe(2001);
    expect(createdRows[1].orderProductionSubmissionId).toBe(2002);
  });

  it("is idempotent for already packed submissions", async () => {
    const { db, createdRows } = createDbStub([
      {
        orderProductionSubmissionId: 3001,
        qty: 2,
        lhQty: 0,
        rhQty: 0,
      },
    ]);

    const response = await packDispatchItemsAction(db as any, {
      data: { order: { id: 103 } } as any,
      authorId: 1,
      authorName: "Tester",
      update: false,
      packItems: {
        dispatchId: 5003,
        dispatchStatus: "queue" as any,
        packingLines: [
          { salesItemId: 31, submissionId: 3001, qty: { qty: 2 } as any },
        ],
      } as any,
    });

    expect(response).toEqual({ created: 0, skipped: 1 });
    expect(createdRows.length).toBe(0);
  });

  it("does not over-pack duplicate submission lines in a single request", async () => {
    const { db, createdRows } = createDbStub();

    const response = await packDispatchItemsAction(db as any, {
      data: { order: { id: 104 } } as any,
      authorId: 1,
      authorName: "Tester",
      update: false,
      packItems: {
        dispatchId: 5004,
        dispatchStatus: "queue" as any,
        packingLines: [
          { salesItemId: 41, submissionId: 4001, qty: { qty: 2 } as any },
          { salesItemId: 41, submissionId: 4001, qty: { qty: 2 } as any },
        ],
      } as any,
    });

    expect(response).toEqual({ created: 1, skipped: 1 });
    expect(createdRows.length).toBe(1);
    expect(createdRows[0].orderProductionSubmissionId).toBe(4001);
    expect(createdRows[0].qty).toBe(2);
  });

  it("refuses to pack a submission that is awaiting material review", async () => {
    const { db } = createDbStub([], []);

    await expect(
      packDispatchItemsAction(db as any, {
        data: { order: { id: 105 } } as any,
        authorId: 1,
        authorName: "Tester",
        update: false,
        packItems: {
          dispatchId: 5005,
          dispatchStatus: "queue" as any,
          packingLines: [
            { salesItemId: 51, submissionId: 5001, qty: { qty: 1 } as any },
          ],
        } as any,
      }),
    ).rejects.toThrow("awaiting material review");
  });

  it("allows only the exact quantity authorized by an approved packing report", async () => {
    const { db, createdRows } = createDbStub([], [{ id: 6001 }], {
      salesOrderItemId: 61,
      orderProductionSubmissionId: 6001,
      qty: 2,
      lhQty: 0,
      rhQty: 0,
    });
    const result = await packDispatchItemsAction(db as any, {
      data: { order: { id: 106 } } as any,
      authorId: 9,
      authorName: "Reviewer",
      approvedPackingReportId: 81,
      update: false,
      packItems: {
        dispatchId: 5006,
        dispatchStatus: "queue" as any,
        packingLines: [
          { salesItemId: 61, submissionId: 6001, qty: { qty: 2 } as any },
        ],
      } as any,
    });
    expect(result).toEqual({ created: 1, skipped: 0 });
    expect(createdRows[0].orderProductionSubmissionId).toBe(6001);
  });

  it("authorizes an exact handled LH/RH report through the canonical pack action", async () => {
    const { db, createdRows } = createDbStub([], [{ id: 6101 }], {
      salesOrderItemId: 62,
      orderProductionSubmissionId: 6101,
      qty: 0,
      lhQty: 1,
      rhQty: 2,
    });
    const result = await packDispatchItemsAction(db as any, {
      data: { order: { id: 106 } } as any,
      authorId: 9,
      authorName: "Reviewer",
      approvedPackingReportId: 84,
      update: false,
      packItems: {
        dispatchId: 5006,
        dispatchStatus: "queue" as any,
        packingLines: [
          {
            salesItemId: 62,
            submissionId: 6101,
            qty: { qty: 0, lh: 1, rh: 2 } as any,
          },
        ],
      } as any,
    });

    expect(result).toEqual({ created: 1, skipped: 0 });
    expect(createdRows[0]).toMatchObject({
      orderProductionSubmissionId: 6101,
      qty: 3,
      lhQty: 1,
      rhQty: 2,
    });
  });

  it("rejects an approved packing report reused for another quantity", async () => {
    const { db } = createDbStub([], [{ id: 7001 }], {
      salesOrderItemId: 71,
      orderProductionSubmissionId: 7001,
      qty: 1,
      lhQty: 0,
      rhQty: 0,
    });
    await expect(
      packDispatchItemsAction(db as any, {
        data: { order: { id: 107 } } as any,
        authorId: 9,
        authorName: "Reviewer",
        approvedPackingReportId: 82,
        update: false,
        packItems: {
          dispatchId: 5007,
          dispatchStatus: "queue" as any,
          packingLines: [
            { salesItemId: 71, submissionId: 7001, qty: { qty: 2 } as any },
          ],
        } as any,
      }),
    ).rejects.toThrow("does not authorize");
  });

  it("adds an approved report to existing canonical packed quantity", async () => {
    const { db, createdRows } = createDbStub(
      [{ orderProductionSubmissionId: 8001, qty: 1, lhQty: 0, rhQty: 0 }],
      [{ id: 8001 }],
      {
        salesOrderItemId: 81,
        orderProductionSubmissionId: 8001,
        qty: 2,
        lhQty: 0,
        rhQty: 0,
      },
    );
    const result = await packDispatchItemsAction(db as any, {
      data: { order: { id: 108 } } as any,
      authorId: 9,
      authorName: "Reviewer",
      approvedPackingReportId: 83,
      update: false,
      packItems: {
        dispatchId: 5008,
        dispatchStatus: "queue" as any,
        packingLines: [
          { salesItemId: 81, submissionId: 8001, qty: { qty: 3 } as any },
        ],
      } as any,
    });
    expect(result).toEqual({ created: 1, skipped: 0 });
    expect(createdRows[0].qty).toBe(2);
  });
});

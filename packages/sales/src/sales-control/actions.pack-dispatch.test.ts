import { describe, expect, it } from "bun:test";
import { packDispatchItemsAction } from "./actions";

function createDbStub(existingPacked: any[] = []) {
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
});

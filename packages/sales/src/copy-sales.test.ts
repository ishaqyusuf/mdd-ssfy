import { describe, expect, it, mock } from "bun:test";
import { tasks } from "@trigger.dev/sdk/v3";
import {
  type CopySalesInTransactionProps,
  copySales,
  copySalesInTransaction,
} from "./copy-sales";

function createTransactionLikeDb(
  sourceOverrides: Record<string, unknown> = {},
  existingTarget: Record<string, unknown> | null = null,
) {
  const calls = {
    createdSales: [] as Record<string, unknown>[],
    createdItems: [] as Record<string, unknown>[],
    findFirstArgs: null as Record<string, unknown> | null,
    existingTargetReads: 0,
  };

  const sourceSale = {
    id: 100,
    orderId: "00010PC",
    type: "quote",
    meta: { source: "quote" },
    shippingAddressId: 10,
    billingAddressId: 11,
    customerId: 12,
    customerProfileId: 13,
    salesRepId: 7,
    salesRep: { id: 7, name: "Pablo Cruz" },
    grandTotal: 425,
    amountDue: 425,
    deliveryOption: "pickup",
    title: "Front door quote",
    tax: 25,
    subTotal: 400,
    isDyke: true,
    taxPercentage: 6.25,
    extraCosts: [
      {
        amount: 10,
        label: "Delivery",
        percentage: null,
        tax: 0,
        taxxable: false,
        totalAmount: 10,
        type: "Delivery",
      },
    ],
    taxes: [
      {
        taxCode: "TX",
        taxxable: 400,
        tax: 25,
      },
    ],
    items: [
      {
        description: "Door slab",
        discount: null,
        discountPercentage: null,
        dykeDescription: null,
        dykeProduction: true,
        multiDyke: false,
        multiDykeUid: null,
        qty: 1,
        rate: 400,
        formSteps: [],
        housePackageTool: null,
        meta: { line: "door" },
        price: 400,
        swing: "LH",
        salesDoors: [],
        total: 400,
        taxPercenatage: 6.25,
        tax: 25,
      },
    ],
    ...sourceOverrides,
  };

  const db = {
    $queryRaw: async () => [],
    salesOrders: {
      findFirst: async () => {
        calls.existingTargetReads += 1;
        return existingTarget;
      },
      findFirstOrThrow: async (args: Record<string, unknown>) => {
        calls.findFirstArgs = args;
        return sourceSale;
      },
      count: async (args: { where?: { orderId?: string } }) =>
        args.where?.orderId ? 0 : 12,
      findMany: async () => [],
      create: async ({ data }: { data: Record<string, unknown> }) => {
        calls.createdSales.push(data);
        return {
          id: 900,
          slug: data.slug,
          isDyke: data.isDyke,
        };
      },
    },
    salesOrderItems: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        calls.createdItems.push(data);
        return {
          id: 901,
          ...data,
        };
      },
    },
  };

  return { db, calls };
}

describe("copySalesInTransaction", () => {
  it("copies a quote to an order without requiring a nested transaction", async () => {
    const { db, calls } = createTransactionLikeDb();

    expect("$transaction" in db).toBe(false);

    const result = await copySalesInTransaction({
      db: db as unknown as CopySalesInTransactionProps["db"],
      salesUid: "00010PC",
      as: "order",
      type: "quote",
      author: {
        id: 7,
        name: "Pablo Cruz",
      },
    });

    expect(result).toEqual({
      id: 900,
      slug: "00012PC",
      isDyke: true,
    });
    expect(calls.findFirstArgs).toMatchObject({
      where: {
        orderId: "00010PC",
        type: "quote",
      },
    });
    expect(calls.createdSales).toHaveLength(1);
    expect(calls.createdSales[0]).toMatchObject({
      orderId: "00012PC",
      slug: "00012PC",
      type: "order",
      amountDue: 425,
      grandTotal: 425,
      meta: {
        copySource: {
          salesOrderId: 100,
          type: "quote",
          kind: "quote-to-invoice",
        },
      },
    });
    expect(calls.findFirstArgs).toMatchObject({
      select: expect.any(Object),
    });
    expect(calls.existingTargetReads).toBe(1);
    expect(calls.createdItems).toHaveLength(1);
    expect(calls.createdItems[0]).toMatchObject({
      description: "Door slab",
      salesOrderId: 900,
      total: 400,
    });
  });

  it("does not copy adjustment authority or persisted row identities into an editable duplicate", async () => {
    const { db, calls } = createTransactionLikeDb({
      type: "order",
      meta: {
        source: "order",
        newSalesForm: {
          version: "source-version",
          updatedAt: "2026-08-25T20:24:13.908Z",
          draftKey: "source-draft",
          approvedAdjustmentId: "source-adjustment",
          salesId: 100,
          slug: "00010PC",
          type: "order",
          reason: "Approved adjustment",
          autosave: true,
          form: { paymentMethod: "Credit Card" },
          meta: { notes: "Keep these form defaults" },
          summary: { grandTotal: 425 },
          lineItems: [
            {
              id: 501,
              uid: "moulding-group",
              meta: {
                mouldingRows: [{ salesItemId: 501, hptId: 601, qty: 2 }],
              },
            },
          ],
        },
      },
    });

    await copySalesInTransaction({
      db: db as unknown as CopySalesInTransactionProps["db"],
      salesUid: "00010PC",
      as: "order",
      type: "order",
      author: { id: 7, name: "Pablo Cruz" },
    });

    expect(calls.createdSales[0]?.meta).toEqual({
      source: "order",
      newSalesForm: {
        autosave: false,
        form: { paymentMethod: "Credit Card" },
        meta: { notes: "Keep these form defaults" },
      },
    });
  });

  it("uses the author when a legacy source sale has no rep for a history snapshot", async () => {
    const { db, calls } = createTransactionLikeDb({
      salesRepId: null,
      salesRep: null,
      type: "order",
    });

    const result = await copySalesInTransaction({
      db: db as unknown as CopySalesInTransactionProps["db"],
      salesUid: "00010PC",
      as: "order-hx",
      type: "order",
      author: {
        id: 7,
        name: "Pablo Cruz",
      },
    });

    expect(result.slug).toBe("00010PC-hx01");
    expect(calls.createdSales[0]).toMatchObject({
      orderId: "00010PC-hx01",
      salesRep: { connect: { id: 7 } },
    });
  });

  it("returns the existing invoice when quote conversion is retried", async () => {
    const { db, calls } = createTransactionLikeDb(
      {},
      {
        id: 777,
        slug: "00077PC",
        isDyke: true,
      },
    );

    const result = await copySalesInTransaction({
      db: db as unknown as CopySalesInTransactionProps["db"],
      salesUid: "00010PC",
      as: "order",
      type: "quote",
      author: { id: 7, name: "Pablo Cruz" },
    });

    expect(result).toEqual({ id: 777, slug: "00077PC", isDyke: true });
    expect(calls.createdSales).toHaveLength(0);
  });

  it("allocates distinct history slugs when two snapshots start concurrently", async () => {
    const historyKeys = new Set<string>();
    let historyReadCalls = 0;
    let releaseInitialReads: (() => void) | undefined;
    const initialReadsReady = new Promise<void>((resolve) => {
      releaseInitialReads = resolve;
    });
    let nextId = 900;
    const sourceSale = {
      id: 100,
      orderId: "00010PC",
      type: "order",
      meta: null,
      shippingAddressId: null,
      billingAddressId: null,
      customerId: null,
      customerProfileId: null,
      salesRepId: 7,
      salesRep: { id: 7, name: "Pablo Cruz" },
      grandTotal: 425,
      deliveryOption: "pickup",
      title: "Front door order",
      tax: 25,
      subTotal: 400,
      isDyke: true,
      taxPercentage: 6.25,
      extraCosts: [],
      taxes: [],
      items: [],
    };
    const db = {
      salesOrders: {
        findFirstOrThrow: async () => sourceSale,
        findMany: async () => {
          const snapshot = Array.from(historyKeys, (key) => ({
            orderId: key.slice(0, key.lastIndexOf(":")),
          }));
          historyReadCalls += 1;
          if (historyReadCalls === 2) releaseInitialReads?.();
          await initialReadsReady;
          return snapshot;
        },
        create: async ({ data }: { data: Record<string, unknown> }) => {
          const key = `${data.orderId}:${data.type}`;
          if (historyKeys.has(key)) {
            throw Object.assign(
              new Error(
                "Unique constraint failed on the fields: (`orderId`,`type`)",
              ),
              {
                code: "P2002",
                meta: { target: ["orderId", "type"] },
              },
            );
          }
          historyKeys.add(key);
          nextId += 1;
          return {
            id: nextId,
            slug: data.slug,
            isDyke: data.isDyke,
          };
        },
      },
      salesOrderItems: {
        create: async () => ({ id: 1 }),
      },
    };
    const props = {
      db: db as unknown as CopySalesInTransactionProps["db"],
      salesUid: "00010PC",
      as: "order-hx" as const,
      type: "order" as const,
      author: { id: 7, name: "Pablo Cruz" },
    };

    const results = await Promise.all([
      copySalesInTransaction(props),
      copySalesInTransaction(props),
    ]);

    expect(results.map((result) => result.slug).sort()).toEqual([
      "00010PC-hx01",
      "00010PC-hx02",
    ]);
  });
});

describe("copySales post-commit work", () => {
  it("can defer inventory sync dispatch without delaying the copy response", async () => {
    const { db: transactionDb } = createTransactionLikeDb(
      {},
      { id: 777, slug: "00077PC", isDyke: true },
    );
    const trigger = mock(async () => ({ id: "inventory-sync-run" }));
    (tasks as { trigger: typeof tasks.trigger }).trigger = trigger;
    let deferred: Promise<unknown> | undefined;
    const deferPostCommit = mock((promise: Promise<unknown>) => {
      deferred = promise;
    });
    const db = {
      $transaction: async (
        callback: (tx: CopySalesInTransactionProps["db"]) => Promise<unknown>,
      ) => callback(transactionDb as CopySalesInTransactionProps["db"]),
    };

    const result = await copySales({
      db: db as never,
      salesUid: "00010PC",
      as: "order",
      type: "quote",
      author: { id: 7, name: "Pablo Cruz" },
      deferPostCommit,
    });

    expect(result).toEqual({ id: 777, slug: "00077PC", isDyke: true });
    expect(deferPostCommit).toHaveBeenCalledTimes(1);
    expect(deferred).toBeInstanceOf(Promise);
    await deferred;
    expect(trigger).toHaveBeenCalledTimes(1);
  });
});

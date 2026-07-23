import { describe, expect, it } from "bun:test";
import type { DealerPortalSaveQuoteSchema } from "@api/schemas/dealer";
import type { TRPCContext } from "@api/trpc/init";
import { saveDealerPortalQuote } from "./dealer-portal-sales-form";

type Row = Record<string, unknown>;
type Selection = Record<string, unknown>;
type QueryArgs = {
  where?: Row;
  select?: Selection;
};
type WriteArgs = QueryArgs & {
  data: Row;
};
type CreateManyArgs = {
  data: SalesOrderItemRow[];
};
type DealerOrderRow = Row & {
  id: number;
  orderId: string;
  slug: string;
  type: string;
  dealerAuthId: number | null;
  deletedAt: Date | null;
};
type SalesOrderItemRow = Row & {
  salesOrderId: number;
};

function pickSelected(row: Row | null, select?: Selection) {
  if (!row || !select) return row;
  return Object.fromEntries(
    Object.keys(select)
      .filter((key) => select[key])
      .map((key) => [key, row[key]]),
  );
}

function dealerQuoteInput(
  overrides: Record<string, unknown> = {},
): DealerPortalSaveQuoteSchema {
  return {
    customerId: 20,
    customerProfileId: 30,
    taxRate: 0,
    lineItems: [
      {
        uid: "line-1",
        title: "Door",
        description: "",
        qty: 1,
        unitPrice: 100,
        lineTotal: 100,
        meta: {},
        formSteps: [],
        shelfItems: [],
        housePackageTool: null,
      },
    ],
    ...overrides,
  } as DealerPortalSaveQuoteSchema;
}

function createDealerPortalSalesFormContext(
  options: {
    existingQuote?: {
      id: number;
      orderId: string;
      slug: string;
      requestStatus?: "pending" | "approved" | "rejected" | null;
    } | null;
    dppDocuments?: Array<{ orderId: string; deletedAt?: Date | null }>;
    collidingOrderIds?: string[];
    customerTypeId?: number | null;
    customerTaxCode?: string | null;
    dealerMeta?: Record<string, unknown> | null;
  } = {},
) {
  const state = {
    orders: [] as DealerOrderRow[],
    items: [] as SalesOrderItemRow[],
    dealerSales: [] as Row[],
    nextOrderId: 1,
    createdOrderData: null as Row | null,
    updatedOrderData: null as Row | null,
    sequenceCountWhere: null as Row | null,
  };
  const collidingOrderIds = new Set(options.collidingOrderIds || []);

  for (const [index, document] of (options.dppDocuments || []).entries()) {
    state.orders.push({
      id: 100 + index,
      orderId: document.orderId,
      slug: `quote-${document.orderId.toLowerCase()}`,
      type: "quote",
      dealerAuthId: 10,
      deletedAt: document.deletedAt ?? null,
    });
  }

  if (options.existingQuote) {
    state.orders.push({
      ...options.existingQuote,
      requests: options.existingQuote.requestStatus
        ? [{ status: options.existingQuote.requestStatus }]
        : [],
      type: "quote",
      dealerAuthId: 10,
      deletedAt: null,
    });
    state.nextOrderId = Math.max(
      state.nextOrderId,
      options.existingQuote.id + 1,
    );
  }

  const customers = [
    {
      id: 20,
      dealerOwnerId: 10,
      customerTypeId:
        options.customerTypeId === undefined ? 30 : options.customerTypeId,
      taxProfiles: options.customerTaxCode
        ? [
            {
              taxCode: options.customerTaxCode,
              tax: {
                taxCode: options.customerTaxCode,
                percentage: options.customerTaxCode === "TX" ? 8 : 6,
              },
            },
          ]
        : [],
      deletedAt: null,
    },
  ];
  const customerTypes = [
    {
      id: 30,
      dealerOwnerId: 10,
      deletedAt: null,
      title: "Dealer Standard",
      coefficient: 1.1,
      salesPercentage: 20,
    },
    {
      id: 40,
      dealerOwnerId: 10,
      deletedAt: null,
      defaultProfile: true,
      title: "Dealer Default",
      coefficient: 1.1,
      salesPercentage: 25,
    },
    {
      id: 1,
      dealerOwnerId: null,
      deletedAt: null,
      defaultProfile: true,
      title: "Internal Default",
      coefficient: 1,
    },
  ];
  const dealerAuth = [
    {
      id: 10,
      salesRepId: 700,
      meta: options.dealerMeta || {},
      dealer: {
        customerTypeId: 30,
        profile: {
          id: 30,
          title: "Dealer Standard",
          coefficient: 1.1,
          salesPercentage: 20,
        },
      },
    },
  ];

  const tx = {
    dealerAuth: {
      findUnique: async ({ where, select }: QueryArgs) =>
        pickSelected(
          dealerAuth.find((dealer) => dealer.id === where?.id) || null,
          select,
        ),
    },
    customers: {
      findFirst: async ({ where, select }: QueryArgs) =>
        pickSelected(
          customers.find(
            (customer) =>
              customer.id === where?.id &&
              customer.dealerOwnerId === where?.dealerOwnerId &&
              customer.deletedAt === where?.deletedAt,
          ) || null,
          select,
        ),
    },
    customerTypes: {
      findFirst: async ({ where, select }: QueryArgs) =>
        pickSelected(
          customerTypes.find((profile) => {
            if (where?.id != null && profile.id !== where.id) return false;
            if (where?.dealerOwnerId !== undefined) {
              if (profile.dealerOwnerId !== where.dealerOwnerId) return false;
            }
            if (where?.deletedAt === null && profile.deletedAt !== null) {
              return false;
            }
            return true;
          }) || null,
          select,
        ),
    },
    taxes: {
      findFirst: async ({ where, select }: QueryArgs) =>
        pickSelected(
          where?.taxCode === "FL" || where?.taxCode === "TX"
            ? {
                taxCode: where?.taxCode,
                title: where?.taxCode === "TX" ? "Texas" : "Florida",
                percentage: where?.taxCode === "TX" ? 8 : 6,
                deletedAt: null,
              }
            : null,
          select,
        ),
    },
    settings: {
      findFirst: async () => ({
        meta: {},
      }),
    },
    salesOrders: {
      count: async ({ where }: QueryArgs) => {
        const orderIdFilter = where?.orderId;
        if (typeof orderIdFilter === "string") {
          return collidingOrderIds.has(orderIdFilter) ||
            state.orders.some((order) => order.orderId === orderIdFilter)
            ? 1
            : 0;
        }
        if (
          orderIdFilter &&
          typeof orderIdFilter === "object" &&
          "endsWith" in orderIdFilter &&
          typeof orderIdFilter.endsWith === "string"
        ) {
          const suffix = orderIdFilter.endsWith;
          state.sequenceCountWhere = where;
          return state.orders.filter(
            (order) =>
              order.dealerAuthId != null &&
              order.deletedAt === null &&
              String(order.orderId || "").endsWith(suffix),
          ).length;
        }
        return 0;
      },
      findFirst: async ({ where, select }: QueryArgs) =>
        pickSelected(
          state.orders.find((order) => {
            if (where?.id != null && order.id !== where.id) return false;
            if (
              where?.dealerAuthId != null &&
              order.dealerAuthId !== where.dealerAuthId
            ) {
              return false;
            }
            if (where?.deletedAt === null && order.deletedAt !== null)
              return false;
            if (where?.type && order.type !== where.type) return false;
            return true;
          }) || null,
          select,
        ),
      create: async ({ data, select }: WriteArgs) => {
        state.createdOrderData = data;
        const row = {
          id: state.nextOrderId++,
          deletedAt: null,
          ...data,
        } as DealerOrderRow;
        state.orders.push(row);
        return pickSelected(row, select);
      },
      update: async ({ where, data, select }: WriteArgs) => {
        state.updatedOrderData = data;
        const row = state.orders.find((order) => order.id === where?.id);
        if (!row) throw new Error("Dealer quote not found in test mock.");
        Object.assign(row, data);
        return pickSelected(row, select);
      },
    },
    salesOrderItems: {
      deleteMany: async ({ where }: QueryArgs) => {
        state.items = state.items.filter(
          (item) => item.salesOrderId !== where?.salesOrderId,
        );
      },
      createMany: async ({ data }: CreateManyArgs) => {
        state.items.push(...data);
        return { count: data.length };
      },
    },
    dealerSales: {
      upsert: async ({ where, create, update }: any) => {
        const existing = state.dealerSales.find(
          (row) => row.salesOrderId === where?.salesOrderId,
        );
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        const row = {
          id: state.dealerSales.length + 1,
          ...create,
        };
        state.dealerSales.push(row);
        return row;
      },
    },
  };
  const db = {
    $transaction: async (callback: (transaction: typeof tx) => unknown) =>
      callback(tx),
  };

  return {
    ctx: { db } as unknown as TRPCContext,
    state,
  };
}

describe("dealer portal sales form DPP identities", () => {
  it("assigns DPP ids and ignores client-supplied internal order ids", async () => {
    const { ctx, state } = createDealerPortalSalesFormContext();

    const saved = await saveDealerPortalQuote(
      ctx,
      10,
      dealerQuoteInput({ orderId: "00000AL" }),
    );

    expect(saved.orderId).toBe("00001DPP");
    expect(saved.slug).toBe("quote-00001dpp");
    expect(saved.orderId).not.toBe("00000AL");
    expect(state.createdOrderData).toMatchObject({
      orderId: "00001DPP",
      slug: "quote-00001dpp",
      type: "quote",
      dealerAuthId: 10,
      salesRepId: 700,
    });
    expect(state.createdOrderData?.meta).toMatchObject({
      salesCoefficient: 1,
    });
    expect(state.createdOrderData?.meta).not.toHaveProperty("source");
    expect(state.createdOrderData?.meta).not.toHaveProperty("pricingSnapshot");
    expect(state.createdOrderData?.meta).not.toHaveProperty("dealerPricing");
    expect(state.createdOrderData?.meta).not.toHaveProperty("internalPricing");
    expect(state.createdOrderData?.meta).not.toHaveProperty(
      "dealerSalesPercentage",
    );
    expect(state.dealerSales[0]).toMatchObject({
      salesOrderId: 1,
      dealerAuthId: 10,
      customerId: 20,
      dealerCustomerProfileId: 30,
      dealerSalesPercentage: 20,
      grandTotal: 120,
      dueAmount: 120,
    });
    expect(state.sequenceCountWhere).toMatchObject({
      dealerAuthId: {
        not: null,
      },
      deletedAt: null,
      orderId: {
        endsWith: "DPP",
      },
    });
  });

  it("uses the next DPP serial and skips collisions", async () => {
    const { ctx } = createDealerPortalSalesFormContext({
      dppDocuments: [{ orderId: "00001DPP", deletedAt: null }],
      collidingOrderIds: ["00002DPP"],
    });

    const saved = await saveDealerPortalQuote(ctx, 10, dealerQuoteInput());

    expect(saved.orderId).toBe("00003DPP");
    expect(saved.slug).toBe("quote-00003dpp");
  });

  it("uses explicit pricing context when keeping saved profile snapshots", async () => {
    const { ctx, state } = createDealerPortalSalesFormContext();

    await saveDealerPortalQuote(
      ctx,
      10,
      dealerQuoteInput({
        pricingContext: {
          salesCoefficient: 1.25,
          dealerSalesPercentage: 35,
        },
      }),
    );

    expect(state.createdOrderData?.meta).toMatchObject({
      salesCoefficient: 1.25,
    });
    expect(state.items[0]).toMatchObject({
      rate: 80,
      total: 80,
    });
    expect(state.dealerSales[0]).toMatchObject({
      dealerSalesPercentage: 35,
      grandTotal: 108,
      dueAmount: 108,
    });
  });

  it("uses dealership defaults when customer profile, tax, and fulfillment are blank", async () => {
    const { ctx, state } = createDealerPortalSalesFormContext({
      customerTypeId: null,
      dealerMeta: {
        defaultCustomerProfileId: 40,
        defaultTaxCode: "FL",
        defaultFulfillmentMode: "delivery",
      },
    });

    await saveDealerPortalQuote(
      ctx,
      10,
      dealerQuoteInput({ customerProfileId: undefined }),
    );

    expect(state.createdOrderData).toMatchObject({
      dealerSalesProfileId: 40,
      taxPercentage: 6,
    });
    expect((state.createdOrderData?.meta as any).newSalesForm.form).toMatchObject({
      customerProfileId: 40,
      taxCode: "FL",
      deliveryOption: "delivery",
    });
  });

  it("uses customer tax before dealership default tax", async () => {
    const { ctx, state } = createDealerPortalSalesFormContext({
      customerTaxCode: "TX",
      dealerMeta: {
        defaultTaxCode: "FL",
        defaultFulfillmentMode: "delivery",
      },
    });

    await saveDealerPortalQuote(ctx, 10, dealerQuoteInput());

    expect(state.createdOrderData).toMatchObject({
      taxPercentage: 8,
    });
    expect((state.createdOrderData?.meta as any).newSalesForm.form).toMatchObject({
      taxCode: "TX",
      deliveryOption: "delivery",
    });
  });

  it("keeps explicit quote tax and fulfillment over dealership defaults", async () => {
    const { ctx, state } = createDealerPortalSalesFormContext({
      dealerMeta: {
        defaultTaxCode: "FL",
        defaultFulfillmentMode: "delivery",
      },
    });

    await saveDealerPortalQuote(
      ctx,
      10,
      dealerQuoteInput({
        taxCode: "TX",
        deliveryOption: "ship",
      }),
    );

    expect(state.createdOrderData).toMatchObject({
      taxPercentage: 8,
    });
    expect((state.createdOrderData?.meta as any).newSalesForm.form).toMatchObject({
      taxCode: "TX",
      deliveryOption: "ship",
    });
  });

  it("preserves an existing dealer quote order id on edit", async () => {
    const { ctx, state } = createDealerPortalSalesFormContext({
      existingQuote: {
        id: 55,
        orderId: "00007DPP",
        slug: "quote-00007dpp",
      },
    });

    const saved = await saveDealerPortalQuote(
      ctx,
      10,
      dealerQuoteInput({ id: 55, orderId: "00000AL" }),
    );

    expect(saved.orderId).toBe("00007DPP");
    expect(saved.slug).toBe("quote-00007dpp");
    expect(state.sequenceCountWhere).toBeNull();
    expect(state.updatedOrderData).toMatchObject({
      orderId: "00007DPP",
      slug: "quote-00007dpp",
      type: "quote",
    });
  });

  it("rejects edits after pending, approved, or rejected order review state", async () => {
    for (const requestStatus of [
      "pending",
      "approved",
      "rejected",
    ] as const) {
      const { ctx, state } = createDealerPortalSalesFormContext({
        existingQuote: {
          id: 55,
          orderId: "00007DPP",
          slug: "quote-00007dpp",
          requestStatus,
        },
      });

      try {
        await saveDealerPortalQuote(
          ctx,
          10,
          dealerQuoteInput({ id: 55 }),
        );
        throw new Error(`Expected ${requestStatus} quote edit to be rejected.`);
      } catch (error) {
        expect(error).toMatchObject({
          code: "CONFLICT",
        });
        expect((error as Error).message.toLowerCase()).toContain("locked");
      }
      expect(state.updatedOrderData).toBeNull();
      expect(state.items).toHaveLength(0);
    }
  });
});

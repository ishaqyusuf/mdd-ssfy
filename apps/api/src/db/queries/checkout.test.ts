import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { TRPCContext } from "@api/trpc/init";
import { tasks } from "@trigger.dev/sdk/v3";

process.env.ENC_SECRET_KEY = "quote-acceptance-test-secret";

const { acceptQuote } = await import("./checkout");
const { tokenize } = await import("@gnd/utils/tokenizer");

type Row = Record<string, unknown>;
type QueryWhere = Row & {
  id?: number;
  orderId?: string;
  type?: string;
};
type CustomerRow = Row & {
  id: number;
  name: string;
  businessName: string;
  phoneNo: string;
  email: string;
};
type AddressRow = Row & {
  name: string;
  email: string;
};
type SalesRepRow = Row & {
  id: number;
  name: string;
  email: string;
};
type SalesRow = Row & {
  id: number;
  orderId: string;
  slug: string;
  type: string;
  status: string | null;
  grandTotal: number;
  amountDue: number;
  customerId: number | null;
  salesRepId: number | null;
  customer: CustomerRow;
  billingAddress: AddressRow;
  salesRep: SalesRepRow;
  meta: Row;
};
type MutableTasks = {
  trigger: (taskId: string, payload: unknown) => Promise<unknown>;
};

function setTaskTrigger(trigger: MutableTasks["trigger"]) {
  (tasks as unknown as MutableTasks).trigger = trigger;
}

function isRecord(value: unknown): value is Row {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function connectedId(value: unknown) {
  const relation = isRecord(value) ? value : null;
  const connect = isRecord(relation?.connect) ? relation.connect : null;
  return typeof connect?.id === "number" ? connect.id : null;
}

function createQuoteAcceptanceContext() {
  const state = {
    createdOrders: [] as Row[],
    createdItems: [] as Row[],
    quote: {
      id: 1,
      orderId: "Q-100",
      slug: "Q-100",
      type: "quote",
      status: "Open",
      grandTotal: 425,
      amountDue: 425,
      customerId: 20,
      salesRepId: 7,
      customer: {
        id: 20,
        name: "Ada Lovelace",
        businessName: "Lovelace Homes",
        phoneNo: "5551234567",
        email: "ada@example.com",
      },
      billingAddress: {
        name: "Ada Lovelace",
        email: "billing@example.com",
      },
      salesRep: {
        id: 7,
        name: "Pablo Cruz",
        email: "pablo@example.com",
      },
      meta: {},
      shippingAddressId: 30,
      billingAddressId: 31,
      customerProfileId: 40,
      deliveryOption: "pickup",
      title: "Entry package",
      tax: 25,
      subTotal: 400,
      isDyke: true,
      taxPercentage: 6.25,
      extraCosts: [],
      taxes: [],
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
          meta: {},
          price: 400,
          swing: "LH",
          salesDoors: [],
          total: 400,
          taxPercenatage: 6.25,
          tax: 25,
        },
      ],
    } as SalesRow,
    order: null as SalesRow | null,
  };

  function selectedSale(row: SalesRow | null) {
    if (!row) return null;
    return {
      id: row.id,
      orderId: row.orderId,
      type: row.type,
      status: row.status,
      grandTotal: row.grandTotal,
      amountDue: row.amountDue,
      customerId: row.customerId,
      salesRepId: row.salesRepId,
      customer: row.customer,
      billingAddress: row.billingAddress,
      salesRep: row.salesRep,
      meta: row.meta,
    };
  }

  function selectedOrder(row: SalesRow | null) {
    const selected = selectedSale(row);
    if (!selected) return null;
    const { type: _type, grandTotal: _grandTotal, salesRepId: _salesRepId, ...order } =
      selected;
    return order;
  }

  const tx = {
    salesOrders: {
      findFirst: async ({ where }: { where?: QueryWhere }) => {
        if (where?.id === state.quote.id) return selectedSale(state.quote);
        if (where?.orderId && where?.type === "order") {
          return state.order?.orderId === where.orderId
            ? selectedOrder(state.order)
            : null;
        }
        return null;
      },
      findFirstOrThrow: async ({ where }: { where?: QueryWhere }) => {
        if (
          where?.orderId === state.quote.orderId &&
          where?.type === state.quote.type
        ) {
          return state.quote;
        }
        throw new Error("Sales order not found in test mock.");
      },
      count: async ({ where }: { where?: QueryWhere }) =>
        where?.orderId ? 0 : 23,
      create: async ({ data }: { data: Row }) => {
        const created = {
          id: 101,
          orderId: String(data.orderId),
          slug: String(data.slug),
          type: String(data.type),
          status: typeof data.status === "string" ? data.status : null,
          grandTotal: Number(data.grandTotal),
          amountDue: Number(data.amountDue),
          customerId: connectedId(data.customer),
          salesRepId: connectedId(data.salesRep),
          customer: state.quote.customer,
          billingAddress: state.quote.billingAddress,
          salesRep: state.quote.salesRep,
          meta: isRecord(data.meta) ? data.meta : {},
          isDyke: data.isDyke === true,
        } satisfies SalesRow;
        state.order = created;
        state.createdOrders.push(created);
        return {
          id: created.id,
          slug: created.slug,
          isDyke: created.isDyke,
        };
      },
      update: async ({ where, data }: { where?: QueryWhere; data: Row }) => {
        if (where?.id === state.quote.id) {
          state.quote = {
            ...state.quote,
            ...data,
          } as SalesRow;
          return selectedSale(state.quote);
        }
        if (state.order && where?.id === state.order.id) {
          state.order = {
            ...state.order,
            ...data,
          } as SalesRow;
          return selectedOrder(state.order);
        }
        throw new Error("Update target not found in test mock.");
      },
    },
    salesOrderItems: {
      create: async ({ data }: { data: Row }) => {
        state.createdItems.push(data);
        return {
          id: 201,
          ...data,
        };
      },
    },
  };

  const db = {
    $transaction: async <T>(callback: (client: typeof tx) => Promise<T>) =>
      callback(tx),
    customerWallet: {
      upsert: async () => ({
        id: 501,
      }),
    },
    customerTransaction: {
      aggregate: async () => ({
        _sum: {
          amount: 0,
        },
      }),
    },
  };

  const ctx: TRPCContext = {
    db: db as unknown as TRPCContext["db"],
    userId: undefined,
  };

  return {
    ctx,
    state,
  };
}

function quoteToken(expiry = new Date(Date.now() + 60_000).toISOString()) {
  return tokenize({
    salesId: 1,
    orderId: "Q-100",
    expiry,
  });
}

describe("acceptQuote", () => {
  beforeEach(() => {
    setTaskTrigger(
      mock(async (_taskId: string, _payload: unknown) => ({ id: "test-run" })),
    );
  });

  it("creates one active order and writes quote acceptance metadata", async () => {
    const { ctx, state } = createQuoteAcceptanceContext();

    const result = await acceptQuote(ctx, {
      orderId: "Q-100",
      token: quoteToken(),
    });

    expect(result.alreadyAccepted).toBe(false);
    expect(result.order).toMatchObject({
      salesId: 101,
      orderId: "00023PC",
      originalQuoteOrderId: "Q-100",
      due: 425,
      status: "Active",
    });
    expect(typeof result.order.paymentToken).toBe("string");
    expect(result.order.paymentToken?.length).toBeGreaterThan(0);
    expect(state.createdOrders).toHaveLength(1);
    expect(state.createdItems).toHaveLength(1);
    expect(state.quote.meta.quoteAcceptance).toMatchObject({
      originalQuoteOrderId: "Q-100",
      acceptedOrderId: "00023PC",
      acceptedFrom: "public-link",
    });
    expect(state.order?.meta.quoteAcceptance).toMatchObject({
      originalQuoteOrderId: "Q-100",
      acceptedOrderId: "00023PC",
      acceptedFrom: "public-link",
    });
    expect("notify" in result).toBe(false);
  });

  it("returns the accepted order on repeat acceptance without copying again", async () => {
    const { ctx, state } = createQuoteAcceptanceContext();
    const token = quoteToken();

    await acceptQuote(ctx, {
      orderId: "Q-100",
      token,
    });
    const result = await acceptQuote(ctx, {
      orderId: "Q-100",
      token,
    });

    expect(result.alreadyAccepted).toBe(true);
    expect(result.order).toMatchObject({
      salesId: 101,
      orderId: "00023PC",
      originalQuoteOrderId: "Q-100",
    });
    expect(state.createdOrders).toHaveLength(1);
  });

  it("does not reject acceptance when notification side effects fail", async () => {
    setTaskTrigger(
      mock(async (_taskId: string, _payload: unknown) => {
        throw new Error("trigger unavailable");
      }),
    );
    const { ctx, state } = createQuoteAcceptanceContext();

    const result = await acceptQuote(ctx, {
      orderId: "Q-100",
      token: quoteToken(),
    });

    expect(result.ok).toBe(true);
    expect(result.alreadyAccepted).toBe(false);
    expect(result.order.orderId).toBe("00023PC");
    expect(state.createdOrders).toHaveLength(1);
  });

  it("rejects invalid and expired quote acceptance tokens", async () => {
    const { ctx } = createQuoteAcceptanceContext();

    await expect(
      acceptQuote(ctx, {
        orderId: "Q-100",
        token: "not-a-token",
      }),
    ).rejects.toThrow("This quote acceptance link is invalid.");

    await expect(
      acceptQuote(ctx, {
        orderId: "Q-100",
        token: quoteToken(new Date(Date.now() - 60_000).toISOString()),
      }),
    ).rejects.toThrow("This quote acceptance link has expired.");
  });
});

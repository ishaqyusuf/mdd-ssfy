import { describe, expect, it } from "bun:test";
import {
  type CopySalesInTransactionProps,
  copySalesInTransaction,
} from "./copy-sales";

function createTransactionLikeDb() {
  const calls = {
    createdSales: [] as Record<string, unknown>[],
    createdItems: [] as Record<string, unknown>[],
    findFirstArgs: null as Record<string, unknown> | null,
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
  };

  const db = {
    salesOrders: {
      findFirstOrThrow: async (args: Record<string, unknown>) => {
        calls.findFirstArgs = args;
        return sourceSale;
      },
      count: async (args: { where?: { orderId?: string } }) =>
        args.where?.orderId ? 0 : 12,
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
    });
    expect(calls.createdItems).toHaveLength(1);
    expect(calls.createdItems[0]).toMatchObject({
      description: "Door slab",
      salesOrderId: 900,
      total: 400,
    });
  });
});

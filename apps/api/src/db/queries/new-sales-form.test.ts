import { describe, expect, it } from "bun:test";
import {
  getNewSalesForm,
  saveDraftNewSalesForm,
} from "./new-sales-form";

function createMockContext() {
  const now = new Date("2026-02-24T12:00:00.000Z");
  const state = {
    orders: [] as any[],
    items: [] as any[],
    stepForms: [] as any[],
    shelfItems: [] as any[],
    hpts: [] as any[],
    doors: [] as any[],
    extraCosts: [] as any[],
    customers: [
      {
        id: 100,
        name: "Ada",
        businessName: "Ada Co",
        phoneNo: "111",
        email: "ada@example.com",
      },
    ],
    products: [
      {
        id: 501,
        title: "Classic Moulding",
        value: "moulding-classic",
        price: 12.5,
        deletedAt: null,
      },
    ],
    ids: {
      order: 1,
      item: 1,
      formStep: 1,
      shelf: 1,
      hpt: 1,
      door: 1,
      extra: 1,
    },
  };

  function findOrder(where: any) {
    return state.orders.find((o) => {
      if (where?.id && o.id !== where.id) return false;
      if (where?.slug && o.slug !== where.slug) return false;
      if (where?.type && o.type !== where.type) return false;
      if (where?.deletedAt === null && o.deletedAt != null) return false;
      return true;
    });
  }

  function getOrderGraph(order: any) {
    const items = state.items
      .filter((item) => item.salesOrderId === order.id && item.deletedAt == null)
      .sort((a, b) => a.id - b.id)
      .map((item) => {
        const formSteps = state.stepForms
          .filter((f) => f.salesItemId === item.id && f.deletedAt == null)
          .map((f) => ({
            ...f,
            step: {
              id: f.stepId,
              title: `Step ${f.stepId}`,
            },
          }));
        const shelfItems = state.shelfItems.filter(
          (s) => s.salesOrderItemId === item.id && s.deletedAt == null,
        );
        const hpt = state.hpts.find(
          (h) => h.orderItemId === item.id && h.deletedAt == null,
        );
        const doors = hpt
          ? state.doors.filter(
              (d) => d.housePackageToolId === hpt.id && d.deletedAt == null,
            )
          : [];
        const molding = hpt?.moldingId
          ? state.products.find(
              (p) => p.id === hpt.moldingId && p.deletedAt == null,
            ) || null
          : null;

        return {
          ...item,
          formSteps,
          shelfItems,
          housePackageTool: hpt
            ? {
                ...hpt,
                doors,
                molding,
              }
            : null,
        };
      });

    return {
      ...order,
      extraCosts: state.extraCosts.filter((c) => c.orderId === order.id),
      customer: state.customers.find((c) => c.id === order.customerId) || null,
      items,
    };
  }

  const tx = {
    salesOrders: {
      findFirst: async ({ where }: any) => {
        const order = findOrder(where);
        if (!order) return null;
        return {
          id: order.id,
          slug: order.slug,
          orderId: order.orderId,
          meta: order.meta,
          updatedAt: order.updatedAt,
          paymentTerm: order.paymentTerm,
          goodUntil: order.goodUntil,
        };
      },
      create: async ({ data }: any) => {
        const row = {
          id: state.ids.order++,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          ...data,
        };
        state.orders.push(row);
        return { id: row.id, slug: row.slug, orderId: row.orderId };
      },
      update: async ({ where, data }: any) => {
        const row = state.orders.find((o) => o.id === where.id);
        Object.assign(row, data, { updatedAt: now });
        return row;
      },
    },
    salesOrderItems: {
      updateMany: async ({ where, data }: any) => {
        state.items
          .filter((item) => {
            if (where?.salesOrderId && item.salesOrderId !== where.salesOrderId)
              return false;
            if (where?.deletedAt === null && item.deletedAt != null) return false;
            return true;
          })
          .forEach((item) => Object.assign(item, data));
      },
      create: async ({ data, select }: any) => {
        const row = {
          id: state.ids.item++,
          deletedAt: null,
          ...data,
        };
        state.items.push(row);
        return select?.id ? { id: row.id } : row;
      },
    },
    dykeStepForm: {
      updateMany: async ({ where, data }: any) => {
        state.stepForms
          .filter((f) => {
            if (where?.salesId && f.salesId !== where.salesId) return false;
            if (where?.deletedAt === null && f.deletedAt != null) return false;
            return true;
          })
          .forEach((f) => Object.assign(f, data));
      },
      createMany: async ({ data }: any) => {
        data.forEach((row) =>
          state.stepForms.push({
            id: state.ids.formStep++,
            deletedAt: null,
            ...row,
          }),
        );
      },
    },
    dykeSalesShelfItem: {
      updateMany: async ({ where, data }: any) => {
        state.shelfItems
          .filter((s) => {
            if (where?.deletedAt === null && s.deletedAt != null) return false;
            const order = state.items.find((i) => i.id === s.salesOrderItemId);
            return order?.salesOrderId === where?.salesOrderItem?.salesOrderId;
          })
          .forEach((s) => Object.assign(s, data));
      },
      createMany: async ({ data }: any) => {
        data.forEach((row) =>
          state.shelfItems.push({
            id: state.ids.shelf++,
            deletedAt: null,
            ...row,
          }),
        );
      },
    },
    housePackageTools: {
      updateMany: async ({ where, data }: any) => {
        state.hpts
          .filter((h) => {
            if (where?.salesOrderId && h.salesOrderId !== where.salesOrderId)
              return false;
            if (where?.deletedAt === null && h.deletedAt != null) return false;
            return true;
          })
          .forEach((h) => Object.assign(h, data));
      },
      create: async ({ data, select }: any) => {
        const row = {
          id: state.ids.hpt++,
          deletedAt: null,
          ...data,
        };
        state.hpts.push(row);
        return select?.id ? { id: row.id } : row;
      },
    },
    dykeSalesDoors: {
      updateMany: async ({ where, data }: any) => {
        state.doors
          .filter((d) => {
            if (where?.salesOrderId && d.salesOrderId !== where.salesOrderId)
              return false;
            if (where?.deletedAt === null && d.deletedAt != null) return false;
            return true;
          })
          .forEach((d) => Object.assign(d, data));
      },
      createMany: async ({ data }: any) => {
        data.forEach((row) =>
          state.doors.push({
            id: state.ids.door++,
            deletedAt: null,
            ...row,
          }),
        );
      },
    },
    salesExtraCosts: {
      updateMany: async ({ where, data }: any) => {
        state.extraCosts
          .filter((c) => c.orderId === where.orderId)
          .forEach((c) => Object.assign(c, data));
      },
      deleteMany: async ({ where }: any) => {
        state.extraCosts = state.extraCosts.filter((c) => {
          if (c.orderId !== where.orderId) return true;
          const keep = where.id?.notIn?.includes(c.id);
          return keep;
        });
      },
      update: async ({ where, data }: any) => {
        const row = state.extraCosts.find((c) => c.id === where.id);
        Object.assign(row, data);
        return row;
      },
      create: async ({ data }: any) => {
        const row = {
          id: state.ids.extra++,
          ...data,
        };
        state.extraCosts.push(row);
        return row;
      },
    },
  };

  const db = {
    $transaction: async (cb: any) => cb(tx),
    salesOrders: {
      count: async ({ where }: any) => {
        return state.orders.filter((o) => {
          return where.OR.some(
            (clause) =>
              (clause.orderId && clause.orderId === o.orderId) ||
              (clause.slug && clause.slug === o.slug),
          );
        }).length;
      },
      findFirst: async ({ where }: any) => {
        const order = findOrder(where);
        if (!order) return null;
        return getOrderGraph(order);
      },
    },
    customers: {
      findMany: async () => state.customers,
    },
  };

  return {
    ctx: { db } as any,
    state,
  };
}

describe("new-sales-form relational parity", () => {
  it("saves and hydrates formSteps/shelfItems/housePackageTool/doors/molding", async () => {
    const { ctx } = createMockContext();

    const draft = await saveDraftNewSalesForm(ctx, {
      type: "order",
      slug: null,
      salesId: null,
      version: null,
      autosave: false,
      meta: {
        customerId: 100,
        customerProfileId: null,
        billingAddressId: null,
        shippingAddressId: null,
        paymentTerm: "None",
        paymentMethod: "Credit Card",
        goodUntil: null,
        po: null,
        notes: null,
        deliveryOption: "pickup",
        taxCode: null,
      },
      summary: {
        subTotal: 0,
        taxRate: 0,
        taxTotal: 0,
        grandTotal: 0,
      },
      extraCosts: [{ id: null, label: "Labor", type: "Labor", amount: 0 }],
      lineItems: [
        {
          id: null,
          uid: "line-a",
          title: "Entry Door Package",
          description: "Door package",
          qty: 1,
          unitPrice: 1000,
          lineTotal: 1000,
          meta: {},
          formSteps: [
            {
              id: null,
              stepId: 7,
              componentId: 70,
              prodUid: "prod-70",
              value: "Oak",
              qty: 1,
              price: 250,
              basePrice: 200,
              meta: {},
              step: { id: 7, title: "Specie" },
            },
          ],
          shelfItems: [
            {
              id: null,
              categoryId: 300,
              productId: 301,
              description: "Shelf",
              qty: 2,
              unitPrice: 35,
              totalPrice: 70,
              meta: {},
            },
          ],
          housePackageTool: {
            id: null,
            doorType: "Moulding",
            dykeDoorId: 200,
            moldingId: 501,
            stepProductId: 70,
            totalPrice: 1000,
            totalDoors: 2,
            meta: {},
            doors: [
              {
                id: null,
                dimension: '2-6 x 6-8"',
                swing: "LH",
                doorType: "Moulding",
                unitPrice: 500,
                lhQty: 1,
                rhQty: 1,
                totalQty: 2,
                lineTotal: 1000,
                meta: {},
              },
            ],
          },
        },
      ],
    });

    const loaded = await getNewSalesForm(ctx, {
      type: "order",
      slug: draft.slug!,
    });

    expect(loaded.lineItems).toHaveLength(1);
    expect(loaded.lineItems[0].formSteps).toHaveLength(1);
    expect(loaded.lineItems[0].shelfItems).toHaveLength(1);
    expect(loaded.lineItems[0].housePackageTool).toBeTruthy();
    expect(loaded.lineItems[0].housePackageTool?.doors).toHaveLength(1);
    expect(loaded.lineItems[0].housePackageTool?.moldingId).toBe(501);
    expect(loaded.lineItems[0].housePackageTool?.molding?.title).toBe(
      "Classic Moulding",
    );
    expect(loaded.form.paymentMethod).toBe("Credit Card");
    expect(loaded.summary.grandTotal).toBeGreaterThan(loaded.summary.subTotal);
  });

  it("soft-deletes prior relational rows on update and replaces with current payload", async () => {
    const { ctx, state } = createMockContext();

    const first = await saveDraftNewSalesForm(ctx, {
      type: "order",
      slug: null,
      salesId: null,
      version: null,
      autosave: false,
      meta: {
        customerId: 100,
        customerProfileId: null,
        billingAddressId: null,
        shippingAddressId: null,
        paymentTerm: "None",
        goodUntil: null,
        po: null,
        notes: null,
        deliveryOption: "pickup",
        taxCode: null,
      },
      summary: { subTotal: 0, taxRate: 0, taxTotal: 0, grandTotal: 0 },
      extraCosts: [{ id: null, label: "Labor", type: "Labor", amount: 0 }],
      lineItems: [
        {
          id: null,
          uid: "line-a",
          title: "Line A",
          description: "",
          qty: 1,
          unitPrice: 100,
          lineTotal: 100,
          meta: {},
          formSteps: [{ stepId: 1, value: "A" }],
          shelfItems: [{ categoryId: 10, qty: 1 }],
          housePackageTool: {
            doorType: "Moulding",
            moldingId: 501,
            doors: [{ dimension: '2-6 x 6-8"', lhQty: 1, rhQty: 0, totalQty: 1 }],
          },
        } as any,
      ],
    });

    const second = await saveDraftNewSalesForm(ctx, {
      type: "order",
      slug: first.slug,
      salesId: first.salesId,
      version: first.version,
      autosave: false,
      meta: {
        customerId: 100,
        customerProfileId: null,
        billingAddressId: null,
        shippingAddressId: null,
        paymentTerm: "None",
        goodUntil: null,
        po: null,
        notes: null,
        deliveryOption: "pickup",
        taxCode: null,
      },
      summary: { subTotal: 0, taxRate: 0, taxTotal: 0, grandTotal: 0 },
      extraCosts: [{ id: null, label: "Labor", type: "Labor", amount: 0 }],
      lineItems: [
        {
          id: null,
          uid: "line-b",
          title: "Line B",
          description: "",
          qty: 1,
          unitPrice: 50,
          lineTotal: 50,
          meta: {},
          formSteps: [{ stepId: 2, value: "B" }],
          shelfItems: [],
          housePackageTool: null,
        } as any,
      ],
    });

    expect(second.version).not.toBe(first.version);
    expect(state.items.filter((i) => i.deletedAt != null).length).toBe(1);
    expect(state.stepForms.filter((i) => i.deletedAt != null).length).toBe(1);
    expect(state.shelfItems.filter((i) => i.deletedAt != null).length).toBe(1);
    expect(state.hpts.filter((i) => i.deletedAt != null).length).toBe(1);
    expect(state.doors.filter((i) => i.deletedAt != null).length).toBe(1);

    const loaded = await getNewSalesForm(ctx, {
      type: "order",
      slug: second.slug!,
    });
    expect(loaded.lineItems).toHaveLength(1);
    expect(loaded.lineItems[0].title).toBe("Line B");
    expect(loaded.lineItems[0].formSteps[0]?.stepId).toBe(2);
  });
});

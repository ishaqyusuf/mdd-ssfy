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
    salesTaxes: [] as any[],
    salesDocumentSnapshots: [] as any[],
    users: [
      {
        id: 77,
        name: "Ada Lovelace",
      },
    ],
    settings: [
      {
        id: 1,
        type: "sales-settings",
        meta: {
          ccc: 3.5,
          taxCode: "GST",
        },
      },
    ],
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
    salesTaxes: {
      deleteMany: async ({ where }: any) => {
        state.salesTaxes = state.salesTaxes.filter(
          (row) => row.salesId !== where.salesId,
        );
      },
      create: async ({ data }: any) => {
        const row = {
          id: `tax-${state.salesTaxes.length + 1}`,
          ...data,
        };
        state.salesTaxes.push(row);
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
    users: {
      findFirst: async ({ where, select }: any) => {
        const user = state.users.find((row) => row.id === where?.id) || null;
        if (!user || !select) return user;
        return Object.fromEntries(
          Object.keys(select)
            .filter((key) => select[key])
            .map((key) => [key, (user as any)[key]]),
        );
      },
    },
    settings: {
      findFirst: async ({ where, select }: any) => {
        const setting =
          state.settings.find((row) => row.type === where?.type) || null;
        if (!setting || !select) return setting;
        return Object.fromEntries(
          Object.keys(select)
            .filter((key) => select[key])
            .map((key) => [key, (setting as any)[key]]),
        );
      },
    },
    salesDocumentSnapshot: {
      findMany: async ({ where }: any) => {
        return state.salesDocumentSnapshots.filter((snapshot) => {
          if (
            where?.salesOrderId &&
            snapshot.salesOrderId !== where.salesOrderId
          )
            return false;
          if (where?.isCurrent != null && snapshot.isCurrent !== where.isCurrent)
            return false;
          if (where?.deletedAt === null && snapshot.deletedAt != null) return false;
          return true;
        });
      },
      update: async ({ where, data }: any) => {
        const row = state.salesDocumentSnapshots.find(
          (snapshot) => snapshot.id === where.id,
        );
        if (!row) return null;
        Object.assign(row, data);
        return row;
      },
    },
  };

  return {
    ctx: { db, userId: 77 } as any,
    state,
  };
}

describe("new-sales-form multi-line mixed parity", () => {
  it("preserves relation boundaries across door, shelf-only, and service lines", async () => {
    const { ctx } = createMockContext();

    const saved = await saveDraftNewSalesForm(ctx, {
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
          uid: "line-door",
          title: "Door Line",
          description: "",
          qty: 1,
          unitPrice: 1000,
          lineTotal: 1000,
          meta: {},
          formSteps: [{ stepId: 7, value: "Oak", prodUid: "door-oak" }],
          shelfItems: [],
          housePackageTool: {
            doorType: "Moulding",
            dykeDoorId: 200,
            moldingId: 501,
            stepProductId: 70,
            totalPrice: 1000,
            totalDoors: 2,
            doors: [
              {
                dimension: '2-6 x 6-8"',
                swing: "LH",
                lhQty: 1,
                rhQty: 1,
                totalQty: 2,
                lineTotal: 1000,
              },
            ],
          },
        } as any,
        {
          id: null,
          uid: "line-shelf",
          title: "Shelf Line",
          description: "",
          qty: 1,
          unitPrice: 120,
          lineTotal: 120,
          meta: {},
          formSteps: [{ stepId: 9, value: "Shelf Items", prodUid: "shelf-items" }],
          shelfItems: [
            {
              categoryId: 300,
              productId: 301,
              description: "Shelf A",
              qty: 2,
              unitPrice: 60,
              totalPrice: 120,
            },
          ],
          housePackageTool: null,
        } as any,
        {
          id: null,
          uid: "line-service",
          title: "Service Line",
          description: "Install | Delivery",
          qty: 2,
          unitPrice: 65,
          lineTotal: 130,
          meta: {
            taxxable: true,
            serviceRows: [
              { uid: "svc-1", service: "Install", taxxable: true, qty: 1, unitPrice: 80 },
              { uid: "svc-2", service: "Delivery", taxxable: false, qty: 1, unitPrice: 50 },
            ],
          },
          formSteps: [{ stepId: 11, value: "Services", prodUid: "service" }],
          shelfItems: [],
          housePackageTool: null,
        } as any,
        {
          id: null,
          uid: "line-moulding",
          title: "Moulding Line",
          description: "Casing",
          qty: 2,
          unitPrice: 75,
          lineTotal: 150,
          meta: {
            mouldingRows: [
              {
                uid: "m-1",
                title: "Casing",
                description: "Casing",
                qty: 2,
                addon: 0,
                customPrice: null,
                salesPrice: 70,
                basePrice: 40,
              },
            ],
          },
          formSteps: [
            { stepId: 13, value: "Moulding", prodUid: "item-type-moulding" },
            { stepId: 14, value: "Casing", prodUid: "moulding-casing" },
          ],
          shelfItems: [],
          housePackageTool: null,
        } as any,
      ],
    });

    const loaded = await getNewSalesForm(ctx, {
      type: "order",
      slug: saved.slug!,
    });

    const doorLine = loaded.lineItems.find((l) => l.uid === "line-door");
    const shelfLine = loaded.lineItems.find((l) => l.uid === "line-shelf");
    const serviceLine = loaded.lineItems.find((l) => l.uid === "line-service");
    const mouldingLine = loaded.lineItems.find((l) => l.uid === "line-moulding");

    expect(loaded.lineItems).toHaveLength(4);

    expect(doorLine?.housePackageTool).toBeTruthy();
    expect(doorLine?.housePackageTool?.doors).toHaveLength(1);
    expect(doorLine?.shelfItems || []).toHaveLength(0);
    expect(doorLine?.formSteps || []).toHaveLength(1);

    expect(shelfLine?.housePackageTool).toBeNull();
    expect(shelfLine?.shelfItems || []).toHaveLength(1);
    expect(shelfLine?.formSteps || []).toHaveLength(1);
    expect(shelfLine?.qty).toBe(1);
    expect(shelfLine?.unitPrice).toBe(120);
    expect(shelfLine?.lineTotal).toBe(120);
    expect(shelfLine?.shelfItems?.[0]?.qty).toBe(2);
    expect(shelfLine?.shelfItems?.[0]?.unitPrice).toBe(60);
    expect(shelfLine?.shelfItems?.[0]?.totalPrice).toBe(120);

    expect(serviceLine?.housePackageTool).toBeNull();
    expect(serviceLine?.shelfItems || []).toHaveLength(0);
    expect(serviceLine?.formSteps || []).toHaveLength(1);
    expect(serviceLine?.qty).toBe(2);
    expect(serviceLine?.unitPrice).toBe(65);
    expect(serviceLine?.lineTotal).toBe(130);
    expect((serviceLine?.meta as any)?.taxxable).toBe(true);
    expect(((serviceLine?.meta as any)?.serviceRows || []).length).toBe(2);

    expect(mouldingLine?.housePackageTool).toBeNull();
    expect(mouldingLine?.shelfItems || []).toHaveLength(0);
    expect(mouldingLine?.formSteps || []).toHaveLength(2);
    expect(mouldingLine?.qty).toBe(2);
    expect(mouldingLine?.unitPrice).toBe(75);
    expect(mouldingLine?.lineTotal).toBe(150);
    expect(((mouldingLine?.meta as any)?.mouldingRows || []).length).toBe(1);
    expect((mouldingLine?.meta as any)?.mouldingRows?.[0]?.salesPrice).toBe(70);
  });

  it("merges db line meta back into stale persisted drafts for moulding edits", async () => {
    const { ctx, state } = createMockContext();
    state.orders.push({
      id: 1,
      slug: "order-07890pc",
      orderId: "07890PC",
      type: "order",
      status: "Draft",
      deletedAt: null,
      customerId: 100,
      customerProfileId: null,
      billingAddressId: null,
      shippingAddressId: null,
      paymentTerm: "None",
      goodUntil: null,
      prodDueDate: null,
      deliveryOption: "pickup",
      taxPercentage: 0,
      subTotal: 150,
      tax: 0,
      grandTotal: 150,
      updatedAt: new Date("2026-02-24T12:00:00.000Z"),
      meta: {
        newSalesForm: {
          version: "stale-v1",
          updatedAt: "2026-02-24T12:00:00.000Z",
          form: {
            paymentTerm: "None",
            deliveryOption: "pickup",
          },
          extraCosts: [],
          summary: {
            taxRate: 0,
          },
          lineItems: [
            {
              id: 10,
              uid: "line-moulding-stale",
              title: "Casing",
              description: "Casing",
              qty: 2,
              unitPrice: 75,
              lineTotal: 150,
              meta: {},
              formSteps: [
                { stepId: 13, value: "Moulding", prodUid: "item-type-moulding" },
                { stepId: 14, value: "Casing", prodUid: "moulding-casing" },
              ],
              shelfItems: [],
              housePackageTool: null,
            },
          ],
        },
      },
    });
    state.items.push({
      id: 10,
      salesOrderId: 1,
      dykeDescription: "Moulding",
      description: "Casing",
      qty: 2,
      rate: 75,
      total: 150,
      deletedAt: null,
      meta: {
        uid: "line-moulding-stale",
        meta: {
          mouldingRows: [
            {
              uid: "m-1",
              title: "Casing",
              description: "Casing",
              qty: 2,
              addon: 0,
              customPrice: null,
              salesPrice: 70,
              basePrice: 40,
            },
          ],
        },
      },
    });
    state.stepForms.push(
      {
        id: 1,
        salesId: 1,
        salesItemId: 10,
        deletedAt: null,
        stepId: 13,
        componentId: null,
        prodUid: "item-type-moulding",
        value: "Moulding",
        qty: 0,
        price: 0,
        basePrice: 0,
        meta: {},
      },
      {
        id: 2,
        salesId: 1,
        salesItemId: 10,
        deletedAt: null,
        stepId: 14,
        componentId: null,
        prodUid: "moulding-casing",
        value: "Casing",
        qty: 0,
        price: 70,
        basePrice: 40,
        meta: {},
      },
    );

    const loaded = await getNewSalesForm(ctx, {
      type: "order",
      slug: "order-07890pc",
    });

    const mouldingLine = loaded.lineItems.find(
      (line) => line.uid === "line-moulding-stale",
    );

    expect(mouldingLine?.title).toBe("Moulding");
    expect(((mouldingLine?.meta as any)?.mouldingRows || []).length).toBe(1);
    expect((mouldingLine?.meta as any)?.mouldingRows?.[0]?.title).toBe("Casing");
  });

  it("restores service parent titles from legacy dykeDescription on edit reopen", async () => {
    const { ctx, state } = createMockContext();
    state.orders.push({
      id: 2,
      slug: "order-service-07890pc",
      orderId: "07890PC-S",
      type: "order",
      status: "Draft",
      deletedAt: null,
      customerId: 100,
      customerProfileId: null,
      billingAddressId: null,
      shippingAddressId: null,
      paymentTerm: "None",
      goodUntil: null,
      prodDueDate: null,
      deliveryOption: "pickup",
      taxPercentage: 0,
      subTotal: 80,
      tax: 0,
      grandTotal: 80,
      updatedAt: new Date("2026-02-24T12:00:00.000Z"),
      meta: {
        newSalesForm: {
          version: "stale-v1",
          updatedAt: "2026-02-24T12:00:00.000Z",
          form: {
            paymentTerm: "None",
            deliveryOption: "pickup",
          },
          extraCosts: [],
          summary: {
            taxRate: 0,
          },
          lineItems: [
            {
              id: 20,
              uid: "line-service-stale",
              title: "Install",
              description: "Install",
              qty: 1,
              unitPrice: 80,
              lineTotal: 80,
              meta: {},
              formSteps: [
                { stepId: 11, value: "Services", prodUid: "item-type-services" },
              ],
              shelfItems: [],
              housePackageTool: null,
            },
          ],
        },
      },
    });
    state.items.push({
      id: 20,
      salesOrderId: 2,
      dykeDescription: "Services",
      description: "Install",
      qty: 1,
      rate: 80,
      total: 80,
      deletedAt: null,
      meta: {
        uid: "line-service-stale",
        meta: {
          serviceRows: [
            {
              uid: "svc-1",
              service: "Install",
              qty: 1,
              unitPrice: 80,
              taxxable: true,
            },
          ],
        },
      },
    });
    state.stepForms.push({
      id: 3,
      salesId: 2,
      salesItemId: 20,
      deletedAt: null,
      stepId: 11,
      componentId: null,
      prodUid: "item-type-services",
      value: "Services",
      qty: 0,
      price: 0,
      basePrice: 0,
      meta: {},
    });

    const loaded = await getNewSalesForm(ctx, {
      type: "order",
      slug: "order-service-07890pc",
    });

    const serviceLine = loaded.lineItems.find(
      (line) => line.uid === "line-service-stale",
    );

    expect(serviceLine?.title).toBe("Services");
    expect(((serviceLine?.meta as any)?.serviceRows || []).length).toBe(1);
    expect((serviceLine?.meta as any)?.serviceRows?.[0]?.service).toBe("Install");
  });
});

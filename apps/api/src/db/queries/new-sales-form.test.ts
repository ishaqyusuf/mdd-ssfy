import { describe, expect, it, mock } from "bun:test";
import { tasks } from "@trigger.dev/sdk/v3";
import {
  getNewSalesFormShelfCategories,
  getNewSalesFormShelfProductDetails,
  getNewSalesFormShelfProductIndex,
  getNewSalesFormShelfProducts,
  getNewSalesForm,
  saveDraftNewSalesForm,
  saveFinalNewSalesForm,
  searchNewSalesFormShelfProducts,
} from "./new-sales-form";

(tasks as any).trigger = mock(async () => ({ id: "test-trigger-run" }));

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
    documentSnapshots: [] as any[],
    printData: [] as any[],
    salesTaxes: [] as any[],
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
    shelfCategories: [
      {
        id: 10,
        name: "Door Hardware",
        type: "parent",
        categoryId: null,
        parentCategoryId: null,
        deletedAt: null,
      },
      {
        id: 11,
        name: "Hinges",
        type: "child",
        categoryId: 10,
        parentCategoryId: 10,
        deletedAt: null,
      },
      {
        id: 12,
        name: "Locks",
        type: "child",
        categoryId: 10,
        parentCategoryId: 10,
        deletedAt: null,
      },
    ],
    shelfProducts: [
      {
        id: 1001,
        title: "Ball Bearing Hinge",
        unitPrice: 24.5,
        categoryId: 11,
        parentCategoryId: 10,
        deletedAt: null,
      },
      {
        id: 1002,
        title: "Mortise Lock",
        img: null,
        unitPrice: 42,
        categoryId: 12,
        parentCategoryId: 10,
        deletedAt: null,
      },
      {
        id: 1003,
        title: "Archived Product",
        unitPrice: 5,
        categoryId: 11,
        parentCategoryId: 10,
        deletedAt: new Date("2026-01-01T00:00:00.000Z"),
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
      .filter(
        (item) => item.salesOrderId === order.id && item.deletedAt == null,
      )
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
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          paymentTerm: order.paymentTerm,
          paymentDueDate: order.paymentDueDate,
          goodUntil: order.goodUntil,
          prodDueDate: order.prodDueDate,
          deliveryOption: order.deliveryOption,
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
            if (where?.deletedAt === null && item.deletedAt != null)
              return false;
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
      update: async ({ where, data, select }: any) => {
        const row = state.items.find((item) => item.id === where.id);
        Object.assign(row, data);
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
      update: async ({ where, data, select }: any) => {
        const row = state.hpts.find((h) => h.id === where.id);
        Object.assign(row, data);
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
      create: async ({ data }: any) => {
        const row = {
          id: state.ids.door++,
          deletedAt: null,
          ...data,
        };
        state.doors.push(row);
        return row;
      },
      update: async ({ where, data }: any) => {
        const row = state.doors.find((d) => d.id === where.id);
        Object.assign(row, data);
        return row;
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
          if (where?.type && o.type !== where.type) return false;
          if (where?.deletedAt === null && o.deletedAt != null) return false;
          if (typeof where?.orderId === "string") {
            return o.orderId === where.orderId;
          }
          if (
            where?.orderId?.startsWith &&
            !String(o.orderId || "").startsWith(where.orderId.startsWith)
          ) {
            return false;
          }
          if (Array.isArray(where?.OR)) {
            return where.OR.some(
              (clause) =>
                (clause.orderId && clause.orderId === o.orderId) ||
                (clause.slug && clause.slug === o.slug),
            );
          }
          return true;
        }).length;
      },
      findFirst: async ({ where }: any) => {
        const order = findOrder(where);
        if (!order) return null;
        return getOrderGraph(order);
      },
    },
    salesDocumentSnapshot: {
      findMany: async ({ where }: any) =>
        state.documentSnapshots.filter((snapshot) => {
          if (
            where?.salesOrderId &&
            snapshot.salesOrderId !== where.salesOrderId
          ) {
            return false;
          }
          if (
            where?.isCurrent != null &&
            snapshot.isCurrent !== where.isCurrent
          ) {
            return false;
          }
          if (where?.deletedAt === null && snapshot.deletedAt != null) {
            return false;
          }
          return true;
        }),
      update: async ({ where, data }: any) => {
        const row = state.documentSnapshots.find(
          (snapshot) => snapshot.id === where.id,
        );
        Object.assign(row, data);
        return row;
      },
    },
    salesPrintData: {
      findMany: async ({ where }: any) =>
        state.printData.filter((printData) => {
          if (
            where?.salesOrderId &&
            printData.salesOrderId !== where.salesOrderId
          ) {
            return false;
          }
          if (where?.status != null && printData.status !== where.status) {
            return false;
          }
          if (where?.deletedAt === null && printData.deletedAt != null) {
            return false;
          }
          return true;
        }),
      update: async ({ where, data }: any) => {
        const row = state.printData.find(
          (printData) => printData.id === where.id,
        );
        Object.assign(row, data);
        return row;
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
    dykeShelfCategories: {
      findMany: async ({ where, select, orderBy }: any) => {
        const inIds = where?.id?.in || null;
        const rows = state.shelfCategories.filter((row) => {
          if (where?.deletedAt === null && row.deletedAt != null) return false;
          if (inIds && !inIds.includes(row.id)) return false;
          return true;
        });
        const sorted = [...rows].sort((a, b) => {
          for (const order of orderBy || []) {
            const [key, dir] = Object.entries(order)[0] as [string, any];
            const av = String((a as any)[key] ?? "");
            const bv = String((b as any)[key] ?? "");
            if (av === bv) continue;
            return dir === "desc" ? (av < bv ? 1 : -1) : av > bv ? 1 : -1;
          }
          return 0;
        });
        return sorted.map((row) => {
          if (!select) return row;
          const picked: Record<string, unknown> = {};
          Object.keys(select).forEach((key) => {
            if ((select as any)[key]) picked[key] = (row as any)[key];
          });
          return picked;
        });
      },
    },
    dykeShelfProducts: {
      findMany: async ({ where, select, orderBy, take }: any) => {
        const inCategoryIds = where?.OR?.[0]?.categoryId?.in || [];
        const inParentCategoryIds = where?.OR?.[1]?.parentCategoryId?.in || [];
        const inIds = where?.id?.in || null;
        const titleContains = String(where?.title?.contains || "")
          .trim()
          .toLowerCase();
        const matchesClause = (row: any, clause: any): boolean => {
          if (!clause) return true;
          if (clause.OR) {
            return clause.OR.some((entry: any) => matchesClause(row, entry));
          }
          if ("categoryId" in clause) {
            if (clause.categoryId === null) return row.categoryId == null;
            if (clause.categoryId?.in) {
              return clause.categoryId.in.includes(row.categoryId);
            }
          }
          if ("parentCategoryId" in clause) {
            if (clause.parentCategoryId === null) {
              return row.parentCategoryId == null;
            }
            if (clause.parentCategoryId?.in) {
              return clause.parentCategoryId.in.includes(row.parentCategoryId);
            }
          }
          return true;
        };
        const rows = state.shelfProducts.filter((row) => {
          if (where?.deletedAt === null && row.deletedAt != null) return false;
          if (inIds && !inIds.includes(row.id)) return false;
          if (
            Array.isArray(where?.AND) &&
            !where.AND.every((clause: any) => matchesClause(row, clause))
          ) {
            return false;
          }
          if (
            where?.OR &&
            !inCategoryIds.includes(row.categoryId) &&
            !inParentCategoryIds.includes(row.parentCategoryId)
          ) {
            return false;
          }
          if (
            titleContains &&
            !String(row.title || "")
              .toLowerCase()
              .includes(titleContains)
          ) {
            return false;
          }
          return true;
        });
        const sorted = [...rows].sort((a, b) => {
          for (const order of orderBy || []) {
            const [key, dir] = Object.entries(order)[0] as [string, any];
            const av = String((a as any)[key] ?? "");
            const bv = String((b as any)[key] ?? "");
            if (av === bv) continue;
            return dir === "desc" ? (av < bv ? 1 : -1) : av > bv ? 1 : -1;
          }
          return 0;
        });
        const limited = Number(take || 0) > 0 ? sorted.slice(0, take) : sorted;
        return limited.map((row) => {
          if (!select) return row;
          const picked: Record<string, unknown> = {};
          Object.keys(select).forEach((key) => {
            if ((select as any)[key]) picked[key] = (row as any)[key];
          });
          return picked;
        });
      },
    },
  };

  return {
    ctx: { db, userId: 77 } as any,
    state,
  };
}

describe("new-sales-form relational parity", () => {
  it("loads shelf categories and products for selected categories", async () => {
    const { ctx } = createMockContext();

    const categories = await getNewSalesFormShelfCategories(ctx, {});
    expect(categories.length).toBe(3);
    expect(categories[0]?.type).toBe("child");

    const products = await getNewSalesFormShelfProducts(ctx, {
      categoryIds: [10, 11],
    });
    expect(products.length).toBe(2);
    expect(products.map((p) => p.id).sort((a, b) => a - b)).toEqual([
      1001, 1002,
    ]);

    const none = await getNewSalesFormShelfProducts(ctx, { categoryIds: [] });
    expect(none).toEqual([]);
  });

  it("loads cached shelf product index separately from full product details", async () => {
    const { ctx } = createMockContext();

    const index = await getNewSalesFormShelfProductIndex(ctx, {});
    expect(index).toEqual([
      { id: 1001, title: "Ball Bearing Hinge", unitPrice: 24.5 },
      { id: 1002, title: "Mortise Lock", unitPrice: 42 },
    ]);

    const details = await getNewSalesFormShelfProductDetails(ctx, {
      ids: [1002],
    });
    expect(details).toEqual([
      {
        id: 1002,
        title: "Mortise Lock",
        img: null,
        unitPrice: 42,
        categoryId: 12,
        parentCategoryId: 10,
        categoryPath: [
          { id: 10, name: "Door Hardware" },
          { id: 12, name: "Locks" },
        ],
      },
    ]);
  });

  it("hides shelf products under disabled categories", async () => {
    const { ctx, state } = createMockContext();
    const locks: any = state.shelfCategories.find(
      (category) => category.id === 12,
    );
    locks.deletedAt = new Date("2026-02-24T12:00:00.000Z");

    const products = await getNewSalesFormShelfProducts(ctx, {
      categoryIds: [10, 11, 12],
    });
    expect(products.map((product) => product.id)).toEqual([1001]);

    const index = await getNewSalesFormShelfProductIndex(ctx, {});
    expect(index.map((product) => product.id)).toEqual([1001]);

    const details = await getNewSalesFormShelfProductDetails(ctx, {
      ids: [1001, 1002],
    });
    expect(details.map((product) => product.id)).toEqual([1001]);

    const searched = await searchNewSalesFormShelfProducts(ctx, {
      query: "lock",
      selectedIds: [1002],
      limit: 20,
    });
    expect(searched).toEqual([]);

    locks.deletedAt = null;
    const restored = await getNewSalesFormShelfProductDetails(ctx, {
      ids: [1002],
    });
    expect(restored.map((product) => product.id)).toEqual([1002]);
  });

  it("searches shelf products independently with empty defaults and selected hydration", async () => {
    const { ctx, state } = createMockContext();
    state.shelfProducts.push(
      {
        id: 1004,
        title: "Alpha Pull",
        unitPrice: 15,
        categoryId: 11,
        parentCategoryId: 10,
        deletedAt: null,
      },
      {
        id: 1005,
        title: "Beta Pull",
        unitPrice: 16,
        categoryId: 11,
        parentCategoryId: 10,
        deletedAt: null,
      },
      {
        id: 1006,
        title: "Cabinet Latch",
        unitPrice: 18,
        categoryId: 12,
        parentCategoryId: 10,
        deletedAt: null,
      },
      {
        id: 1007,
        title: "Door Stop",
        unitPrice: 9,
        categoryId: 12,
        parentCategoryId: 10,
        deletedAt: null,
      },
      {
        id: 1008,
        title: "Zeta Rail",
        unitPrice: 20,
        categoryId: 12,
        parentCategoryId: 10,
        deletedAt: null,
      },
      {
        id: 1009,
        title: "Flush Bolt",
        unitPrice: 22,
        categoryId: 12,
        parentCategoryId: 10,
        deletedAt: null,
      },
    );

    const defaultProducts = await searchNewSalesFormShelfProducts(ctx, {
      query: "",
      selectedIds: [],
      limit: 5,
    });
    expect(defaultProducts.map((product) => product.id)).toEqual([
      1004, 1001, 1005, 1006, 1007,
    ]);
    expect(defaultProducts[0]?.categoryPath).toEqual([
      { id: 10, name: "Door Hardware" },
      { id: 11, name: "Hinges" },
    ]);

    const withSelected = await searchNewSalesFormShelfProducts(ctx, {
      query: "",
      selectedIds: [1008],
      limit: 5,
    });
    expect(withSelected.map((product) => product.id)).toContain(1008);
    expect(withSelected.length).toBe(6);

    const searched = await searchNewSalesFormShelfProducts(ctx, {
      query: "flush",
      selectedIds: [],
      limit: 20,
    });
    expect(searched.map((product) => product.id)).toEqual([1009]);
  });

  it("hydrates payment method from legacy sales order meta on edit", async () => {
    const { ctx, state } = createMockContext();

    state.orders.push({
      id: state.ids.order++,
      orderId: "ORD-LEGACY",
      slug: "legacy-payment-method",
      type: "order",
      status: "Draft",
      deletedAt: null,
      createdAt: new Date("2026-02-20T12:00:00.000Z"),
      updatedAt: new Date("2026-02-24T12:00:00.000Z"),
      customerId: 100,
      customerProfileId: null,
      billingAddressId: null,
      shippingAddressId: null,
      paymentTerm: "None",
      paymentDueDate: new Date("2026-02-28T12:00:00.000Z"),
      goodUntil: null,
      prodDueDate: null,
      deliveryOption: "pickup",
      taxPercentage: 0,
      subTotal: 1000,
      tax: 0,
      grandTotal: 1035,
      payments: [],
      meta: {
        payment_option: "Credit Card",
        po: "PO-LEGACY",
      },
    });

    const loaded = await getNewSalesForm(ctx, {
      type: "order",
      slug: "legacy-payment-method",
    });

    expect(loaded.form.paymentMethod).toBe("Credit Card");
    expect(loaded.form.po).toBe("PO-LEGACY");
    expect((loaded.form as any).createdAt).toBe("2026-02-20T12:00:00.000Z");
    expect((loaded.form as any).paymentDueDate).toBe(
      "2026-02-28T12:00:00.000Z",
    );
    expect(loaded.summary.grandTotal).toBeGreaterThan(loaded.summary.subTotal);
  });

  it("writes legacy root metadata and date columns on save", async () => {
    const { ctx, state } = createMockContext();

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
        paymentTerm: "Net 30",
        paymentMethod: "Check",
        createdAt: "2026-02-01T00:00:00.000Z",
        paymentDueDate: "2026-02-02T00:00:00.000Z",
        goodUntil: null,
        prodDueDate: "2026-02-20T00:00:00.000Z",
        po: "PO-NEW",
        notes: null,
        deliveryOption: "delivery",
        taxCode: null,
      },
      summary: { subTotal: 0, taxRate: 0, taxTotal: 0, grandTotal: 0 },
      extraCosts: [
        { id: null, label: "Labor", type: "Labor", amount: 25 },
        { id: null, label: "Delivery", type: "Delivery", amount: 40 },
      ],
      lineItems: [
        {
          id: null,
          uid: "line-legacy-meta",
          title: "Legacy Meta Line",
          description: "",
          qty: 1,
          unitPrice: 200,
          lineTotal: 200,
          meta: {},
          formSteps: [],
          shelfItems: [],
          housePackageTool: null,
        } as any,
      ],
    });

    const row = state.orders[0];
    expect(row?.meta).toMatchObject({
      po: "PO-NEW",
      payment_option: "Check",
      ccc_percentage: 3.5,
      deliveryCost: 40,
      labor_cost: 25,
    });
    expect(row?.createdAt.toISOString()).toBe("2026-02-01T00:00:00.000Z");
    expect(row?.paymentDueDate.toISOString()).toBe("2026-03-03T00:00:00.000Z");
    expect(row?.prodDueDate.toISOString()).toBe("2026-02-20T00:00:00.000Z");
    expect(row?.deliveryOption).toBe("delivery");

    const loaded = await getNewSalesForm(ctx, {
      type: "order",
      slug: saved.slug!,
    });
    expect(loaded.form.po).toBe("PO-NEW");
    expect(loaded.form.paymentMethod).toBe("Check");
    expect((loaded.form as any).createdAt).toBe("2026-02-01T00:00:00.000Z");
    expect((loaded.form as any).paymentDueDate).toBe(
      "2026-03-03T00:00:00.000Z",
    );
    expect((loaded.form as any).prodDueDate).toBe("2026-02-20T00:00:00.000Z");
  });

  it("saves and hydrates formSteps/shelfItems/housePackageTool/doors/molding", async () => {
    const { ctx, state } = createMockContext();

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
    const line = loaded.lineItems[0];

    expect(loaded.lineItems).toHaveLength(1);
    expect(line).toBeTruthy();
    expect(line!.formSteps).toHaveLength(1);
    expect(line!.shelfItems).toHaveLength(1);
    expect(line!.housePackageTool).toBeTruthy();
    expect(line!.housePackageTool?.doors).toHaveLength(1);
    expect(line!.housePackageTool?.moldingId).toBe(501);
    expect(line!.housePackageTool?.molding?.title).toBe("Classic Moulding");
    expect(state.doors[0]).toMatchObject({
      jambSizePrice: 250,
      doorPrice: 0,
      unitPrice: 500,
      lineTotal: 1000,
      totalQty: 2,
    });
    expect(line!.unitPrice).toBe(500);
    expect(line!.lineTotal).toBe(1000);
    expect(loaded.form.paymentMethod).toBe("Credit Card");
    expect(state.orders[0]?.meta?.payment_option).toBe("Credit Card");
    expect(loaded.summary.grandTotal).toBeGreaterThan(loaded.summary.subTotal);
  });

  it("keeps one active legacy shelf row across repeated new-form saves", async () => {
    const { ctx, state } = createMockContext();

    const buildPayload = (overrides: {
      salesId?: number | null;
      slug?: string | null;
      version?: string | null;
      lineId?: number | null;
      shelfId?: number | null;
    }) => ({
      type: "order" as const,
      slug: overrides.slug ?? null,
      salesId: overrides.salesId ?? null,
      version: overrides.version ?? null,
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
      summary: {
        subTotal: 0,
        taxRate: 0,
        taxTotal: 0,
        grandTotal: 0,
      },
      extraCosts: [{ id: null, label: "Labor", type: "Labor", amount: 0 }],
      lineItems: [
        {
          id: overrides.lineId ?? null,
          uid: "shelf-line-a",
          title: "Shelf Items",
          description: "BYPASS HARDWARE (HEAVY DUTY) 6-0",
          qty: 1,
          unitPrice: 87.78,
          lineTotal: 87.78,
          meta: {},
          formSteps: [
            {
              id: null,
              stepId: 1,
              componentId: null,
              prodUid: null,
              value: "Shelf Items",
              qty: 1,
              price: 0,
              basePrice: 0,
              meta: {},
              step: { id: 1, title: "Item Type" },
            },
          ],
          shelfItems: [
            {
              id: overrides.shelfId ?? null,
              categoryId: 10,
              productId: 1001,
              description: "BYPASS HARDWARE (HEAVY DUTY) 6-0",
              qty: 1,
              unitPrice: 87.78,
              totalPrice: 87.78,
              meta: {
                lineUid: "hardware-section",
                itemIndex: 0,
                categoryUid: "10",
              },
            },
          ],
          housePackageTool: null,
        },
      ],
    });

    const first = await saveDraftNewSalesForm(ctx, buildPayload({}));
    const firstItem = state.items.find((row) => row.deletedAt == null)!;
    const firstShelf = state.shelfItems.find((row) => row.deletedAt == null)!;

    const second = await saveDraftNewSalesForm(
      ctx,
      buildPayload({
        salesId: first.salesId,
        slug: first.slug,
        version: first.version,
        lineId: firstItem.id,
        shelfId: firstShelf.id,
      }),
    );
    const secondItem = state.items.find((row) => row.deletedAt == null)!;
    const secondShelf = state.shelfItems.find((row) => row.deletedAt == null)!;

    const third = await saveDraftNewSalesForm(
      ctx,
      buildPayload({
        salesId: second.salesId,
        slug: second.slug,
        version: second.version,
        lineId: secondItem.id,
        shelfId: secondShelf.id,
      }),
    );
    const thirdLoaded = await getNewSalesForm(ctx, {
      type: "order",
      slug: third.slug!,
    });

    expect(thirdLoaded.lineItems).toHaveLength(1);
    expect(thirdLoaded.lineItems[0]?.shelfItems).toHaveLength(1);
    expect(state.shelfItems).toHaveLength(3);
    expect(
      state.shelfItems.filter((row) => row.deletedAt == null),
    ).toHaveLength(1);
    expect(
      state.shelfItems.filter(
        (row) =>
          row.salesOrderItemId === secondItem.id && row.deletedAt == null,
      ),
    ).toHaveLength(1);
    expect(
      state.shelfItems.filter((row) => row.salesOrderItemId === secondItem.id),
    ).toHaveLength(3);
  });

  it("saves HPT door pricing with legacy-compatible door fields", async () => {
    const { ctx, state } = createMockContext();

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
        paymentMethod: "Check",
        goodUntil: null,
        po: null,
        notes: null,
        deliveryOption: "pickup",
        taxCode: null,
      },
      summary: { subTotal: 0, taxRate: 0, taxTotal: 0, grandTotal: 0 },
      extraCosts: [],
      lineItems: [
        {
          id: null,
          uid: "line-hpt-compat",
          title: "Door Package",
          description: "",
          qty: 1,
          unitPrice: 0,
          lineTotal: 0,
          meta: {},
          formSteps: [
            { stepId: 1, price: 20, step: { id: 1, title: "Specie" } },
            { stepId: 2, step: { id: 2, title: "Door" } },
            { stepId: 3, step: { id: 3, title: "House Package Tool" } },
          ],
          shelfItems: [],
          housePackageTool: {
            id: null,
            doorType: "Interior",
            totalPrice: 0,
            totalDoors: 0,
            meta: {},
            doors: [
              {
                id: null,
                dimension: "2-8 x 6-8",
                lhQty: 1,
                rhQty: 1,
                totalQty: 2,
                addon: 5,
                meta: {
                  baseUnitPrice: 111,
                },
              },
            ],
          },
        } as any,
      ],
    });

    const door = state.doors[0];
    expect(door).toMatchObject({
      jambSizePrice: 111,
      doorPrice: 5,
      unitPrice: 136,
      lineTotal: 272,
      totalQty: 2,
    });
    expect(door.meta).toMatchObject({
      baseUnitPrice: 111,
      doorSalesUnitPrice: 111,
      sharedDoorSurcharge: 20,
      overridePrice: null,
    });
    expect(state.items[0]).toMatchObject({
      qty: 2,
      rate: 136,
      total: 272,
    });

    const loaded = await getNewSalesForm(ctx, {
      type: "order",
      slug: saved.slug!,
    });
    expect(loaded.lineItems[0]?.housePackageTool?.doors?.[0]).toMatchObject({
      jambSizePrice: 111,
      doorPrice: 5,
      unitPrice: 136,
      lineTotal: 272,
    });
    expect(loaded.lineItems[0]?.unitPrice).toBe(136);
    expect(loaded.lineItems[0]?.lineTotal).toBe(272);
  });

  it("updates existing HPT sales item, tool, and door ids on re-save", async () => {
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
        paymentMethod: "Check",
        goodUntil: null,
        po: null,
        notes: null,
        deliveryOption: "pickup",
        taxCode: null,
      },
      summary: { subTotal: 0, taxRate: 0, taxTotal: 0, grandTotal: 0 },
      extraCosts: [],
      lineItems: [
        {
          id: null,
          uid: "line-hpt-id-preserve",
          title: "Door Package",
          description: "",
          qty: 1,
          unitPrice: 0,
          lineTotal: 0,
          meta: {},
          formSteps: [
            { stepId: 1, price: 20, step: { id: 1, title: "Specie" } },
            { stepId: 2, step: { id: 2, title: "Door" } },
            { stepId: 3, step: { id: 3, title: "House Package Tool" } },
          ],
          shelfItems: [],
          housePackageTool: {
            id: null,
            doorType: "Interior",
            totalPrice: 0,
            totalDoors: 0,
            meta: {},
            doors: [
              {
                id: null,
                dimension: "2-8 x 6-8",
                lhQty: 1,
                rhQty: 1,
                totalQty: 2,
                addon: 5,
                meta: {
                  baseUnitPrice: 111,
                },
              },
            ],
          },
        } as any,
      ],
    });

    const itemId = state.items[0].id;
    const hptId = state.hpts[0].id;
    const doorId = state.doors[0].id;

    await saveDraftNewSalesForm(ctx, {
      type: "order",
      slug: first.slug!,
      salesId: first.salesId!,
      version: first.version,
      autosave: false,
      meta: {
        customerId: 100,
        customerProfileId: null,
        billingAddressId: null,
        shippingAddressId: null,
        paymentTerm: "None",
        paymentMethod: "Check",
        goodUntil: null,
        po: null,
        notes: null,
        deliveryOption: "pickup",
        taxCode: null,
      },
      summary: { subTotal: 0, taxRate: 0, taxTotal: 0, grandTotal: 0 },
      extraCosts: [],
      lineItems: [
        {
          id: itemId,
          uid: "line-hpt-id-preserve",
          title: "Door Package",
          description: "",
          qty: 2,
          unitPrice: 136,
          lineTotal: 272,
          meta: {},
          formSteps: [
            { stepId: 1, price: 20, step: { id: 1, title: "Specie" } },
            { stepId: 2, step: { id: 2, title: "Door" } },
            { stepId: 3, step: { id: 3, title: "House Package Tool" } },
          ],
          shelfItems: [],
          housePackageTool: {
            id: hptId,
            doorType: "Interior",
            totalPrice: 272,
            totalDoors: 2,
            meta: {},
            doors: [
              {
                id: doorId,
                dimension: "2-8 x 6-8",
                lhQty: 2,
                rhQty: 1,
                totalQty: 3,
                addon: 5,
                meta: {
                  baseUnitPrice: 111,
                },
              },
            ],
          },
        } as any,
      ],
    });

    expect(state.items.map((row) => row.id)).toEqual([itemId]);
    expect(state.hpts.map((row) => row.id)).toEqual([hptId]);
    expect(state.doors.map((row) => row.id)).toEqual([doorId]);
    expect(state.items[0]).toMatchObject({
      id: itemId,
      deletedAt: null,
      qty: 3,
      rate: 136,
      total: 408,
    });
    expect(state.hpts[0]).toMatchObject({
      id: hptId,
      deletedAt: null,
      totalDoors: 3,
      totalPrice: 408,
    });
    expect(state.doors[0]).toMatchObject({
      id: doorId,
      deletedAt: null,
      jambSizePrice: 111,
      doorPrice: 5,
      unitPrice: 136,
      lineTotal: 408,
      totalQty: 3,
    });
  });

  it("hydrates legacy-edited HPT rows over stale new-form metadata", async () => {
    const { ctx, state } = createMockContext();

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
        paymentMethod: "Check",
        goodUntil: null,
        po: null,
        notes: null,
        deliveryOption: "pickup",
        taxCode: null,
      },
      summary: { subTotal: 0, taxRate: 0, taxTotal: 0, grandTotal: 0 },
      extraCosts: [],
      lineItems: [
        {
          id: null,
          uid: "line-hpt-stale-meta",
          title: "Door Package",
          description: "",
          qty: 1,
          unitPrice: 0,
          lineTotal: 0,
          meta: {},
          formSteps: [
            { stepId: 1, price: 20, step: { id: 1, title: "Specie" } },
            { stepId: 2, step: { id: 2, title: "Door" } },
            { stepId: 3, step: { id: 3, title: "House Package Tool" } },
          ],
          shelfItems: [],
          housePackageTool: {
            id: null,
            doorType: "Interior",
            totalPrice: 0,
            totalDoors: 0,
            meta: {},
            doors: [
              {
                id: null,
                dimension: "2-8 x 6-8",
                lhQty: 1,
                rhQty: 1,
                totalQty: 2,
                addon: 5,
                meta: {
                  baseUnitPrice: 111,
                },
              },
            ],
          },
        } as any,
      ],
    });

    const staleDoor =
      state.orders[0].meta.newSalesForm.lineItems[0].housePackageTool.doors[0];
    Object.assign(staleDoor, {
      jambSizePrice: 999,
      doorPrice: 99,
      addon: 99,
      unitPrice: 1118,
      lineTotal: 2236,
      totalQty: 2,
      meta: {
        doorSalesUnitPrice: 999,
        addon: 99,
      },
    });
    Object.assign(state.items[0], {
      qty: 3,
      rate: 136,
      total: 408,
    });
    Object.assign(state.hpts[0], {
      totalDoors: 3,
      totalPrice: 408,
    });
    Object.assign(state.doors[0], {
      jambSizePrice: 111,
      doorPrice: 5,
      addon: undefined,
      unitPrice: 136,
      lineTotal: 408,
      lhQty: 2,
      rhQty: 1,
      totalQty: 3,
      meta: {},
    });

    const loaded = await getNewSalesForm(ctx, {
      type: "order",
      slug: saved.slug!,
    });
    const door = loaded.lineItems[0]?.housePackageTool?.doors?.[0];

    expect(loaded.lineItems[0]).toMatchObject({
      qty: 3,
      unitPrice: 136,
      lineTotal: 408,
    });
    expect(door).toMatchObject({
      jambSizePrice: 111,
      doorPrice: 5,
      addon: 5,
      unitPrice: 136,
      lineTotal: 408,
      totalQty: 3,
    });
    expect(door?.meta).toMatchObject({
      doorSalesUnitPrice: 111,
      sharedDoorSurcharge: 20,
    });
  });

  it("saves multiple quote drafts independently and hydrates each quote by slug", async () => {
    const { ctx } = createMockContext();

    const simpleQuote = await saveDraftNewSalesForm(ctx, {
      type: "quote",
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
        paymentMethod: "Check",
        goodUntil: "2026-03-10T00:00:00.000Z",
        po: "QUOTE-SIMPLE",
        notes: "Simple quote",
        deliveryOption: "pickup",
        taxCode: null,
      },
      summary: { subTotal: 0, taxRate: 0, taxTotal: 0, grandTotal: 0 },
      extraCosts: [],
      lineItems: [
        {
          id: null,
          uid: "quote-simple-line",
          title: "Simple Quote Line",
          description: "Simple quote item",
          qty: 2,
          unitPrice: 60,
          lineTotal: 120,
          meta: {},
          formSteps: [],
          shelfItems: [],
          housePackageTool: null,
        } as any,
      ],
    });

    const hptQuote = await saveDraftNewSalesForm(ctx, {
      type: "quote",
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
        goodUntil: "2026-03-15T00:00:00.000Z",
        po: "QUOTE-HPT",
        notes: "Door quote",
        deliveryOption: "delivery",
        taxCode: null,
      },
      summary: { subTotal: 0, taxRate: 0, taxTotal: 0, grandTotal: 0 },
      extraCosts: [],
      lineItems: [
        {
          id: null,
          uid: "quote-hpt-line",
          title: "HPT Quote Line",
          description: "Door package quote",
          qty: 1,
          unitPrice: 0,
          lineTotal: 0,
          meta: {},
          formSteps: [
            { stepId: 1, price: 25, step: { id: 1, title: "Specie" } },
            { stepId: 2, step: { id: 2, title: "Door" } },
            { stepId: 3, step: { id: 3, title: "House Package Tool" } },
          ],
          shelfItems: [],
          housePackageTool: {
            id: null,
            doorType: "Interior",
            totalPrice: 0,
            totalDoors: 0,
            meta: {},
            doors: [
              {
                id: null,
                dimension: "2-8 x 6-8",
                lhQty: 2,
                rhQty: 1,
                totalQty: 3,
                addon: 10,
                meta: {
                  baseUnitPrice: 140,
                },
              },
            ],
          },
        } as any,
      ],
    });

    const taxedQuote = await saveDraftNewSalesForm(ctx, {
      type: "quote",
      slug: null,
      salesId: null,
      version: null,
      autosave: false,
      meta: {
        customerId: 100,
        customerProfileId: 7,
        billingAddressId: null,
        shippingAddressId: null,
        paymentTerm: "None",
        paymentMethod: "Check",
        goodUntil: "2026-03-20T00:00:00.000Z",
        po: "QUOTE-TAXED",
        notes: "Taxed quote",
        deliveryOption: "pickup",
        taxCode: "GST",
      },
      summary: { subTotal: 0, taxRate: 8, taxTotal: 0, grandTotal: 0 },
      extraCosts: [
        {
          id: null,
          label: "Delivery",
          type: "Delivery",
          amount: 30,
          taxxable: true,
        },
      ],
      lineItems: [
        {
          id: null,
          uid: "quote-taxed-line",
          title: "Taxed Quote Line",
          description: "Taxed quote item",
          qty: 1,
          unitPrice: 200,
          lineTotal: 200,
          meta: {},
          formSteps: [],
          shelfItems: [],
          housePackageTool: null,
        } as any,
      ],
    });

    const savedQuotes = [simpleQuote, hptQuote, taxedQuote];
    expect(new Set(savedQuotes.map((quote) => quote.salesId)).size).toBe(3);
    expect(new Set(savedQuotes.map((quote) => quote.orderId)).size).toBe(3);
    expect(new Set(savedQuotes.map((quote) => quote.slug)).size).toBe(3);
    for (const quote of savedQuotes) {
      expect(quote.type).toBe("quote");
      expect(quote.slug?.startsWith("quote-")).toBe(true);
    }

    const loadedQuotes = await Promise.all(
      savedQuotes.map((quote) =>
        getNewSalesForm(ctx, {
          type: "quote",
          slug: quote.slug!,
        }),
      ),
    );

    expect(loadedQuotes.map((quote) => quote.lineItems[0]?.title)).toEqual([
      "Simple Quote Line",
      "HPT Quote Line",
      "Taxed Quote Line",
    ]);
    expect(loadedQuotes.map((quote) => quote.form.po)).toEqual([
      "QUOTE-SIMPLE",
      "QUOTE-HPT",
      "QUOTE-TAXED",
    ]);
    expect(loadedQuotes[0]?.summary.subTotal).toBe(120);
    expect(loadedQuotes[0]?.lineItems[0]?.housePackageTool).toBeNull();
    expect(loadedQuotes[1]?.lineItems[0]?.housePackageTool?.doors).toHaveLength(
      1,
    );
    expect(loadedQuotes[1]?.summary.grandTotal).toBeGreaterThan(
      loadedQuotes[1]?.summary.subTotal || 0,
    );
    expect(loadedQuotes[2]?.extraCosts).toHaveLength(1);
    expect(loadedQuotes[2]?.extraCosts[0]).toMatchObject({
      label: "Delivery",
      amount: 30,
      taxxable: true,
    });
    expect(loadedQuotes[2]?.summary.taxRate).toBe(8);
    expect(loadedQuotes[2]?.summary.taxTotal).toBeGreaterThan(0);
    expect(
      loadedQuotes[0]?.lineItems.some(
        (line) => line.title === "Taxed Quote Line",
      ),
    ).toBe(false);
    expect(
      loadedQuotes[2]?.lineItems.some(
        (line) => line.title === "HPT Quote Line",
      ),
    ).toBe(false);
  });

  it("persists quote saves with legacy-compatible relational rows", async () => {
    const { ctx, state } = createMockContext();

    const saved = await saveDraftNewSalesForm(ctx, {
      type: "quote",
      slug: null,
      salesId: null,
      version: null,
      autosave: false,
      meta: {
        customerId: 100,
        customerProfileId: 7,
        billingAddressId: null,
        shippingAddressId: null,
        paymentTerm: "None",
        paymentMethod: "Check",
        goodUntil: "2026-04-01T00:00:00.000Z",
        po: "LEGACY-COMPARE",
        notes: "Legacy comparison quote",
        deliveryOption: "delivery",
        taxCode: "GST",
      },
      summary: { subTotal: 0, taxRate: 10, taxTotal: 0, grandTotal: 0 },
      extraCosts: [
        {
          id: null,
          label: "Labor",
          type: "Labor",
          amount: 15,
          taxxable: false,
        },
        {
          id: null,
          label: "Delivery",
          type: "Delivery",
          amount: 25,
          taxxable: true,
        },
      ],
      lineItems: [
        {
          id: null,
          uid: "legacy-compare-line",
          title: "Legacy Comparable Door",
          description: "Legacy-compatible persisted quote",
          qty: 1,
          unitPrice: 300,
          lineTotal: 300,
          meta: {},
          formSteps: [
            {
              id: null,
              stepId: 10,
              componentId: 1000,
              prodUid: "legacy-prod-1000",
              value: "Oak",
              qty: 1,
              price: 75,
              basePrice: 50,
              meta: { source: "comparison-fixture" },
              step: { id: 10, title: "Specie" },
            },
          ],
          shelfItems: [
            {
              id: null,
              categoryId: 11,
              productId: 1001,
              description: "Ball Bearing Hinge",
              qty: 2,
              unitPrice: 24.5,
              totalPrice: 49,
              meta: {
                source: "comparison-fixture",
                categoryIds: [10, 11],
                sectionUid: "shelf-section-a",
                productRowUid: "shelf-row-a",
              },
            },
          ],
          housePackageTool: {
            id: null,
            doorType: "Interior",
            dykeDoorId: 200,
            stepProductId: 1000,
            totalPrice: 300,
            totalDoors: 2,
            meta: { source: "comparison-fixture" },
            doors: [
              {
                id: null,
                dimension: "3-0 x 6-8",
                swing: "RH",
                doorType: "Interior",
                unitPrice: 150,
                lhQty: 0,
                rhQty: 2,
                totalQty: 2,
                lineTotal: 300,
                meta: { source: "comparison-fixture" },
              },
            ],
          },
        } as any,
      ],
    });

    const order = state.orders[0];
    expect(order).toMatchObject({
      id: saved.salesId,
      slug: saved.slug,
      orderId: saved.orderId,
      type: "quote",
      status: "Draft",
      isDyke: true,
      customerId: 100,
      customerProfileId: 7,
      deliveryOption: "delivery",
      inventoryStatus: null,
      taxPercentage: saved.summary.taxRate,
      subTotal: saved.summary.subTotal,
      tax: saved.summary.taxTotal,
      grandTotal: saved.summary.grandTotal,
      amountDue: saved.summary.grandTotal,
    });
    expect(order.meta).toMatchObject({
      po: "LEGACY-COMPARE",
      payment_option: "Check",
      deliveryCost: 25,
      labor_cost: 15,
    });

    expect(state.items).toHaveLength(1);
    const item = state.items[0];
    expect(item).toMatchObject({
      salesOrderId: saved.salesId,
      dykeDescription: "Legacy Comparable Door",
      description: "Legacy-compatible persisted quote",
      qty: 2,
      rate: 150,
      total: 300,
      deletedAt: null,
    });

    expect(state.stepForms).toHaveLength(1);
    expect(state.stepForms[0]).toMatchObject({
      salesId: saved.salesId,
      salesItemId: item.id,
      stepId: 10,
      componentId: 1000,
      prodUid: "legacy-prod-1000",
      value: "Oak",
      qty: 1,
      price: 75,
      basePrice: 50,
    });

    expect(state.shelfItems).toHaveLength(1);
    expect(state.shelfItems[0]).toMatchObject({
      salesOrderItemId: item.id,
      categoryId: 11,
      productId: 1001,
      description: "Ball Bearing Hinge",
      qty: 2,
      unitPrice: 25,
      totalPrice: 49,
      meta: {
        categoryIds: [10, 11],
        categoryUid: "10-11",
        lineUid: "shelf-section-a",
        productUid: "shelf-row-a",
        itemIndex: 0,
      },
    });

    expect(state.hpts).toHaveLength(1);
    expect(state.hpts[0]).toMatchObject({
      salesOrderId: saved.salesId,
      orderItemId: item.id,
      doorType: "Interior",
      dykeDoorId: 200,
      stepProductId: 1000,
      totalPrice: 300,
      totalDoors: 2,
      deletedAt: null,
    });

    expect(state.doors).toHaveLength(1);
    expect(state.doors[0]).toMatchObject({
      housePackageToolId: state.hpts[0].id,
      salesOrderId: saved.salesId,
      salesOrderItemId: item.id,
      dimension: "3-0 x 6-8",
      swing: "RH",
      doorType: "Interior",
      unitPrice: 150,
      rhQty: 2,
      totalQty: 2,
      lineTotal: 300,
      deletedAt: null,
    });

    expect(state.extraCosts).toHaveLength(2);
    expect(
      state.extraCosts.find((cost) => cost.type === "Labor"),
    ).toMatchObject({
      orderId: saved.salesId,
      label: "Labor",
      amount: 15,
      taxxable: false,
    });
    expect(
      state.extraCosts.find((cost) => cost.type === "Delivery"),
    ).toMatchObject({
      orderId: saved.salesId,
      label: "Delivery",
      amount: 25,
      taxxable: true,
    });

    expect(state.salesTaxes).toHaveLength(1);
    expect(state.salesTaxes[0]).toMatchObject({
      salesId: saved.salesId,
      taxCode: "GST",
      taxxable: saved.summary.taxableSubTotal,
      tax: saved.summary.taxTotal,
    });

    const loaded = await getNewSalesForm(ctx, {
      type: "quote",
      slug: saved.slug!,
    });
    expect(loaded.lineItems[0]).toMatchObject({
      title: "Legacy Comparable Door",
      qty: 2,
      unitPrice: 150,
      lineTotal: 300,
    });
    expect(loaded.lineItems[0]?.formSteps).toHaveLength(1);
    expect(loaded.lineItems[0]?.shelfItems).toHaveLength(1);
    expect(loaded.lineItems[0]?.housePackageTool?.doors).toHaveLength(1);
    expect(loaded.summary.grandTotal).toBe(saved.summary.grandTotal);
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
            doors: [
              { dimension: '2-6 x 6-8"', lhQty: 1, rhQty: 0, totalQty: 1 },
            ],
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
    const line = loaded.lineItems[0];
    expect(loaded.lineItems).toHaveLength(1);
    expect(line).toBeTruthy();
    expect(line!.title).toBe("Line B");
    expect(line!.formSteps[0]?.stepId).toBe(2);
  });

  it("uses legacy-style order id generation and persists relational sales tax rows", async () => {
    const { ctx, state } = createMockContext();

    const createPayload = {
      type: "order",
      slug: null,
      salesId: null,
      version: null,
      autosave: false,
      meta: {
        customerId: 100,
        customerProfileId: 7,
        billingAddressId: null,
        shippingAddressId: null,
        paymentTerm: "None",
        goodUntil: null,
        po: null,
        notes: null,
        deliveryOption: "pickup",
        paymentMethod: "Credit Card",
        taxCode: "GST",
      },
      summary: { subTotal: 0, taxRate: 7.5, taxTotal: 0, grandTotal: 0 },
      extraCosts: [],
      lineItems: [
        {
          id: null,
          uid: "line-taxed",
          title: "Taxed Line",
          description: "",
          qty: 1,
          unitPrice: 100,
          lineTotal: 100,
          meta: {},
          formSteps: [],
          shelfItems: [],
          housePackageTool: null,
        } as any,
      ],
      orderId: "00001DPP",
    } as any;
    const saved = await saveDraftNewSalesForm(ctx, createPayload);

    expect(saved.orderId).toBe("00000AL");
    expect(saved.slug).toBe("order-00000al");
    expect(saved.orderId.endsWith("DPP")).toBe(false);
    expect(state.salesTaxes).toHaveLength(1);
    expect(state.salesTaxes[0]).toMatchObject({
      salesId: saved.salesId,
      taxCode: "GST",
      taxxable: 100,
      tax: 7.5,
    });
    expect(state.orders[0]?.customerProfileId).toBe(7);
    expect(state.orders[0]?.taxPercentage).toBe(7.5);
    expect(state.orders[0]?.amountDue).toBe(saved.summary.grandTotal);

    const loaded = await getNewSalesForm(ctx, {
      type: "order",
      slug: saved.slug!,
    });
    expect(loaded.form.customerProfileId).toBe(7);
    expect((loaded.form as any).taxCode).toBe("GST");
    expect(loaded.summary.taxRate).toBe(7.5);
    expect(loaded.summary.taxTotal).toBe(7.5);

    const autosaved = await saveDraftNewSalesForm(ctx, {
      ...createPayload,
      slug: saved.slug,
      salesId: saved.salesId,
      version: saved.version,
      autosave: true,
      orderId: "99999DPP",
    } as any);
    expect(autosaved.orderId).toBe(saved.orderId);
    expect(state.orders[0]?.orderId).toBe(saved.orderId);

    const finalized = await saveFinalNewSalesForm(ctx, {
      ...createPayload,
      slug: saved.slug,
      salesId: saved.salesId,
      version: autosaved.version,
      autosave: false,
      orderId: "11111DPP",
    } as any);
    expect(finalized.orderId).toBe(saved.orderId);
    expect(state.orders[0]?.orderId).toBe(saved.orderId);
  });
});

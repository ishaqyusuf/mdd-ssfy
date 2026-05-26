import { describe, expect, it } from "bun:test";
import {
  createShelfProduct,
  listShelfCategories,
  listShelfProducts,
  toggleShelfCategory,
  toggleShelfProduct,
  updateShelfProduct,
} from "./sales-shelf-item";

function pickSelected(row: any, select?: Record<string, boolean>) {
  if (!select) return row;
  const picked: Record<string, unknown> = {};
  Object.keys(select).forEach((key) => {
    if (select[key]) picked[key] = row[key];
  });
  return picked;
}

function createMockContext() {
  const state = {
    categories: [
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
    ] as any[],
    products: [
      {
        id: 1001,
        title: "Ball Bearing Hinge",
        unitPrice: 24.5,
        categoryId: 11,
        parentCategoryId: 10,
        img: "hinge.png",
        deletedAt: null,
      },
      {
        id: 1002,
        title: "Mortise Lock",
        unitPrice: 42,
        categoryId: 12,
        parentCategoryId: 10,
        img: null,
        deletedAt: null,
      },
      {
        id: 1003,
        title: "Archived Product",
        unitPrice: 5,
        categoryId: 11,
        parentCategoryId: 10,
        img: null,
        deletedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ] as any[],
    nextProductId: 1004,
  };
  const db = {
    dykeShelfCategories: {
      findMany: async ({ where, select, orderBy }: any = {}) => {
        const rows = state.categories.filter((row) => {
          if (where?.deletedAt === null && row.deletedAt != null) return false;
          if (where?.id?.in && !where.id.in.includes(row.id)) return false;
          return true;
        });
        const sorted = [...rows].sort((a, b) => {
          for (const order of orderBy || []) {
            const [key, dir] = Object.entries(order)[0] as [string, any];
            const av = String(a[key] ?? "");
            const bv = String(b[key] ?? "");
            if (av === bv) continue;
            return dir === "desc" ? (av < bv ? 1 : -1) : av > bv ? 1 : -1;
          }
          return 0;
        });
        return sorted.map((row) => pickSelected(row, select));
      },
      findFirst: async ({ where, select }: any) => {
        const row = state.categories.find(
          (category) => category.id === where?.id,
        );
        return row ? pickSelected(row, select) : null;
      },
      update: async ({ where, data }: any) => {
        const row = state.categories.find(
          (category) => category.id === where.id,
        );
        Object.assign(row, data);
        return row;
      },
    },
    dykeShelfProducts: {
      findMany: async ({ where, select, orderBy }: any = {}) => {
        const inCategoryIds = where?.OR?.[0]?.categoryId?.in || [];
        const inParentCategoryIds = where?.OR?.[1]?.parentCategoryId?.in || [];
        const titleContains = String(where?.title?.contains || "")
          .trim()
          .toLowerCase();
        const rows = state.products.filter((row) => {
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
            const av = String(a[key] ?? "");
            const bv = String(b[key] ?? "");
            if (av === bv) continue;
            return dir === "desc" ? (av < bv ? 1 : -1) : av > bv ? 1 : -1;
          }
          return 0;
        });
        return sorted.map((row) => pickSelected(row, select));
      },
      create: async ({ data }: any) => {
        const row = { id: state.nextProductId++, ...data };
        state.products.push(row);
        return row;
      },
      update: async ({ where, data }: any) => {
        const row = state.products.find((product) => product.id === where.id);
        Object.assign(row, data);
        return row;
      },
    },
  };
  return {
    ctx: { db } as any,
    state,
  };
}

describe("sales shelf item manager queries", () => {
  it("lists active and disabled products using effective category visibility", async () => {
    const { ctx, state } = createMockContext();
    state.categories.find((category) => category.id === 12).deletedAt =
      new Date("2026-02-24T12:00:00.000Z");

    const active = await listShelfProducts(ctx, {
      query: "",
      categoryId: null,
      status: "active",
      page: 1,
      limit: 50,
    });
    expect(active.data.map((product) => product.id)).toEqual([1001]);

    const disabled = await listShelfProducts(ctx, {
      query: "",
      categoryId: null,
      status: "disabled",
      page: 1,
      limit: 50,
    });
    expect(disabled.data.map((product) => product.id)).toEqual([1003, 1002]);
    expect(disabled.data.find((product) => product.id === 1002)?.active).toBe(
      true,
    );
    expect(
      disabled.data.find((product) => product.id === 1002)?.effectiveActive,
    ).toBe(false);
  });

  it("creates and updates shelf product details", async () => {
    const { ctx } = createMockContext();

    const created = await createShelfProduct(ctx, {
      title: "Flush Bolt",
      unitPrice: 22,
      categoryId: 12,
      parentCategoryId: null,
      img: "flush.png",
      enabled: true,
    });
    expect(created).toMatchObject({
      title: "Flush Bolt",
      unitPrice: 22,
      categoryId: 12,
      parentCategoryId: 10,
      img: "flush.png",
      deletedAt: null,
    });

    const updated = await updateShelfProduct(ctx, {
      id: created.id,
      title: "Flush Bolt XL",
      unitPrice: 25.5,
      categoryId: 11,
      parentCategoryId: null,
      img: "flush-xl.png",
      enabled: false,
    });
    expect(updated).toMatchObject({
      title: "Flush Bolt XL",
      unitPrice: 25.5,
      categoryId: 11,
      parentCategoryId: 10,
      img: "flush-xl.png",
    });
    expect(updated.deletedAt).toBeInstanceOf(Date);
  });

  it("toggles product and category visibility without cascading products", async () => {
    const { ctx, state } = createMockContext();

    await toggleShelfProduct(ctx, { id: 1001, enabled: false });
    expect(
      state.products.find((product) => product.id === 1001).deletedAt,
    ).toBeInstanceOf(Date);

    await toggleShelfProduct(ctx, { id: 1001, enabled: true });
    expect(
      state.products.find((product) => product.id === 1001).deletedAt,
    ).toBeNull();

    await toggleShelfCategory(ctx, { id: 11, enabled: false });
    expect(
      state.categories.find((category) => category.id === 11).deletedAt,
    ).toBeInstanceOf(Date);
    expect(
      state.products.find((product) => product.id === 1001).deletedAt,
    ).toBeNull();

    const categories = await listShelfCategories(ctx, {});
    expect(categories.find((category) => category.id === 11)?.active).toBe(
      false,
    );
  });
});

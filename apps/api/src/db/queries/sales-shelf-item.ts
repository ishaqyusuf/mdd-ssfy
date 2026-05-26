import type { TRPCContext } from "@api/trpc/init";
import {
  listShelfCategoriesSchema,
  listShelfProductsSchema,
  shelfProductFormSchema,
  toggleShelfCategorySchema,
  toggleShelfProductSchema,
  updateShelfProductSchema,
  type ListShelfCategoriesSchema,
  type ListShelfProductsSchema,
  type ShelfProductFormSchema,
  type ToggleShelfCategorySchema,
  type ToggleShelfProductSchema,
  type UpdateShelfProductSchema,
} from "@api/schemas/sales-shelf-item";

type ShelfCategoryRow = {
  id: number;
  name: string;
  type: string;
  categoryId: number | null;
  parentCategoryId: number | null;
  deletedAt?: Date | null;
};

type ShelfProductRow = {
  id: number;
  title: string;
  unitPrice: number | null;
  categoryId: number | null;
  parentCategoryId: number | null;
  img: string | null;
  deletedAt?: Date | null;
};

function uniquePositiveNumbers(values: Array<unknown>) {
  return values
    .map((value) => Number(value || 0))
    .filter((value, index, list) => value > 0 && list.indexOf(value) === index);
}

function categoryPathForProduct(
  product: Pick<ShelfProductRow, "categoryId" | "parentCategoryId">,
  categories: ShelfCategoryRow[],
) {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const child = byId.get(Number(product.categoryId || 0));
  const parentId =
    Number(product.parentCategoryId || 0) ||
    Number(child?.parentCategoryId || 0) ||
    Number(child?.categoryId || 0) ||
    0;
  return [byId.get(parentId), child]
    .filter(
      (category, index, list) =>
        category &&
        category.id > 0 &&
        list.findIndex((entry) => entry?.id === category.id) === index,
    )
    .map((category) => ({
      id: category!.id,
      name: category!.name,
      active: category!.deletedAt == null,
    }));
}

function productVisibility(
  product: ShelfProductRow,
  categories: ShelfCategoryRow[],
) {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const category = byId.get(Number(product.categoryId || 0));
  const parentCategory = byId.get(Number(product.parentCategoryId || 0));
  const productActive = product.deletedAt == null;
  const categoryActive = !category || category.deletedAt == null;
  const parentCategoryActive =
    !parentCategory || parentCategory.deletedAt == null;
  return {
    productActive,
    categoryActive,
    effectiveActive: productActive && categoryActive && parentCategoryActive,
  };
}

async function listAllShelfCategories(ctx: TRPCContext) {
  return ctx.db.dykeShelfCategories.findMany({
    select: {
      id: true,
      name: true,
      type: true,
      categoryId: true,
      parentCategoryId: true,
      deletedAt: true,
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  }) as Promise<ShelfCategoryRow[]>;
}

async function resolveParentCategoryId(
  ctx: TRPCContext,
  input: Pick<ShelfProductFormSchema, "categoryId" | "parentCategoryId">,
) {
  if (input.parentCategoryId) return input.parentCategoryId;
  if (!input.categoryId) return null;
  const category = await ctx.db.dykeShelfCategories.findFirst({
    where: {
      id: input.categoryId,
    },
    select: {
      categoryId: true,
      parentCategoryId: true,
    },
  });
  return (
    Number(category?.parentCategoryId || 0) ||
    Number(category?.categoryId || 0) ||
    null
  );
}

function normalizeProductData(input: ShelfProductFormSchema) {
  return {
    title: input.title,
    unitPrice: input.unitPrice == null ? null : Number(input.unitPrice),
    categoryId: input.categoryId || null,
    parentCategoryId: input.parentCategoryId || null,
    img: input.img?.trim() || null,
  };
}

export async function listShelfCategories(
  ctx: TRPCContext,
  input: ListShelfCategoriesSchema,
) {
  listShelfCategoriesSchema.parse(input);
  const categories = await listAllShelfCategories(ctx);
  return categories.map((category) => ({
    ...category,
    active: category.deletedAt == null,
  }));
}

export async function listShelfProducts(
  ctx: TRPCContext,
  input: ListShelfProductsSchema,
) {
  const payload = listShelfProductsSchema.parse(input);
  const categories = await listAllShelfCategories(ctx);
  const categoryIds = payload.categoryId
    ? uniquePositiveNumbers([payload.categoryId])
    : [];
  const products = (await ctx.db.dykeShelfProducts.findMany({
    where: {
      ...(payload.query
        ? {
            title: {
              contains: payload.query,
            },
          }
        : {}),
      ...(categoryIds.length
        ? {
            OR: [
              {
                categoryId: {
                  in: categoryIds,
                },
              },
              {
                parentCategoryId: {
                  in: categoryIds,
                },
              },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      title: true,
      unitPrice: true,
      categoryId: true,
      parentCategoryId: true,
      img: true,
      deletedAt: true,
    },
    orderBy: [{ title: "asc" }],
  })) as ShelfProductRow[];
  const filtered = products.filter((product) => {
    const visibility = productVisibility(product, categories);
    if (payload.status === "active") return visibility.effectiveActive;
    if (payload.status === "disabled") return !visibility.effectiveActive;
    return true;
  });
  const start = (payload.page - 1) * payload.limit;
  const pageItems = filtered.slice(start, start + payload.limit);
  return {
    data: pageItems.map((product) => {
      const visibility = productVisibility(product, categories);
      return {
        ...product,
        active: visibility.productActive,
        effectiveActive: visibility.effectiveActive,
        categoryActive: visibility.categoryActive,
        categoryPath: categoryPathForProduct(product, categories),
      };
    }),
    page: payload.page,
    limit: payload.limit,
    total: filtered.length,
    hasNextPage: start + payload.limit < filtered.length,
  };
}

export async function createShelfProduct(
  ctx: TRPCContext,
  input: ShelfProductFormSchema,
) {
  const payload = shelfProductFormSchema.parse(input);
  const parentCategoryId = await resolveParentCategoryId(ctx, payload);
  const product = await ctx.db.dykeShelfProducts.create({
    data: {
      ...normalizeProductData({
        ...payload,
        parentCategoryId,
      }),
      deletedAt: payload.enabled ? null : new Date(),
    },
  });
  return product;
}

export async function updateShelfProduct(
  ctx: TRPCContext,
  input: UpdateShelfProductSchema,
) {
  const payload = updateShelfProductSchema.parse(input);
  const parentCategoryId = await resolveParentCategoryId(ctx, payload);
  const product = await ctx.db.dykeShelfProducts.update({
    where: {
      id: payload.id,
    },
    data: {
      ...normalizeProductData({
        ...payload,
        parentCategoryId,
      }),
      deletedAt: payload.enabled ? null : new Date(),
    },
  });
  return product;
}

export async function toggleShelfProduct(
  ctx: TRPCContext,
  input: ToggleShelfProductSchema,
) {
  const payload = toggleShelfProductSchema.parse(input);
  return ctx.db.dykeShelfProducts.update({
    where: {
      id: payload.id,
    },
    data: {
      deletedAt: payload.enabled ? null : new Date(),
    },
  });
}

export async function toggleShelfCategory(
  ctx: TRPCContext,
  input: ToggleShelfCategorySchema,
) {
  const payload = toggleShelfCategorySchema.parse(input);
  return ctx.db.dykeShelfCategories.update({
    where: {
      id: payload.id,
    },
    data: {
      deletedAt: payload.enabled ? null : new Date(),
    },
  });
}

import { Db, Prisma } from "@gnd/db";
import { imageUrl, slugify, uniqueList } from "@gnd/utils";
import { composeQuery, composeQueryData } from "@gnd/utils/query-response";
import { paginationSchema } from "@gnd/utils/schema";
import { z } from "zod";
import { inventoryVariantStockForm } from "./inventory";

export const productSearchSchema = z
  .object({
    query: z.string().optional().nullable(),
    categoryId: z.number().optional().nullable(),
    categorySlug: z.string().optional().nullable(),
    productSlug: z.string().optional().nullable(),
    subCategorySlug: z.string().optional().nullable(),
    priceMin: z.number().optional().nullable(),
    priceMax: z.number().optional().nullable(),
    tags: z.array(z.string()).optional().nullable(),
    attributes: z.record(z.array(z.number())).optional(), // attributeId: [valueIds]
    inStock: z.boolean().optional().nullable(),
    // sortBy: z
    //   .enum([
    //     "newest",
    //     "oldest",
    //     "price_asc",
    //     "price_desc",
    //     "name_asc",
    //     "name_desc",
    //     "rating",
    //   ])
    //   .default("newest")
    //   .nullable(),
    // page: z.number().min(1).default(1),
    // limit: z.number().min(1).max(100).default(20),
  })
  .merge(paginationSchema);
export type ProductSearch = z.infer<typeof productSearchSchema>;

export async function productSearch(db: Db, query: ProductSearch) {
  const ctx = await composeQueryData(query, searchQuery(query), db.inventory);
  const data = await db.inventory.findMany({
    ...ctx.queryProps,
    include: {
      inventoryCategory: {},
      variantAtrributes: {},
      images: {
        take: 1,
        select: {
          altText: true,
          imageGallery: {
            select: {
              bucket: true,
              path: true,
              provider: true,
            },
          },
        },
      },
      variantPricings: {
        take: 1,
        where: {
          costPrice: {
            gt: 0,
          },
        },
      },
    },
  });
  return await ctx.response(
    data.map((product) => {
      const categorySlug = slugify(
        `${product.inventoryCategory!.title} ${product.inventoryCategory!.id}`
      );
      const images = product?.images?.map((i) => ({
        url: imageUrl(i.imageGallery),
        name: i.altText || product.name,
      }));

      return {
        url: `/product/${categorySlug}/${slugify(`${product.name} ${product.id}`)}`,
        id: product.id,
        name: product.name,
        category: {
          title: product.inventoryCategory!.title,
          slug: categorySlug,
        },
        price: product?.variantPricings?.[0]?.costPrice,
        originalPrice: product?.variantPricings?.[0]?.costPrice,
        image: imageUrl(product?.images?.[0]?.imageGallery!),
        images,
        rating: null,
        reviews: null,
        badge: null,
        description: product.description,
      };
    })
  );
}
export const productOverviewSchema = z.object({
  productSlug: z.string(),
  categorySlug: z.string(),
});
export type ProductOverview = z.infer<typeof productOverviewSchema>;
export async function productOverview(db: Db, data: ProductOverview) {
  const [id] = data.productSlug.split("-").reverse();
  const {
    data: [product],
  } = await productSearch(db, {
    productSlug: data.productSlug,
  });
  const variants = await inventoryVariantStockForm(db, Number(id));

  return {
    data,
    product,
    variants,
    inStock: false,
    isFavorite: false,
  };
}
export async function searchFilters(db: Db, query: ProductSearch) {
  const where = searchQuery(query);
  // categories: slugs of categories.
  // a storefront category is a list of inventory items that are marked as a category.
  const inventories = await db.inventory.findMany({
    where,
    select: {
      // main categories...
      inventoryCategory: {
        select: {
          title: true,
          id: true,
        },
      },
      variants: {
        select: {
          pricing: {
            select: {
              costPrice: true,
            },
          },
        },
      },
      // sub categories for component based items.
      variantAtrributes: {
        select: {
          value: {
            select: {
              name: true,
              id: true,
            },
          },
        },
      },
    },
  });
  const categories = inventories.map((i) => ({
    slug: slugify(`${i.inventoryCategory?.title} ${i.inventoryCategory?.id}`),
    name: i.inventoryCategory!.title,
  }));
  const subCategories = inventories
    .map((a) =>
      a.variantAtrributes
        ?.map((v) => ({
          slug: slugify(`${v.value?.name} ${v.value?.id}`),
          name: v.value!.name,
        }))
        .flat()
    )
    .flat();
  //TODO: TRANSFORM COST PRICE BY DEFAULT CUSTOMER PROFILE!
  const priceList = inventories
    .map((a) => a.variants.map((v) => v.pricing?.costPrice)?.flat())
    ?.flat()
    ?.filter((a) => a! > 0)
    .map((a) => a!);
  const priceMax = Math.max(...priceList);
  return {
    priceMax,
    subCategories: uniqueList(subCategories, "slug").map((i) => ({
      ...i,
      count: subCategories.filter((a) => a.slug === i.slug)?.length,
    })),
    categories: uniqueList(categories, "slug").map((i) => ({
      ...i,
      count: categories.filter((a) => a.slug === i.slug)?.length,
    })),
  };
}
function searchQuery(query: ProductSearch) {
  const {
    query: searchQuery,
    categoryId,
    categorySlug,
    priceMin,
    priceMax,
    tags,
    attributes,
    inStock,
    // sortBy,
    // page,
    // limit,
  } = query;

  const wheres: Prisma.InventoryWhereInput[] = [];
  wheres.push({
    variantPricings: {
      some: {
        costPrice: {
          gt: 0,
        },
      },
    },
  });
  if (query.productSlug) {
    const [id, ...rest] = query.productSlug.split("-").reverse();
    wheres.push({
      id: Number(id),
    });
  }
  // wheres.push({
  //   status: "published",
  // });
  return composeQuery(wheres);
  // const skip = (page - 1) * limit;
  // // Build where clause
  // const where: any = {
  //   //  const where: Prisma.InventoryVariantWhereInput = {
  //   status: "published",
  //   publishedAt: { lte: new Date() },
  // };

  // // Category filter
  // if (categoryId) {
  //   where.inventoryCategoryId = categoryId;
  // } else if (categorySlug) {
  //   where.inventoryCategory = { slug: categorySlug };
  // }

  // // Search query
  // if (searchQuery) {
  //   where.OR = [
  //     { name: { contains: searchQuery, mode: "insensitive" } },
  //     { description: { contains: searchQuery, mode: "insensitive" } },
  //     { tags: { hasSome: [searchQuery] } },
  //   ];
  // }

  // // Tags filter
  // if (tags && tags.length > 0) {
  //   where.tags = { hasSome: tags };
  // }

  // // Price range filter
  // if (priceMin || priceMax) {
  //   where.variants = {
  //     some: {
  //       pricing: {
  //         price: {
  //           ...(priceMin && { gte: priceMin }),
  //           ...(priceMax && { lte: priceMax }),
  //         },
  //       },
  //     },
  //   };
  // }

  // // Stock filter
  // if (inStock) {
  //   where.variants = {
  //     ...where.variants,
  //     some: {
  //       ...where.variants?.some,
  //       stocks: {
  //         some: { quantity: { gt: 0 } },
  //       },
  //     },
  //   };
  // }

  // // Attribute filters
  // if (attributes && Object.keys(attributes).length > 0) {
  //   where.variants = {
  //     ...where.variants,
  //     some: {
  //       ...where.variants?.some,
  //       attributes: {
  //         some: {
  //           inventoryCategoryVariantAttributeId: {
  //             in: Object.keys(attributes).map(Number),
  //           },
  //           valueId: { in: Object.values(attributes).flat() },
  //         },
  //       },
  //     },
  //   };
  // }
  // return {};
}

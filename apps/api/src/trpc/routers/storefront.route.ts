import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../init";
import {
  productSearch,
  searchFilters,
  productSearchSchema,
  productOverviewSchema,
  productOverview,
} from "@sales/storefront";
import { composeInventorySubCategories } from "@sales/utils/inventory-utils";
import { formatMoney, imageUrl, slugify } from "@gnd/utils";
import type { INVENTORY_STATUS } from "@sales/constants";

export const storefrontRouter = createTRPCRouter({
  getCartCount: publicProcedure
    .input(
      z.object({
        guestId: z.string().optional().nullable(),
      })
    )
    .query(async (props) => {
      const guestId = props.input.guestId;
      const userId = props.ctx.userId;
      if (!guestId && !userId) return { count: 0 };
      const cartCount = await props.ctx.db.lineItem.count({
        where: {
          lineItemType: "CART",
          guestId: userId ? undefined : guestId,
          userId: !userId ? undefined : userId,
        },
      });
      return {
        count: cartCount,
      };
    }),
  getPrimaryCategories: publicProcedure.query(async (props) => {
    const primaryCategories = await props.ctx.db.inventory.findMany({
      where: {
        status: "published" as INVENTORY_STATUS,
        primaryStoreFront: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        _count: {
          select: {
            asSubCategoryValues: {
              where: {
                inventory: {
                  status: "published" as INVENTORY_STATUS,
                },
              },
            },
          },
        },
        images: {
          where: {
            // primary:true
          },
          take: 1,
          select: {
            imageGallery: true,
          },
        },
      },
    });
    return primaryCategories.map((c) => {
      const slug = slugify(`${c.name} ${c.id}`);
      return {
        title: c.name,
        description: c.description,
        slug,
        img: imageUrl(c.images[0]?.imageGallery!),
        path: `/search?subCategorySlug=${slug}`,
        count: `${c._count.asSubCategoryValues} products`,
      };
    });
  }),
  getComponentsListing: publicProcedure
    .input(
      z.object({
        categoryId: z.number(),
        attributes: z
          .array(
            z.object({
              inventoryId: z.number(),
              categoryId: z.number(),
            })
          )
          .optional()
          .nullable(),
      })
    )
    .query(async (props) => {
      const inventories = await props.ctx.db.inventory.findMany({
        where: {
          inventoryCategoryId: props.input.categoryId,
          name: {},
          variants: {
            some: {
              status: "published",
            },
          },
        },
        select: {
          id: true,
          name: true,
          images: {
            select: {
              imageGallery: {
                select: {
                  id: true,
                  bucket: true,
                  path: true,
                  provider: true,
                },
              },
            },
            take: 1,
          },
          inventoryItemSubCategories: {
            select: {
              inventory: {
                select: {
                  id: true,
                  name: true,
                },
              },
              value: {
                select: {
                  inventory: {
                    select: {
                      id: true,
                      name: true,
                      inventoryCategory: {
                        select: {
                          title: true,
                          id: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          variants: {
            where: {
              status: "published",
            },
            select: {
              id: true,
              pricing: {
                select: {
                  costPrice: true,
                },
              },
              attributes: {
                select: {
                  value: {
                    select: {
                      name: true,
                      id: true,
                    },
                  },
                  inventoryCategoryVariantAttribute: {
                    select: {
                      // valuesInventoryCategoryId: true,
                      valuesInventoryCategory: {
                        select: {
                          id: true,
                          title: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
      return {
        list:
          inventories?.map((inventory) => {
            //TODO: find matched variant if multiple variants available.
            const variant = inventory?.variants?.[0];
            return {
              name: inventory.name,
              image: imageUrl(inventory.images?.[0]?.imageGallery!),
              id: inventory.id,
              variantId: variant?.id,
              price: formatMoney(variant?.pricing?.costPrice),
              raw: inventory,
              subCategories: composeInventorySubCategories(
                inventory.inventoryItemSubCategories
              ),
            };
          }) || [],
      };
    }),
  search: publicProcedure.input(productSearchSchema).query(async (props) => {
    const result = await productSearch(props.ctx.db, props.input);
    return result;
  }),
  searchFilters: publicProcedure
    .input(productSearchSchema)
    .query(async (props) => {
      const result = await searchFilters(props.ctx.db, props.input);
      return result;
    }),
  productOverview: publicProcedure
    .input(productOverviewSchema)
    .query(async (props) => {
      const result = await productOverview(props.ctx.db, props.input);
      return result;
    }),
});

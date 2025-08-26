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
import { formatMoney, imageUrl } from "@gnd/utils";

export const storefrontRouter = createTRPCRouter({
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

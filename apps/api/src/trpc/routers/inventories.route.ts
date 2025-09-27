// import { upsertInventoriesForDykeShelfProductsSchema } from "@api/db/queries/inventory";
import { createTRPCRouter, publicProcedure } from "../init";
import { z } from "zod";
import {
  getInventoryCategoryByShelfId,
  upsertInventoriesForDykeShelfProducts,
  upsertInventoriesForDykeShelfProductsSchema,
} from "@api/db/queries/inventory.generate";
import {
  getInventoryCategoriesSchema,
  getStoreAddonComponentFormSchema,
  inventoryCategoriesSchema,
  inventoryCategoryFormSchema,
  inventoryFormSchema,
  inventoryImportSchema,
  inventoryListSchema,
  updateCategoryVariantAttributeSchema,
  updateSubComponentSchema,
  variantFormSchema,
} from "@sales/schema";
import {
  deleteInventories,
  deleteInventoryCategory,
  getInventoryCategories,
  getInventoryCategoryAttributes,
  getInventoryCategoryForm,
  inventoryCategories,
  inventoryForm,
  inventoryList,
  inventorySummary,
  inventorySummarySchema,
  inventoryVariantStockForm,
  resetInventorySystem,
  saveInventory,
  saveInventoryCategoryForm,
  saveVariantForm,
  updateCategoryVariantAttribute,
  updateSubCategory,
  updateSubCategorySchema,
  updateVariantCost,
  updateVariantCostSchema,
  updateVariantStatus,
  updateVariantStatusSchema,
  updateSubComponent,
  deleteSubComponent,
} from "@sales/inventory";
import { getStoreAddonComponentForm } from "@sales/storefront-product";
import { inventoryImport } from "@sales/inventory-import";
import { InventoryImportService } from "@sales/inventory-import-service";
import { idSchema } from "@api/schemas/common";
import { INVENTORY_STATUS } from "@sales/constants";
import {
  createCommunityInput,
  createCommunityInputSchema,
} from "@community/community-template-schemas";
// import {
//   dimensionalWeightFormSchema,
//   flatRateFormSchema,
//   getShippingCalculationConfig,
//   perItemFormSchema,
//   priceBasedFormSchema,
//   saveDimensionalWeightConfig,
//   saveFlatRateConfig,
//   savePerItemConfig,
//   savePriceBasedConfig,
//   saveWeightBasedConfig,
//   saveZoneBasedConfig,
//   weightBasedFormSchema,
//   zoneBasedFormSchema,
// } from "@sales/shipping";
export const inventoriesRouter = createTRPCRouter({
  createCommunityInput: publicProcedure
    .input(createCommunityInputSchema)
    .mutation(async (props) => {
      return createCommunityInput(props.ctx.db, props.input);
    }),
  deleteInventories: publicProcedure
    .input(
      z.object({
        ids: z.array(z.number()).min(1),
      })
    )
    .mutation(async (props) => {
      return deleteInventories(props.ctx.db, props.input.ids);
    }),
  deleteInventoryCategory: publicProcedure
    .input(idSchema)
    .mutation(async (props) => {
      return deleteInventoryCategory(props.ctx.db, props.input.id);
    }),
  deleteSubComponent: publicProcedure
    .input(idSchema)
    .mutation(async (props) => {
      await props.ctx.db.subComponents.update({
        where: {
          id: props.input.id,
        },
        data: {
          deletedAt: new Date(),
        },
      });
    }),

  getStoreAddonComponentForm: publicProcedure
    .input(getStoreAddonComponentFormSchema)
    .query(async (props) => {
      const result = await getStoreAddonComponentForm(
        props.ctx.db,
        props.input
      );
      return result;
    }),
  getInventoryTypeByShelfId: publicProcedure
    .input(
      z.object({
        categoryId: z.number(),
      })
    )
    .query(async (props) => {
      return getInventoryCategoryByShelfId(props.ctx, props.input.categoryId);
    }),
  inventorySummary: publicProcedure
    .input(inventorySummarySchema)
    .query(async (props) => {
      const result = await inventorySummary(props.ctx.db, props.input);
      return result;
    }),
  upsertShelfProducts: publicProcedure
    .input(upsertInventoriesForDykeShelfProductsSchema)
    .mutation(async (props) => {
      return upsertInventoriesForDykeShelfProducts(props.ctx, props.input);
    }),
  upsertComponents: publicProcedure
    .input(upsertInventoriesForDykeShelfProductsSchema)
    .mutation(async (props) => {
      const iis = new InventoryImportService(props.ctx.db);
      await iis.importComponents(props.input.categoryId);
      return {
        data: iis.result,
      };
      // return migrateDykeStepToInventories(props.ctx, props.input.categoryId);
    }),
  getInventoryCategories: publicProcedure
    .input(getInventoryCategoriesSchema)
    .query(async (props) => {
      const result = await getInventoryCategories(props.ctx.db, props.input);
      return result;
    }),
  getInventoryCategoryAttributes: publicProcedure
    .input(
      z.object({
        categoryId: z.number(),
      })
    )
    .query(async (props) => {
      return await getInventoryCategoryAttributes(
        props.ctx.db,
        props.input.categoryId
      );
    }),
  inventoryImports: publicProcedure
    .input(inventoryImportSchema)
    .query(async (props) => {
      return inventoryImport(props.ctx.db, props.input);
    }),
  inventoryProducts: publicProcedure
    .input(inventoryListSchema)
    .query(async (props) => {
      return inventoryList(props.ctx.db, props.input);
    }),
  inventoryCategories: publicProcedure
    .input(inventoryCategoriesSchema)
    .query(async (props) => {
      const result = await inventoryCategories(props.ctx.db, props.input);
      return result;
    }),
  inventoryCategoryForm: publicProcedure
    .input(z.number())
    .query(async (props) => {
      const result = await getInventoryCategoryForm(props.ctx.db, props.input);
      return result;
    }),
  resetInventorySystem: publicProcedure
    // .input(resetInventoriesSchema)
    .mutation(async (props) => {
      return resetInventorySystem(props.ctx.db);
    }),
  saveInventoryCategory: publicProcedure
    .input(inventoryCategoryFormSchema)
    .mutation(async (props) => {
      return saveInventoryCategoryForm(props.ctx.db, props.input);
    }),
  inventoryForm: publicProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .query(async (props) => {
      const result = await inventoryForm(props.ctx.db, props.input.id);
      return result;
    }),
  saveInventory: publicProcedure
    .input(inventoryFormSchema)
    .mutation(async (props) => {
      return saveInventory(props.ctx.db, props.input);
    }),
  inventoryVariantStockForm: publicProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .query(async (props) => {
      const result = await inventoryVariantStockForm(
        props.ctx.db,
        props.input.id
      );
      return result;
    }),
  updateCategoryVariantAttribute: publicProcedure
    .input(updateCategoryVariantAttributeSchema)
    .mutation(async (props) => {
      return updateCategoryVariantAttribute(props.ctx.db, props.input);
    }),
  updateSubCategory: publicProcedure
    .input(updateSubCategorySchema)
    .mutation(async (props) => {
      return updateSubCategory(props.ctx.db, props.input);
    }),
  updateSubComponent: publicProcedure
    .input(updateSubComponentSchema)
    .mutation(async (props) => {
      return updateSubComponent(props.ctx.db, props.input);
    }),
  updateSubComponentStatus: publicProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(INVENTORY_STATUS),
      })
    )
    .mutation(async (props) => {
      // return updateSubComponentStatus(props.ctx, props.input);
      await props.ctx.db.subComponents.update({
        where: {
          id: props.input.id,
        },
        data: {
          status: props.input.status,
        },
      });
    }),
  updateVariantCost: publicProcedure
    .input(updateVariantCostSchema)
    .mutation(async (props) => {
      return updateVariantCost(props.ctx.db, props.input);
    }),
  updateVariantStatus: publicProcedure
    .input(updateVariantStatusSchema)
    .mutation(async (props) => {
      return updateVariantStatus(props.ctx.db, props.input);
    }),

  saveVariantForm: publicProcedure
    .input(variantFormSchema)
    .mutation(async (props) => {
      return saveVariantForm(props.ctx.db, props.input);
    }),
  shipping: {
    // getShippingConfig: publicProcedure.query(async ({ ctx }) => {
    //   return getShippingCalculationConfig(ctx.db);
    // }),
    // saveFlatRate: publicProcedure
    //   .input(flatRateFormSchema)
    //   .mutation(async ({ ctx, input }) => {
    //     return saveFlatRateConfig(ctx.db, input);
    //   }),
    // saveWeightBased: publicProcedure
    //   .input(weightBasedFormSchema)
    //   .mutation(async ({ ctx, input }) => {
    //     return saveWeightBasedConfig(ctx.db, input);
    //   }),
    // savePriceBased: publicProcedure
    //   .input(priceBasedFormSchema)
    //   .mutation(async ({ ctx, input }) => {
    //     return savePriceBasedConfig(ctx.db, input);
    //   }),
    // saveZoneBased: publicProcedure
    //   .input(zoneBasedFormSchema)
    //   .mutation(async ({ ctx, input }) => {
    //     return saveZoneBasedConfig(ctx.db, input);
    //   }),
    // savePerItem: publicProcedure
    //   .input(perItemFormSchema)
    //   .mutation(async ({ ctx, input }) => {
    //     return savePerItemConfig(ctx.db, input);
    //   }),
    // saveDimensionalWeight: publicProcedure
    //   .input(dimensionalWeightFormSchema)
    //   .mutation(async ({ ctx, input }) => {
    //     return saveDimensionalWeightConfig(ctx.db, input);
    //   }),
  },
});

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
  inventoryCategoriesSchema,
  inventoryCategoryFormSchema,
  inventoryFormSchema,
  inventoryImportSchema,
  inventoryListSchema,
  updateCategoryVariantAttributeSchema,
  variantFormSchema,
} from "@sales/schema";
import {
  deleteInventory,
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
  inventoryFormSave,
  saveInventoryCategoryForm,
  saveVariantForm,
  updateCategoryVariantAttribute,
  updateSubCategory,
  updateSubCategorySchema,
  updateVariantCost,
  updateVariantCostSchema,
  updateVariantStatus,
  updateVariantStatusSchema,
} from "@sales/inventory";
import { inventoryImport } from "@sales/inventory-import";
import { InventoryImportService } from "@sales/inventory-import-service";
export const inventoriesRouter = createTRPCRouter({
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
  inventoryFormSave: publicProcedure
    .input(inventoryFormSchema)
    .mutation(async (props) => {
      return inventoryFormSave(props.ctx.db, props.input);
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
  deleteInventory: publicProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .mutation(async (props) => {
      return deleteInventory(props.ctx.db, props.input.id);
    }),
  deleteInventoryCategory: publicProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .mutation(async (props) => {
      return deleteInventoryCategory(props.ctx.db, props.input.id);
    }),

  saveVariantForm: publicProcedure
    .input(variantFormSchema)
    .mutation(async (props) => {
      return saveVariantForm(props.ctx.db, props.input);
    }),
});

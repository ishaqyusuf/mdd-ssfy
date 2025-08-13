// import { upsertInventoriesForDykeShelfProductsSchema } from "@api/db/queries/inventory";
import { createTRPCRouter, publicProcedure } from "../init";
import { z } from "zod";
import {
  getInventoryCategoryByShelfId,
  migrateDykeStepToInventories,
  upsertInventoriesForDykeShelfProducts,
  upsertInventoriesForDykeShelfProductsSchema,
} from "@api/db/queries/inventory.generate";
import {
  getInventoryCategoriesSchema,
  inventoryFormSchema,
  inventoryImportSchema,
  inventoryProductsListSchema,
  variantFormSchema,
} from "@sales/schema";
import {
  getInventoryCategories,
  getInventoryCategoryAttributes,
  inventoryForm,
  inventoryProductsList,
  inventoryVariants,
  saveInventory,
  saveVariantForm,
} from "@sales/inventory";
import { inventoryImport } from "@sales/inventory-import";
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
  upsertShelfProducts: publicProcedure
    .input(upsertInventoriesForDykeShelfProductsSchema)
    .mutation(async (props) => {
      return upsertInventoriesForDykeShelfProducts(props.ctx, props.input);
    }),
  upsertComponents: publicProcedure
    .input(upsertInventoriesForDykeShelfProductsSchema)
    .mutation(async (props) => {
      return migrateDykeStepToInventories(props.ctx, props.input.categoryId);
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
    .input(inventoryProductsListSchema)
    .query(async (props) => {
      return inventoryProductsList(props.ctx.db, props.input);
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
  inventoryVariants: publicProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .query(async (props) => {
      const result = await inventoryVariants(props.ctx.db, props.input.id);
      return result;
    }),
  saveInventory: publicProcedure
    .input(inventoryFormSchema)
    .mutation(async (props) => {
      return saveInventory(props.ctx.db, props.input);
    }),
  saveVariantForm: publicProcedure
    .input(variantFormSchema)
    .mutation(async (props) => {
      return saveVariantForm(props.ctx.db, props.input);
    }),
});

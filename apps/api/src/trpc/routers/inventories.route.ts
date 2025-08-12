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
  inventoryFormSchema,
  inventoryProductsListSchema,
} from "@sales/schema";
import {
  getInventoryCategories,
  getInventoryCategoryAttributes,
  inventoryForm,
  inventoryProductsList,
  inventoryVariants,
  saveInventory,
} from "@sales/inventory";

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
});

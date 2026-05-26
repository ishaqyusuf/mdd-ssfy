import {
  createShelfProduct,
  listShelfCategories,
  listShelfProducts,
  toggleShelfCategory,
  toggleShelfProduct,
  updateShelfProduct,
} from "@api/db/queries/sales-shelf-item";
import {
  listShelfCategoriesSchema,
  listShelfProductsSchema,
  shelfProductFormSchema,
  toggleShelfCategorySchema,
  toggleShelfProductSchema,
  updateShelfProductSchema,
} from "@api/schemas/sales-shelf-item";
import { createTRPCRouter, protectedProcedure } from "../init";

export const salesShelfItems = createTRPCRouter({
  listProducts: protectedProcedure
    .input(listShelfProductsSchema)
    .query(async (props) => {
      return listShelfProducts(props.ctx, props.input);
    }),
  listCategories: protectedProcedure
    .input(listShelfCategoriesSchema)
    .query(async (props) => {
      return listShelfCategories(props.ctx, props.input);
    }),
  createProduct: protectedProcedure
    .input(shelfProductFormSchema)
    .mutation(async (props) => {
      return createShelfProduct(props.ctx, props.input);
    }),
  updateProduct: protectedProcedure
    .input(updateShelfProductSchema)
    .mutation(async (props) => {
      return updateShelfProduct(props.ctx, props.input);
    }),
  toggleProduct: protectedProcedure
    .input(toggleShelfProductSchema)
    .mutation(async (props) => {
      return toggleShelfProduct(props.ctx, props.input);
    }),
  toggleCategory: protectedProcedure
    .input(toggleShelfCategorySchema)
    .mutation(async (props) => {
      return toggleShelfCategory(props.ctx, props.input);
    }),
});

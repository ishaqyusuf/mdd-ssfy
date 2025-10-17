import { createTRPCRouter, publicProcedure } from "../init";
import {
  getByIdSchema,
  getReviewsSchema,
  getSimilarSchema,
  productSchema,
  productSearchSchema,
  reviewSchema,
} from "@api/schemas/shopping-products";
import {
  getProductById,
  getProductReviews,
  getSimilarProducts,
  searchProducts,
} from "@api/db/queries/shopping-products";
import { z } from "zod";

export const shoppingProductsRouter = createTRPCRouter({
  search: publicProcedure.input(productSearchSchema).query(async (props) => {
    return searchProducts(props.ctx, props.input);
  }),
  getById: publicProcedure.input(getByIdSchema).query(async (props) => {
    return getProductById(props.ctx, props.input);
  }),
  getReviews: publicProcedure.input(getReviewsSchema).query(async (props) => {
    return getProductReviews(props.ctx, props.input);
  }),
  getSimilar: publicProcedure.input(getSimilarSchema).query(async (props) => {
    return getSimilarProducts(props.ctx, props.input);
  }),
});

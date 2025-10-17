import { z } from "zod";

export const reviewSchema = z.object({
  id: z.string(),
  author: z.string(),
  rating: z.number(),
  comment: z.string(),
});

export const variantOptionSchema = z.object({
  type: z.string(),
  options: z.array(z.string()),
});

export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  longDescription: z.string(),
  price: z.number(),
  img: z.string(),
  category: z.string(),
  variants: z.array(variantOptionSchema).optional(),
  rating: z.number(),
  reviews: z.array(reviewSchema),
  similarProductIds: z.array(z.string()),
});

export const productSearchSchema = z.object({
  query: z.string().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
  productId: z.number().optional(),
});

export type ProductSearchSchema = z.infer<typeof productSearchSchema>;

export const getByIdSchema = z.object({
  id: z.string(),
});

export const getReviewsSchema = z.object({
  productId: z.string(),
});

export const getSimilarSchema = z.object({
  ids: z.array(z.string()).optional(),
});

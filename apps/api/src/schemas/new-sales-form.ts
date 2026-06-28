import { z } from "zod";
import { orderInboundStatuses } from "@gnd/utils/constants";
import {
  salesFormExtraCostSchema,
  salesFormExtraCostTypeSchema,
  salesFormLineItemSchema,
  salesFormMetaSchema,
  salesFormRecalculateExtraCostSchema,
  salesFormRecalculateLineItemSchema,
  salesFormSummarySchema,
} from "@gnd/sales/sales-form";

export const newSalesFormTypeSchema = z.enum(["order", "quote"]);
export type NewSalesFormType = z.infer<typeof newSalesFormTypeSchema>;

export const newSalesFormLineItemSchema = salesFormLineItemSchema;
export type NewSalesFormLineItem = z.infer<typeof newSalesFormLineItemSchema>;

export const newSalesFormSummarySchema = salesFormSummarySchema;
export type NewSalesFormSummary = z.infer<typeof newSalesFormSummarySchema>;

export const newSalesFormMetaSchema = salesFormMetaSchema;
export type NewSalesFormMeta = z.infer<typeof newSalesFormMetaSchema>;

export const newSalesFormExtraCostTypeSchema = salesFormExtraCostTypeSchema;
export type NewSalesFormExtraCostType = z.infer<
  typeof newSalesFormExtraCostTypeSchema
>;

export const newSalesFormExtraCostSchema = salesFormExtraCostSchema;
export type NewSalesFormExtraCost = z.infer<typeof newSalesFormExtraCostSchema>;

export const bootstrapNewSalesFormSchema = z.object({
  type: newSalesFormTypeSchema,
  customerId: z.number().optional().nullable(),
});
export type BootstrapNewSalesFormSchema = z.infer<
  typeof bootstrapNewSalesFormSchema
>;

export const getNewSalesFormSchema = z.object({
  type: newSalesFormTypeSchema,
  slug: z.string().trim().min(1),
});
export type GetNewSalesFormSchema = z.infer<typeof getNewSalesFormSchema>;

export const searchNewSalesCustomersSchema = z.object({
  query: z.string().optional().nullable(),
  limit: z.number().int().min(1).max(25).default(10),
  recent: z.boolean().default(false),
  type: newSalesFormTypeSchema.optional().nullable(),
});
export type SearchNewSalesCustomersSchema = z.infer<
  typeof searchNewSalesCustomersSchema
>;

export const resolveNewSalesCustomerSchema = z.object({
  customerId: z.number(),
  billingId: z.number().optional().nullable(),
  shippingId: z.number().optional().nullable(),
});
export type ResolveNewSalesCustomerSchema = z.infer<
  typeof resolveNewSalesCustomerSchema
>;

export const getNewSalesFormStepRoutingSchema = z.object({});
export type GetNewSalesFormStepRoutingSchema = z.infer<
  typeof getNewSalesFormStepRoutingSchema
>;

export const getNewSalesFormShelfCategoriesSchema = z.object({});
export type GetNewSalesFormShelfCategoriesSchema = z.infer<
  typeof getNewSalesFormShelfCategoriesSchema
>;

export const getNewSalesFormShelfProductsSchema = z.object({
  categoryIds: z.array(z.number().int().positive()).max(100).default([]),
});
export type GetNewSalesFormShelfProductsSchema = z.infer<
  typeof getNewSalesFormShelfProductsSchema
>;

export const getNewSalesFormShelfProductIndexSchema = z.object({});
export type GetNewSalesFormShelfProductIndexSchema = z.infer<
  typeof getNewSalesFormShelfProductIndexSchema
>;

export const getNewSalesFormShelfProductDetailsSchema = z.object({
  ids: z.array(z.number().int().positive()).max(100).default([]),
});
export type GetNewSalesFormShelfProductDetailsSchema = z.infer<
  typeof getNewSalesFormShelfProductDetailsSchema
>;

export const searchNewSalesFormShelfProductsSchema = z.object({
  query: z.string().trim().max(100).default(""),
  selectedIds: z.array(z.number().int().positive()).max(100).default([]),
  limit: z.number().int().positive().max(50).default(5),
});
export type SearchNewSalesFormShelfProductsSchema = z.infer<
  typeof searchNewSalesFormShelfProductsSchema
>;

export const searchNewSalesFormServiceSuggestionsSchema = z.object({
  query: z.string().trim().max(100).default(""),
  limit: z.number().int().positive().max(50).default(12),
});
export type SearchNewSalesFormServiceSuggestionsSchema = z.infer<
  typeof searchNewSalesFormServiceSuggestionsSchema
>;

export const updateNewSalesFormShelfProductSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().trim().min(1).max(255),
  unitPrice: z.number().min(0).max(1_000_000).nullable().optional(),
});
export type UpdateNewSalesFormShelfProductSchema = z.infer<
  typeof updateNewSalesFormShelfProductSchema
>;

export const deleteNewSalesFormShelfProductSchema = z.object({
  id: z.number().int().positive(),
});
export type DeleteNewSalesFormShelfProductSchema = z.infer<
  typeof deleteNewSalesFormShelfProductSchema
>;

export const saveDraftNewSalesFormSchema = z.object({
  type: newSalesFormTypeSchema,
  slug: z.string().optional().nullable(),
  salesId: z.number().optional().nullable(),
  inventoryStatus: z.enum(orderInboundStatuses).optional().nullable(),
  version: z.string().optional().nullable(),
  autosave: z.boolean().default(true),
  meta: newSalesFormMetaSchema,
  lineItems: z.array(newSalesFormLineItemSchema),
  extraCosts: z.array(newSalesFormExtraCostSchema).default([]),
  summary: newSalesFormSummarySchema,
});
export type SaveDraftNewSalesFormSchema = z.infer<
  typeof saveDraftNewSalesFormSchema
>;

export const saveFinalNewSalesFormSchema = saveDraftNewSalesFormSchema.extend({
  autosave: z.boolean().default(false),
});
export type SaveFinalNewSalesFormSchema = z.infer<
  typeof saveFinalNewSalesFormSchema
>;

export const deleteNewSalesFormLineItemSchema = z.object({
  salesId: z.number(),
  lineItemId: z.number(),
});
export type DeleteNewSalesFormLineItemSchema = z.infer<
  typeof deleteNewSalesFormLineItemSchema
>;

export const recalculateNewSalesFormSchema = z.object({
  taxRate: z.number().min(0).max(100).default(0),
  paymentMethod: z.string().optional().nullable(),
  extraCosts: z.array(salesFormRecalculateExtraCostSchema).default([]),
  lineItems: z.array(salesFormRecalculateLineItemSchema),
});
export type RecalculateNewSalesFormSchema = z.infer<
  typeof recalculateNewSalesFormSchema
>;

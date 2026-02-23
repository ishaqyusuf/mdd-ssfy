import { z } from "zod";

export const newSalesFormTypeSchema = z.enum(["order", "quote"]);
export type NewSalesFormType = z.infer<typeof newSalesFormTypeSchema>;

export const newSalesFormLineItemSchema = z.object({
  id: z.number().optional().nullable(),
  uid: z.string(),
  title: z.string().trim().min(1),
  description: z.string().optional().nullable(),
  qty: z.number().min(0),
  unitPrice: z.number(),
  lineTotal: z.number(),
  meta: z.record(z.string(), z.any()).optional().nullable(),
});
export type NewSalesFormLineItem = z.infer<typeof newSalesFormLineItemSchema>;

export const newSalesFormSummarySchema = z.object({
  subTotal: z.number(),
  taxRate: z.number().min(0).max(100).default(0),
  taxTotal: z.number(),
  grandTotal: z.number(),
});
export type NewSalesFormSummary = z.infer<typeof newSalesFormSummarySchema>;

export const newSalesFormMetaSchema = z.object({
  customerId: z.number().optional().nullable(),
  customerProfileId: z.number().optional().nullable(),
  billingAddressId: z.number().optional().nullable(),
  shippingAddressId: z.number().optional().nullable(),
  paymentTerm: z.string().optional().nullable(),
  goodUntil: z.string().optional().nullable(),
  po: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  deliveryOption: z.string().optional().nullable(),
});
export type NewSalesFormMeta = z.infer<typeof newSalesFormMetaSchema>;

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
});
export type SearchNewSalesCustomersSchema = z.infer<
  typeof searchNewSalesCustomersSchema
>;

export const saveDraftNewSalesFormSchema = z.object({
  type: newSalesFormTypeSchema,
  slug: z.string().optional().nullable(),
  salesId: z.number().optional().nullable(),
  version: z.string().optional().nullable(),
  autosave: z.boolean().default(true),
  meta: newSalesFormMetaSchema,
  lineItems: z.array(newSalesFormLineItemSchema),
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
  lineItems: z.array(
    z.object({
      qty: z.number(),
      unitPrice: z.number(),
      lineTotal: z.number().optional(),
    }),
  ),
});
export type RecalculateNewSalesFormSchema = z.infer<
  typeof recalculateNewSalesFormSchema
>;

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
  formSteps: z
    .array(
      z.object({
        id: z.number().optional().nullable(),
        stepId: z.number().optional().nullable(),
        componentId: z.number().optional().nullable(),
        prodUid: z.string().optional().nullable(),
        value: z.string().optional().nullable(),
        qty: z.number().optional().nullable(),
        price: z.number().optional().nullable(),
        basePrice: z.number().optional().nullable(),
        meta: z.record(z.string(), z.any()).optional().nullable(),
        step: z
          .object({
            id: z.number().optional().nullable(),
            uid: z.string().optional().nullable(),
            title: z.string().optional().nullable(),
          })
          .optional()
          .nullable(),
      }),
    )
    .optional()
    .nullable(),
  shelfItems: z
    .array(
      z.object({
        id: z.number().optional().nullable(),
        categoryId: z.number().optional().nullable(),
        productId: z.number().optional().nullable(),
        description: z.string().optional().nullable(),
        qty: z.number().optional().nullable(),
        unitPrice: z.number().optional().nullable(),
        totalPrice: z.number().optional().nullable(),
        meta: z.record(z.string(), z.any()).optional().nullable(),
      }),
    )
    .optional()
    .nullable(),
  housePackageTool: z
    .object({
      id: z.number().optional().nullable(),
      height: z.string().optional().nullable(),
      doorType: z.string().optional().nullable(),
      doorId: z.number().optional().nullable(),
      dykeDoorId: z.number().optional().nullable(),
      jambSizeId: z.number().optional().nullable(),
      casingId: z.number().optional().nullable(),
      moldingId: z.number().optional().nullable(),
      stepProductId: z.number().optional().nullable(),
      totalPrice: z.number().optional().nullable(),
      totalDoors: z.number().optional().nullable(),
      meta: z.record(z.string(), z.any()).optional().nullable(),
      molding: z
        .object({
          id: z.number().optional().nullable(),
          title: z.string().optional().nullable(),
          value: z.string().optional().nullable(),
          price: z.number().optional().nullable(),
        })
        .optional()
        .nullable(),
      doors: z
        .array(
          z.object({
            id: z.number().optional().nullable(),
            dimension: z.string().optional().nullable(),
            swing: z.string().optional().nullable(),
            doorType: z.string().optional().nullable(),
            doorPrice: z.number().optional().nullable(),
            jambSizePrice: z.number().optional().nullable(),
            casingPrice: z.number().optional().nullable(),
            unitPrice: z.number().optional().nullable(),
            lhQty: z.number().optional().nullable(),
            rhQty: z.number().optional().nullable(),
            totalQty: z.number().optional().nullable(),
            lineTotal: z.number().optional().nullable(),
            stepProductId: z.number().optional().nullable(),
            meta: z.record(z.string(), z.any()).optional().nullable(),
          }),
        )
        .optional()
        .nullable(),
    })
    .optional()
    .nullable(),
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
  prodDueDate: z.string().optional().nullable(),
  po: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  deliveryOption: z.string().optional().nullable(),
  paymentMethod: z.string().optional().nullable(),
  taxCode: z.string().optional().nullable(),
});
export type NewSalesFormMeta = z.infer<typeof newSalesFormMetaSchema>;

export const newSalesFormExtraCostTypeSchema = z.enum([
  "Discount",
  "DiscountPercentage",
  "Labor",
  "CustomTaxxable",
  "CustomNonTaxxable",
  "Delivery",
  "EXT",
]);
export type NewSalesFormExtraCostType = z.infer<
  typeof newSalesFormExtraCostTypeSchema
>;

export const newSalesFormExtraCostSchema = z.object({
  id: z.number().optional().nullable(),
  label: z.string().trim().min(1),
  type: newSalesFormExtraCostTypeSchema,
  amount: z.number().default(0),
  taxxable: z.boolean().optional().nullable(),
});
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

export const saveDraftNewSalesFormSchema = z.object({
  type: newSalesFormTypeSchema,
  slug: z.string().optional().nullable(),
  salesId: z.number().optional().nullable(),
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
  extraCosts: z
    .array(
      z.object({
        type: newSalesFormExtraCostTypeSchema,
        amount: z.number(),
        taxxable: z.boolean().optional().nullable(),
      }),
    )
    .default([]),
  lineItems: z.array(
    z.object({
      qty: z.number(),
      unitPrice: z.number(),
      lineTotal: z.number().optional(),
      taxxable: z.boolean().optional().nullable(),
      meta: z.record(z.string(), z.any()).optional().nullable(),
      formSteps: z
        .array(
          z.object({
            value: z.string().optional().nullable(),
            step: z
              .object({
                title: z.string().optional().nullable(),
              })
              .optional()
              .nullable(),
          }),
        )
        .optional()
        .nullable(),
    }),
  ),
});
export type RecalculateNewSalesFormSchema = z.infer<
  typeof recalculateNewSalesFormSchema
>;

import { z } from "zod";

export const salesFormJsonRecordSchema = z.record(z.string(), z.unknown());

export const salesFormWorkflowStepRefSchema = z.object({
  id: z.number().optional().nullable(),
  uid: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
});
export type SalesFormWorkflowStepRef = z.infer<
  typeof salesFormWorkflowStepRefSchema
>;

export const salesFormWorkflowStepSchema = z.object({
  id: z.number().optional().nullable(),
  stepId: z.number().optional().nullable(),
  componentId: z.number().optional().nullable(),
  prodUid: z.string().optional().nullable(),
  value: z.string().optional().nullable(),
  qty: z.number().optional().nullable(),
  price: z.number().optional().nullable(),
  basePrice: z.number().optional().nullable(),
  meta: salesFormJsonRecordSchema.optional().nullable(),
  step: salesFormWorkflowStepRefSchema.optional().nullable(),
});
export type SalesFormWorkflowStep = z.infer<typeof salesFormWorkflowStepSchema>;

export const salesFormShelfItemSchema = z.object({
  id: z.number().optional().nullable(),
  categoryId: z.number().optional().nullable(),
  parentCategoryId: z.number().optional().nullable(),
  productId: z.number().optional().nullable(),
  description: z.string().optional().nullable(),
  qty: z.number().optional().nullable(),
  unitPrice: z.number().optional().nullable(),
  totalPrice: z.number().optional().nullable(),
  meta: salesFormJsonRecordSchema.optional().nullable(),
});
export type SalesFormShelfItem = z.infer<typeof salesFormShelfItemSchema>;

export const salesFormHousePackageToolDoorSchema = z.object({
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
  meta: salesFormJsonRecordSchema.optional().nullable(),
});
export type SalesFormHousePackageToolDoor = z.infer<
  typeof salesFormHousePackageToolDoorSchema
>;

export const salesFormHousePackageToolSchema = z.object({
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
  meta: salesFormJsonRecordSchema.optional().nullable(),
  molding: salesFormWorkflowStepRefSchema
    .extend({
      value: z.string().optional().nullable(),
      price: z.number().optional().nullable(),
    })
    .optional()
    .nullable(),
  doors: z.array(salesFormHousePackageToolDoorSchema).optional().nullable(),
});
export type SalesFormHousePackageTool = z.infer<
  typeof salesFormHousePackageToolSchema
>;

export const salesFormPortableLineItemSchema = z.object({
  id: z.number().optional().nullable(),
  uid: z.string().trim().min(1),
  title: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  qty: z.number().min(0).optional().nullable(),
  unitPrice: z.number().optional().nullable(),
  lineTotal: z.number().optional().nullable(),
  taxxable: z.boolean().optional().nullable(),
  meta: salesFormJsonRecordSchema.optional().nullable(),
  formSteps: z.array(salesFormWorkflowStepSchema).optional().nullable(),
  shelfItems: z.array(salesFormShelfItemSchema).optional().nullable(),
  housePackageTool: salesFormHousePackageToolSchema.optional().nullable(),
});
export type SalesFormPortableLineItem = z.infer<
  typeof salesFormPortableLineItemSchema
>;

export const salesFormLineItemSchema = salesFormPortableLineItemSchema.extend({
  title: z.string().trim().min(1),
  qty: z.number().min(0),
  unitPrice: z.number(),
  lineTotal: z.number(),
});
export type SalesFormLineItem = z.infer<typeof salesFormLineItemSchema>;

export const salesFormSummarySchema = z.object({
  subTotal: z.number(),
  adjustedSubTotal: z.number().optional(),
  taxRate: z.number().min(0).max(100).default(0),
  taxTotal: z.number(),
  grandTotal: z.number(),
  discount: z.number().optional(),
  discountPct: z.number().optional(),
  percentDiscountValue: z.number().optional(),
  labor: z.number().optional(),
  delivery: z.number().optional(),
  otherCosts: z.number().optional(),
  taxableSubTotal: z.number().optional(),
  ccc: z.number().optional(),
});
export type SalesFormSummary = z.infer<typeof salesFormSummarySchema>;

export const salesFormMetaSchema = z.object({
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
export type SalesFormMeta = z.infer<typeof salesFormMetaSchema>;

export const salesFormExtraCostTypeSchema = z.enum([
  "Discount",
  "DiscountPercentage",
  "Labor",
  "FlatLabor",
  "CustomTaxxable",
  "CustomNonTaxxable",
  "Delivery",
  "EXT",
]);
export type SalesFormExtraCostType = z.infer<
  typeof salesFormExtraCostTypeSchema
>;

export const salesFormExtraCostSchema = z.object({
  id: z.number().optional().nullable(),
  label: z.string().trim().min(1),
  type: salesFormExtraCostTypeSchema,
  amount: z.number().default(0),
  taxxable: z.boolean().optional().nullable(),
});
export type SalesFormExtraCost = z.infer<typeof salesFormExtraCostSchema>;

export const salesFormRecalculateExtraCostSchema = z.object({
  type: salesFormExtraCostTypeSchema,
  amount: z.number(),
  taxxable: z.boolean().optional().nullable(),
});
export type SalesFormRecalculateExtraCost = z.infer<
  typeof salesFormRecalculateExtraCostSchema
>;

export const salesFormRecalculateLineItemSchema =
  salesFormPortableLineItemSchema
    .pick({
      taxxable: true,
      meta: true,
      formSteps: true,
    })
    .extend({
      qty: z.number(),
      unitPrice: z.number(),
      lineTotal: z.number().optional(),
    });
export type SalesFormRecalculateLineItem = z.infer<
  typeof salesFormRecalculateLineItemSchema
>;

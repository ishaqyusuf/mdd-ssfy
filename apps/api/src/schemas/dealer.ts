import { salesFormPortableLineItemSchema } from "@gnd/sales/sales-form";
import {
  US_PHONE_FORMAT_PATTERN,
  normalizeUSPhoneNumber,
} from "@gnd/utils/format";
import { paginationSchema } from "@gnd/utils/schema";
import { z } from "zod";

export const getDealersSchema = z
  .object({
    search: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
  })
  .extend(paginationSchema.shape);
export type GetDealersSchema = z.infer<typeof getDealersSchema>;

export const searchDealerCustomerCandidatesSchema = z.object({
  query: z.string().optional().nullable(),
  take: z.number().min(1).max(25).optional().nullable(),
});
export type SearchDealerCustomerCandidatesSchema = z.infer<
  typeof searchDealerCustomerCandidatesSchema
>;

export const createDealerAccountSchema = z
  .object({
    customerId: z.number().optional().nullable(),
    name: z.string().optional().nullable(),
    email: z.string().email(),
  })
  .superRefine((data, ctx) => {
    if (!data.customerId && !data.name?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["name"],
        message:
          "Dealer name is required when no existing customer is selected.",
      });
    }
  });
export type CreateDealerAccountSchema = z.infer<
  typeof createDealerAccountSchema
>;

export const resendDealerOnboardingSchema = z.object({
  dealerId: z.number(),
});
export type ResendDealerOnboardingSchema = z.infer<
  typeof resendDealerOnboardingSchema
>;

export const updateDealerSalesProfileSchema = z.object({
  dealerId: z.number(),
  customerProfileId: z.number(),
});
export type UpdateDealerSalesProfileSchema = z.infer<
  typeof updateDealerSalesProfileSchema
>;

export const dealerPortalCustomerSchema = z.object({
  id: z.number().optional().nullable(),
  name: z.string().optional().nullable(),
  businessName: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phoneNo: z
    .preprocess(
      (value) => normalizeUSPhoneNumber(value as string | null | undefined),
      z
        .string()
        .regex(US_PHONE_FORMAT_PATTERN, "Use XXX-XXX-XXXX format")
        .optional(),
    )
    .nullable(),
  address: z.string().optional().nullable(),
  formattedAddress: z.string().optional().nullable(),
  address1: z.string().optional().nullable(),
  address2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip_code: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  customerTypeId: z.number().optional().nullable(),
  taxCode: z.string().optional().nullable(),
  taxProfileId: z.number().optional().nullable(),
});
export type DealerPortalCustomerSchema = z.infer<
  typeof dealerPortalCustomerSchema
>;

export const dealerPortalCustomerLookupSchema = z.object({
  id: z.number(),
});
export type DealerPortalCustomerLookupSchema = z.infer<
  typeof dealerPortalCustomerLookupSchema
>;

export const dealerPortalCustomerOfficeVisibilitySchema = z.object({
  id: z.number(),
  officeVisibility: z.enum(["PRIVATE", "SHARED"]),
});

export const dealerPortalSalesProfileSchema = z.object({
  id: z.number().optional().nullable(),
  title: z.string().min(1),
  coefficient: z.number().optional().nullable(),
  salesPercentage: z.number().optional().nullable(),
  defaultProfile: z.boolean().optional().nullable(),
});
export type DealerPortalSalesProfileSchema = z.infer<
  typeof dealerPortalSalesProfileSchema
>;

export const dealerPortalSalesDocumentsSchema = z.object({
  type: z.enum(["order", "quote"]),
});
export type DealerPortalSalesDocumentsSchema = z.infer<
  typeof dealerPortalSalesDocumentsSchema
>;

export const dealerPortalSalesListSchema = z.object({
  cursor: z.number().optional().nullable(),
  size: z.number().min(1).max(100).optional().nullable(),
  customerId: z.number().optional().nullable(),
  q: z.string().optional().nullable(),
  "customer.name": z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  orderNo: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  deliveryOption: z.string().optional().nullable(),
  customerProfileId: z.string().optional().nullable(),
  amountDue: z.enum(["due", "paid", "credit"]).optional().nullable(),
  invoiceStatus: z.string().optional().nullable(),
  paymentStatus: z.enum(["due", "paid", "credit"]).optional().nullable(),
});
export type DealerPortalSalesListSchema = z.infer<
  typeof dealerPortalSalesListSchema
>;

export const dealerPortalCustomersListSchema = z.object({
  cursor: z.number().optional().nullable(),
  size: z.number().min(1).max(100).optional().nullable(),
  q: z.string().optional().nullable(),
  "customer.name": z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  profile: z.string().optional().nullable(),
});
export type DealerPortalCustomersListSchema = z.infer<
  typeof dealerPortalCustomersListSchema
>;

export const dealerPortalSalesDocumentSchema = z.object({
  id: z.number(),
});
export type DealerPortalSalesDocumentSchema = z.infer<
  typeof dealerPortalSalesDocumentSchema
>;

export const dealerPortalPrintDocumentSchema = z.object({
  id: z.number(),
  mode: z.enum(["quote", "invoice"]),
  pricingMode: z.enum(["customer", "internal"]),
});
export type DealerPortalPrintDocumentSchema = z.infer<
  typeof dealerPortalPrintDocumentSchema
>;

export const dealerPortalCreatePaymentLinkSchema = z.object({
  id: z.number(),
  amount: z.number().positive().optional().nullable(),
});
export type DealerPortalCreatePaymentLinkSchema = z.infer<
  typeof dealerPortalCreatePaymentLinkSchema
>;

export const dealerPortalCustomerPaymentStatusSchema = z.object({
  id: z.number(),
  status: z.enum(["unpaid", "paid"]),
  note: z.string().max(500).optional().nullable(),
});
export type DealerPortalCustomerPaymentStatusSchema = z.infer<
  typeof dealerPortalCustomerPaymentStatusSchema
>;

export const dealerPortalSalesLineItemSchema = salesFormPortableLineItemSchema;
export type DealerPortalSalesLineItemSchema = z.infer<
  typeof dealerPortalSalesLineItemSchema
>;

export const dealerPortalSaveQuoteSchema = z.object({
  id: z.number().optional().nullable(),
  customerId: z.number(),
  customerProfileId: z.number().optional().nullable(),
  pricingContext: z
    .object({
      salesCoefficient: z.number().positive().optional().nullable(),
      dealerSalesPercentage: z.number().optional().nullable(),
    })
    .optional()
    .nullable(),
  po: z.string().optional().nullable(),
  paymentTerm: z.string().optional().nullable(),
  goodUntil: z.string().optional().nullable(),
  deliveryOption: z.string().optional().nullable(),
  paymentMethod: z.string().optional().nullable(),
  taxCode: z.string().optional().nullable(),
  taxRate: z.number().min(0).max(100).optional().nullable(),
  lineItems: z.array(dealerPortalSalesLineItemSchema).min(1),
});
export type DealerPortalSaveQuoteSchema = z.infer<
  typeof dealerPortalSaveQuoteSchema
>;

export const dealerPortalConvertQuoteSchema = z.object({
  id: z.number(),
});
export type DealerPortalConvertQuoteSchema = z.infer<
  typeof dealerPortalConvertQuoteSchema
>;

export const dealerPortalRequestQuoteOrderSchema = z.object({
  id: z.number(),
});
export type DealerPortalRequestQuoteOrderSchema = z.infer<
  typeof dealerPortalRequestQuoteOrderSchema
>;

const dealerLogoUrlSchema = z.string().refine(
  (value) => {
    if (!value) return true;
    if (z.string().url().safeParse(value).success) return true;
    return /^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,/i.test(value);
  },
  {
    message: "Use a valid image URL or uploaded image.",
  },
);

export const dealerPortalSettingsSchema = z.object({
  name: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  phoneNo: z
    .preprocess(
      (value) => normalizeUSPhoneNumber(value as string | null | undefined),
      z
        .string()
        .regex(US_PHONE_FORMAT_PATTERN, "Use XXX-XXX-XXXX format")
        .optional(),
    )
    .nullable(),
  logoUrl: dealerLogoUrlSchema.optional().nullable(),
  address1: z.string().optional().nullable(),
  address2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip_code: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  defaultTaxCode: z.string().optional().nullable(),
  defaultCustomerProfileId: z.number().optional().nullable(),
  defaultFulfillmentMode: z
    .enum(["pickup", "delivery", "ship"])
    .optional()
    .nullable(),
});
export type DealerPortalSettingsSchema = z.infer<
  typeof dealerPortalSettingsSchema
>;

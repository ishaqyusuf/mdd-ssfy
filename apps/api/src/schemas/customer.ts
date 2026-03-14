import { paginationSchema } from "@gnd/utils/schema";
import { z } from "zod";

export const searchCustomersSchema = z.object({
  query: z.string().optional(),
});

export type SearchCustomersSchema = z.infer<typeof searchCustomersSchema>;

export const getCustomersSchema = z.object({}).extend(paginationSchema.shape);
export type GetCustomers = z.infer<typeof getCustomersSchema>;

export const upsertCustomerSchema = z
  .object({
    profileId: z.string().optional().nullable(),
    id: z.number().optional(),
    customerId: z.number().optional(),
    addressOnly: z.boolean().nullable().optional(),
    phoneNo: z.string().optional(),
    phoneNo2: z.string().optional(),
    route: z.string().optional(),
    email: z.string().optional(),
    address1: z.string().optional().nullable(),
    formattedAddress: z.string().optional().nullable(),
    address2: z.string().optional(),
    name: z.string().optional(),
    businessName: z.string().optional(),
    addressId: z.number().optional(),
    zip_code: z.string().optional(),
    lat: z.number().optional().nullable(),
    lng: z.number().optional().nullable(),
    placeId: z.string().optional().nullable(),
    taxCode: z.string().optional(),
    country: z.string().optional(),
    state: z.string().optional(),
    city: z.string().optional(),
    taxProfileId: z.number().optional(),
    netTerm: z.string().optional(),
    customerType: z.enum(["Personal", "Business"]).optional(),
    existingCustomers: z.array(z.any()).nullable().optional().default(undefined),
  })
  .superRefine((data, ctx) => {
    if (data.addressOnly) return;
    if (!data.profileId)
      ctx.addIssue({
        path: ["profileId"],
        message: "Profile is required!",
        code: "custom",
      });
    if (data.customerType === "Personal" && !data.name) {
      ctx.addIssue({
        path: ["name"],
        message: "Name is required for Individual customers",
        code: "custom",
      });
    }
    if (data.existingCustomers?.length) {
      ctx.addIssue({
        path: ["existingCustomers"],
        message: "Resolve conflict customer",
        code: "custom",
      });
    }
    if (data.customerType === "Business" && !data.businessName) {
      ctx.addIssue({
        path: ["businessName"],
        message: "Business Name is required for Business customers",
        code: "custom",
      });
    }
  });
export type UpsertCustomerSchema = z.infer<typeof upsertCustomerSchema>;

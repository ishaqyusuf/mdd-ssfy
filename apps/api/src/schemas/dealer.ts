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
        message: "Dealer name is required when no existing customer is selected.",
      });
    }
  });
export type CreateDealerAccountSchema = z.infer<
  typeof createDealerAccountSchema
>;

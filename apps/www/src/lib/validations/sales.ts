import { z } from "zod";

export const salesFormSchema = z.object({
    title: z.string(),
    refNo: z.string().optional(),
    builderId: z.number(),
    address: z.string().optional(),
    meta: z
        .object({
            supervisor: z
                .object({
                    name: z.string().optional(),
                    email: z.string().optional()
                })
                .optional()
        })
        .optional()
});
export const salesAddressSchema = z.object({
    billingAddress: z.object({
        // phoneNo:
    })
});

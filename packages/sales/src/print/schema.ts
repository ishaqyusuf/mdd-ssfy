import { z } from "zod";

export const printSalesV2Schema = z.object({
	ids: z.array(z.number()).min(1),
	mode: z.string().min(1),
	pricingMode: z.enum(["customer", "internal"]).optional(),
	dispatchId: z.number().optional().nullable(),
});

export type PrintSalesV2Input = z.infer<typeof printSalesV2Schema>;

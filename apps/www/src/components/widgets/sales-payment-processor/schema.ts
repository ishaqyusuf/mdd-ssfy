import { createPaymentSchema } from "@/actions/schema";
import { z } from "zod";

export const paymentProcessorFormSchema = createPaymentSchema
	.merge(
		z.object({
			linkProcessed: z.boolean().optional().nullable(),
			print: z.boolean().optional().nullable(),
			printPackingSlip: z.boolean().optional().nullable(),
			paymentStatus: z
				.enum(["processing", "completed", "failed", "idle", "cancelled"])
				.optional()
				.nullable(),
			editPrice: z.boolean().default(false),
			sales: z.array(
				z.object({
					id: z.number(),
					selected: z.boolean(),
				}),
			),
		}),
	)
	.superRefine((data, ctx) => {
		if (data?.sales?.filter((s) => s.selected).length === 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Select at least one sale to proceed",
			});
		}
	});

"use client";

import { useZodForm } from "@/hooks/use-zod-form";
import { FormProvider } from "react-hook-form";
import { z } from "zod";

const dateInputSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid delivery date")
	.refine(
		(value) => !Number.isNaN(new Date(`${value}T12:00:00`).getTime()),
		"Choose a valid delivery date",
	);

export const dispatchCreateFormSchema = z
	.object({
		salesIds: z
			.array(z.number().int().positive())
			.min(1, "Select at least one order")
			.max(50, "You can create up to 50 dispatches at a time"),
		deliveryMode: z.enum(["delivery", "pickup"]),
		batchDueDate: dateInputSchema.nullable(),
		orderDueDates: z.record(z.string(), dateInputSchema),
		driverId: z.number().int().positive().nullable(),
	})
	.superRefine((value, ctx) => {
		for (const [index, salesId] of value.salesIds.entries()) {
			if (!value.orderDueDates[String(salesId)]) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Choose a delivery date for this order",
					path: ["salesIds", index],
				});
			}
		}
	});

export type DispatchCreateFormValues = z.infer<typeof dispatchCreateFormSchema>;

export function DispatchFormContext({
	children,
	salesId,
}: {
	children: React.ReactNode;
	salesId?: number | null;
}) {
	const form = useZodForm(dispatchCreateFormSchema, {
		defaultValues: {
			salesIds: salesId ? [salesId] : [],
			deliveryMode: "delivery",
			batchDueDate: null,
			orderDueDates: {},
			driverId: null,
		},
		mode: "onChange",
	});
	return <FormProvider {...form}>{children}</FormProvider>;
}

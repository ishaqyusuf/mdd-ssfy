"use client";

import { useZodForm } from "@/hooks/use-zod-form";
import { FormProvider } from "react-hook-form";
import { z } from "zod";

export const dispatchCreateFormSchema = z.object({
	salesId: z.number().int().positive("Select an order"),
	deliveryMode: z.enum(["delivery", "pickup"]),
	dueDate: z.string().min(1, "Delivery date is required"),
	driverId: z.number().int().positive().nullable(),
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
			salesId: salesId || 0,
			deliveryMode: "delivery",
			dueDate: new Date().toISOString().slice(0, 10),
			driverId: null,
		},
		mode: "onChange",
	});
	return <FormProvider {...form}>{children}</FormProvider>;
}

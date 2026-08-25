"use client";

import { useZodForm } from "@/hooks/use-zod-form";
import { FormProvider } from "react-hook-form";
import { z } from "zod";

export const dispatchCreateFormSchema = z.object({
	salesIds: z.array(z.number().int().positive()).min(1, "Select at least one order"),
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
			salesIds: salesId ? [salesId] : [],
			deliveryMode: "delivery",
			dueDate: new Date().toISOString().slice(0, 10),
			driverId: null,
		},
		mode: "onChange",
	});
	return <FormProvider {...form}>{children}</FormProvider>;
}

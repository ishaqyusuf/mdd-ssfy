"use client";

import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@gnd/ui/field";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { z } from "zod";

const customerEmailSchema = z.object({
	email: z.string().trim().email("Please enter a valid email address."),
});

type CustomerEmailValues = z.infer<typeof customerEmailSchema>;

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	customerId: number | null | undefined;
	customerName?: string | null;
	description: string;
	onSaved: (email: string) => void | Promise<void>;
};

export function CustomerEmailRequiredDialog({
	open,
	onOpenChange,
	customerId,
	customerName,
	description,
	onSaved,
}: Props) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const form = useZodForm(customerEmailSchema, {
		defaultValues: { email: "" },
	});
	const updateEmail = useMutation(
		trpc.customers.updateCustomerEmail.mutationOptions(),
	);

	useEffect(() => {
		if (!open) form.reset({ email: "" });
	}, [form, open]);

	const submit = form.handleSubmit(async (values: CustomerEmailValues) => {
		if (!customerId) {
			toast.error("Select a customer before adding an email address.");
			return;
		}
		try {
			const email = values.email.trim();
			await updateEmail.mutateAsync({ customerId, email });
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: trpc.customers.getSalesCustomer.queryKey(),
				}),
				queryClient.invalidateQueries({
					queryKey: trpc.newSalesForm.resolveCustomer.queryKey(),
				}),
				queryClient.invalidateQueries({
					queryKey: trpc.sales.getSaleOverview.queryKey(),
				}),
				queryClient.invalidateQueries({
					queryKey: trpc.sales.getOrders.queryKey(),
				}),
			]);
			toast.success("Customer email updated.");
			await onSaved(email);
			onOpenChange(false);
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Unable to update the customer email.",
			);
		}
	});

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (!updateEmail.isPending) onOpenChange(nextOpen);
			}}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Customer email required</DialogTitle>
					<DialogDescription>
						{customerName ? `${customerName} needs an email address. ` : ""}
						{description}
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={submit} className="flex flex-col gap-4" noValidate>
					<FieldGroup>
						<Field
							data-invalid={Boolean(form.formState.errors.email)}
							data-disabled={updateEmail.isPending || undefined}
						>
							<FieldLabel htmlFor="required-customer-email">
								Email address
							</FieldLabel>
							<Input
								id="required-customer-email"
								type="email"
								placeholder="customer@example.com"
								autoComplete="email"
								autoFocus
								aria-invalid={Boolean(form.formState.errors.email)}
								disabled={updateEmail.isPending}
								{...form.register("email")}
							/>
							<FieldError errors={[form.formState.errors.email]} />
						</Field>
					</FieldGroup>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							disabled={updateEmail.isPending}
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={updateEmail.isPending}>
							{updateEmail.isPending ? (
								<Icons.Loader2
									data-icon="inline-start"
									className="animate-spin"
								/>
							) : null}
							Save email and continue
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

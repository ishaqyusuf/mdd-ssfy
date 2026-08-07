"use client";

import { salesAddressPaneSchema } from "@/actions/schema";
import { SubmitButton } from "@/components/submit-button";
import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import Sheet from "@gnd/ui/custom/sheet-v2";
import { useMutation, useQuery } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { useEffect } from "react";
import { FormProvider } from "react-hook-form";

import { CustomerAddressFields } from "../../forms/customer-form/customer-address-fields";
import { createSalesAddressPaneDraft } from "./sales-address-pane-state";

export type SalesAddressPaneSelection = {
	addressId?: number | null;
	addressType: "billing" | "shipping";
	label: string;
};

export function SalesAddressPane({
	selection,
	billingAddressId,
	customerId,
	salesId,
	onClose,
}: {
	selection: SalesAddressPaneSelection;
	billingAddressId?: number | null;
	customerId: number;
	salesId: number;
	onClose: () => void;
}) {
	const trpc = useTRPC();
	const customerQuery = useQuery(
		trpc.customers.getSalesCustomer.queryOptions({
			customerId,
			billingId:
				selection.addressType === "billing"
					? selection.addressId
					: billingAddressId,
			shippingId:
				selection.addressType === "shipping" ? selection.addressId : undefined,
		}),
	);
	const form = useZodForm(salesAddressPaneSchema, {
		defaultValues: createSalesAddressPaneDraft({
			addressId: selection.addressId,
		}),
	});

	useEffect(() => {
		if (!customerQuery.data) return;
		const selectedAddress =
			selection.addressType === "billing"
				? customerQuery.data.billingAddress
				: customerQuery.data.shippingAddress;
		form.reset(
			createSalesAddressPaneDraft({
				addressId: selection.addressId,
				billingAddress: customerQuery.data.billingAddress,
				selectedAddress,
			}),
		);
	}, [customerQuery.data, form, selection.addressId, selection.addressType]);

	const mutation = useMutation(
		trpc.customers.assignSalesAddress.mutationOptions({
			onSuccess: () => {
				toast({ title: `${selection.label} updated` });
				onClose();
			},
			onError: (error) => {
				toast({
					title: `Unable to update ${selection.label.toLowerCase()}`,
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);
	const formId = `sales-${salesId}-${selection.addressType}-address-form`;
	const action = selection.addressId ? "Edit" : "Add";

	return (
		<FormProvider {...form}>
			<Sheet.SecondaryContent
				className="px-1"
				Header={
					<Sheet.SecondaryHeader
						title={`${action} ${selection.label}`}
						description="This address applies to this sale."
					/>
				}
				Footer={
					<Sheet.SecondaryFooter className="flex-row justify-end gap-3">
						<Button
							type="button"
							variant="outline"
							onClick={onClose}
							disabled={mutation.isPending}
						>
							Cancel
						</Button>
						<SubmitButton
							type="submit"
							form={formId}
							isSubmitting={mutation.isPending}
							disabled={customerQuery.isPending || !customerQuery.data}
						>
							Save
						</SubmitButton>
					</Sheet.SecondaryFooter>
				}
			>
				<form
					id={formId}
					className="space-y-6 py-2"
					onSubmit={form.handleSubmit((values) => {
						mutation.mutate({
							addressType: selection.addressType,
							customerId,
							salesId,
							addressId: values.addressId ?? selection.addressId,
							name: values.name,
							address1: values.address1,
							address2: values.address2,
							city: values.city,
							country: values.country,
							formattedAddress: values.formattedAddress,
							lat: values.lat,
							lng: values.lng,
							placeId: values.placeId,
							state: values.state,
							zip_code: values.zip_code,
						});
					})}
				>
					<CustomerAddressFields />
				</form>
			</Sheet.SecondaryContent>
		</FormProvider>
	);
}

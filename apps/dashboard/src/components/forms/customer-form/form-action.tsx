import { SubmitButton } from "@/components/submit-button";
import { useCreateCustomerParams } from "@/hooks/use-create-customer-params";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { useMutation } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";

import { useCustomerForm } from "./form-context";
import type { CustomerFormParams } from "./form-context";

type CustomerSaveResult = {
	addressId?: number;
	billingAddressId?: number;
	customerId: number;
	shippingAddressId?: number;
};

export function FormAction({
	disabled = false,
	formParams,
	onCancel,
	onSaved,
}: {
	disabled?: boolean;
	formParams?: CustomerFormParams;
	onCancel: () => void;
	onSaved?: (result: CustomerSaveResult) => void;
}) {
	const customerParams = useCreateCustomerParams();
	const setParams = customerParams.setParams;
	const params = formParams ?? (customerParams.params as CustomerFormParams);
	const form = useCustomerForm();
	const id = form.watch("id");
	const isEditing = params.address
		? Boolean(params.addressId)
		: (params.customerId ?? 0) > 0;
	const trpc = useTRPC();
	const { mutate: mutateAddress, isPending: isAddressSubmitting } = useMutation(
		trpc.customers.createCustomerAddress.mutationOptions({
			onSuccess: (resp) => {
				toast({
					title: id ? "Updated" : "Created",
				});
				setParams({
					customerForm: false,
					payload: {
						customerId: resp.customerId,
						addressId: resp.addressId,
						address: params.address ?? undefined,
					},
				});
			},
			onError() {
				toast({
					title: "Error",
				});
			},
		}),
	);
	const { mutate, isPending: isCustomerSubmitting } = useMutation(
		trpc.customers.createCustomer.mutationOptions({
			onError() {},
			onSuccess: (resp) => {
				toast({
					title: id ? "Updated" : "Created",
				});
				if (onSaved) {
					onSaved(resp);
				} else {
					setParams({
						customerForm: false,
						payload: {
							customerId: resp.customerId,
							addressId: resp.addressId,
							billingAddressId: resp.billingAddressId,
							shippingAddressId: resp.shippingAddressId,
							address: params.address ?? undefined,
						},
					});
				}
			},
		}),
	);
	const isSubmitting = isAddressSubmitting || isCustomerSubmitting;

	return (
		<div className="flex flex-1 py-4 items-center gap-4">
			<div className="text-sm text-muted-foreground">
				{params.address
					? `${isEditing ? "Update" : "Create"} this address only`
					: isEditing
						? "Update customer information"
						: "Create a new customer"}
			</div>
			<div className="flex-1" />
			<div className="flex gap-3">
				<Button
					type="button"
					variant="outline"
					onClick={onCancel}
					disabled={disabled || isSubmitting}
				>
					Cancel
				</Button>
				<form
					onSubmit={form.handleSubmit(
						params?.address
							? (values) => mutateAddress(values)
							: (values) =>
									mutate(
										params.addressReadOnly
											? {
													...values,
													billingAddress: undefined,
													customerOnly: true,
													shippingAddress: undefined,
													shippingSameAsBilling: undefined,
												}
											: values,
									),
					)}
				>
					<SubmitButton
						isSubmitting={isSubmitting}
						disabled={disabled}
						className="min-w-[120px]"
					>
						{isEditing ? "Update" : "Create"}
					</SubmitButton>
				</form>
			</div>
		</div>
	);
}

"use client";

import { CustomerForm } from "@/components/forms/customer-form/customer-form";
import { FormAction } from "@/components/forms/customer-form/form-action";
import {
	type CustomerFormParams,
	FormContext,
} from "@/components/forms/customer-form/form-context";
import { useTRPC } from "@/trpc/client";
import Sheet from "@gnd/ui/custom/sheet";
import { useQuery } from "@gnd/ui/tanstack";
import { useMemo } from "react";

export function CustomerEditPane({
	billingAddressId,
	addressEditingLocked,
	customerId,
	onClose,
	salesId,
	salesType,
	shippingAddressId,
}: {
	addressEditingLocked?: boolean;
	billingAddressId?: number | null;
	customerId: number;
	onClose: () => void;
	salesId: number;
	salesType: "order" | "quote";
	shippingAddressId?: number | null;
}) {
	const trpc = useTRPC();
	const customerQuery = useQuery(
		trpc.customers.getSalesCustomer.queryOptions({
			billingId: billingAddressId,
			customerId,
			shippingId: shippingAddressId,
		}),
	);
	const formParams = useMemo<CustomerFormParams>(
		() => ({
			addressReadOnly: addressEditingLocked,
			billingAddressId,
			customerForm: true,
			customerId,
			formSectionsTrigger: ["general"],
			salesId,
			salesType,
			shippingAddressId,
		}),
		[
			addressEditingLocked,
			billingAddressId,
			customerId,
			salesId,
			salesType,
			shippingAddressId,
		],
	);

	return (
		<FormContext
			data={customerQuery.data?.customerForm}
			formParams={formParams}
		>
			<Sheet.SecondaryContent
				className="px-1"
				Header={
					<Sheet.SecondaryHeader
						title="Edit Customer"
						description={
							addressEditingLocked
								? "Update customer information. Fulfilled-sale addresses are read-only."
								: "Update customer, billing, and shipping information for this sale."
						}
					/>
				}
				Footer={
					<Sheet.SecondaryFooter>
						<FormAction
							disabled={customerQuery.isPending || !customerQuery.data}
							formParams={formParams}
							onCancel={onClose}
							onSaved={onClose}
						/>
					</Sheet.SecondaryFooter>
				}
			>
				{customerQuery.data?.customerForm ? (
					<CustomerForm formParams={formParams} />
				) : customerQuery.isError ? (
					<p className="py-8 text-sm text-destructive">
						Unable to load this customer.
					</p>
				) : (
					<p className="py-8 text-sm text-muted-foreground">
						Loading customer information…
					</p>
				)}
			</Sheet.SecondaryContent>
		</FormContext>
	);
}

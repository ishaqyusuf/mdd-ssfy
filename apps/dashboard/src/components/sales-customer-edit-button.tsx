"use client";

import { useAuth } from "@/hooks/use-auth";
import { useCreateCustomerParams } from "@/hooks/use-create-customer-params";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useEffect, useRef } from "react";

export function getSalesCustomerEditParams(
	customerId?: number | null,
	context: {
		billingAddressId?: number | null;
		salesId?: number | null;
		salesType?: "order" | "quote" | null;
		shippingAddressId?: number | null;
	} = {},
) {
	if (!customerId || !Number.isFinite(customerId) || customerId <= 0) {
		return null;
	}

	return {
		customerForm: true,
		customerId,
		...(context.salesType ? { salesType: context.salesType } : {}),
		...(context.salesId != null ? { salesId: context.salesId } : {}),
		...(context.billingAddressId != null
			? { billingAddressId: context.billingAddressId }
			: {}),
		...(context.shippingAddressId != null
			? { shippingAddressId: context.shippingAddressId }
			: {}),
	};
}

export function isCompletedSalesCustomerEdit({
	payloadCustomerId,
	requestedCustomerId,
}: {
	payloadCustomerId?: number;
	requestedCustomerId?: number | null;
}) {
	return (
		requestedCustomerId != null && payloadCustomerId === requestedCustomerId
	);
}

type SalesAddressType = "bad" | "sad";

export function getSalesAddressEditParams({
	customerId,
	addressId,
	address,
}: {
	customerId?: number | null;
	addressId?: number | null;
	address: SalesAddressType;
}): {
	customerForm: true;
	customerId: number;
	address: SalesAddressType;
	addressId?: number;
} | null {
	if (!customerId || !Number.isFinite(customerId) || customerId <= 0) {
		return null;
	}

	return {
		customerForm: true,
		customerId,
		address,
		...(addressId && Number.isFinite(addressId) && addressId > 0
			? { addressId }
			: {}),
	};
}

export function isCompletedSalesAddressEdit({
	payloadCustomerId,
	payloadAddress,
	requestedCustomerId,
	requestedAddress,
}: {
	payloadCustomerId?: number;
	payloadAddress?: SalesAddressType;
	requestedCustomerId?: number | null;
	requestedAddress?: SalesAddressType | null;
}) {
	return (
		requestedCustomerId != null &&
		payloadCustomerId === requestedCustomerId &&
		payloadAddress === requestedAddress
	);
}

export function SalesCustomerEditButton({
	customerId,
	billingAddressId,
	salesId,
	shippingAddressId,
	salesType,
	onEdit,
	readOnly = false,
}: {
	customerId?: number | null;
	billingAddressId?: number | null;
	salesId?: number | null;
	shippingAddressId?: number | null;
	salesType?: "order" | "quote" | null;
	onEdit?: () => void;
	readOnly?: boolean;
}) {
	const auth = useAuth();
	const { params, setParams } = useCreateCustomerParams();
	const requestedCustomerIdRef = useRef<number | null>(null);
	const editParams = getSalesCustomerEditParams(customerId, {
		billingAddressId,
		salesId,
		salesType,
		shippingAddressId,
	});
	const payloadCustomerId = params.payload?.customerId;

	useEffect(() => {
		const requestedCustomerId = requestedCustomerIdRef.current;
		if (
			isCompletedSalesCustomerEdit({
				payloadCustomerId,
				requestedCustomerId,
			})
		) {
			requestedCustomerIdRef.current = null;
			void setParams(null);
			return;
		}

		if (
			requestedCustomerId != null &&
			!params.customerForm &&
			!payloadCustomerId
		) {
			requestedCustomerIdRef.current = null;
		}
	}, [params.customerForm, payloadCustomerId, setParams]);

	if (!editParams || readOnly || !auth.can?.editSalesCustomers) return null;

	return (
		<Button
			aria-label="Edit customer"
			title="Edit customer"
			type="button"
			size="xs"
			variant="outline"
			onClick={() => {
				if (onEdit) {
					onEdit();
					return;
				}
				requestedCustomerIdRef.current = editParams.customerId;
				void setParams(editParams);
			}}
		>
			<Icons.Edit className="mr-1 size-3.5" />
			Edit customer
		</Button>
	);
}

export function SalesAddressEditButton({
	customerId,
	addressId,
	address,
	label,
	onEdit,
	readOnly = false,
}: {
	customerId?: number | null;
	addressId?: number | null;
	address: SalesAddressType;
	label: string;
	onEdit?: () => void;
	readOnly?: boolean;
}) {
	const auth = useAuth();
	const { params, setParams } = useCreateCustomerParams();
	const requestedEditRef = useRef<{
		customerId: number;
		address: SalesAddressType;
	} | null>(null);
	const editParams = getSalesAddressEditParams({
		customerId,
		addressId,
		address,
	});
	const payloadCustomerId = params.payload?.customerId;
	const payloadAddress = params.payload?.address;

	useEffect(() => {
		const requestedEdit = requestedEditRef.current;
		if (
			requestedEdit &&
			isCompletedSalesAddressEdit({
				payloadCustomerId,
				payloadAddress,
				requestedCustomerId: requestedEdit.customerId,
				requestedAddress: requestedEdit.address,
			})
		) {
			requestedEditRef.current = null;
			void setParams(null);
			return;
		}

		if (requestedEdit && !params.customerForm && !payloadCustomerId) {
			requestedEditRef.current = null;
		}
	}, [params.customerForm, payloadAddress, payloadCustomerId, setParams]);

	if (!editParams || readOnly || !auth.can?.editSalesCustomers) return null;

	const action = addressId ? "Edit" : "Add";
	return (
		<Button
			aria-label={`${action} ${label}`}
			title={`${action} ${label}`}
			type="button"
			size="xs"
			variant="outline"
			onClick={() => {
				if (onEdit) {
					onEdit();
					return;
				}
				requestedEditRef.current = {
					customerId: editParams.customerId,
					address: editParams.address,
				};
				void setParams(editParams);
			}}
		>
			<Icons.Edit className="mr-1 size-3.5" />
			{action}
		</Button>
	);
}

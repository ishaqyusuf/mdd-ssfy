"use client";

import { useAuth } from "@/hooks/use-auth";
import { useCreateCustomerParams } from "@/hooks/use-create-customer-params";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useEffect, useRef } from "react";

export function getSalesCustomerEditParams(
	customerId?: number | null,
): { customerForm: true; customerId: number } | null {
	if (!customerId || !Number.isFinite(customerId) || customerId <= 0) {
		return null;
	}

	return {
		customerForm: true,
		customerId,
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

export function SalesCustomerEditButton({
	customerId,
	readOnly = false,
}: {
	customerId?: number | null;
	readOnly?: boolean;
}) {
	const auth = useAuth();
	const { params, setParams } = useCreateCustomerParams();
	const requestedCustomerIdRef = useRef<number | null>(null);
	const editParams = getSalesCustomerEditParams(customerId);
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

	if (!editParams || readOnly || !auth.can?.editOrders) return null;

	return (
		<Button
			aria-label="Edit customer"
			title="Edit customer"
			type="button"
			size="xs"
			variant="outline"
			onClick={() => {
				requestedCustomerIdRef.current = editParams.customerId;
				void setParams(editParams);
			}}
		>
			<Icons.Edit className="mr-1 size-3.5" />
			Edit customer
		</Button>
	);
}

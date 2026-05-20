"use client";

import { useCustomerFormParams } from "@/hooks/use-customer-form-params";
import { useSalesProfileFormParams } from "@/hooks/use-sales-profile-form-params";
import { CustomerFormModal } from "./customer-form-modal";
import { SalesProfileFormModal } from "./sales-profile-form-modal";

export function GlobalModals() {
	const customerForm = useCustomerFormParams();
	const profileForm = useSalesProfileFormParams();

	return (
		<>
			{customerForm.opened ? <CustomerFormModal /> : null}
			{profileForm.opened ? <SalesProfileFormModal /> : null}
		</>
	);
}

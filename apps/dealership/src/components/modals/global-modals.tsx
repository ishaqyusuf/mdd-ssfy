"use client";

import { CustomerOverviewSheet } from "@/components/customer-overview/customer-overview-sheet";
import { useCustomerFormParams } from "@/hooks/use-customer-form-params";
import { useSalesProfileFormParams } from "@/hooks/use-sales-profile-form-params";
import { CustomerFormModal } from "./customer-form-modal";
import { SalesProfileFormModal } from "./sales-profile-form-modal";

export function GlobalModals() {
	const customerForm = useCustomerFormParams();
	const profileForm = useSalesProfileFormParams();

	return (
		<>
			<CustomerOverviewSheet />
			{customerForm.opened ? <CustomerFormModal /> : null}
			{profileForm.opened ? <SalesProfileFormModal /> : null}
		</>
	);
}

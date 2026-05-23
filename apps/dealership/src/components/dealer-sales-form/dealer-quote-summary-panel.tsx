"use client";

import {
	SalesFormCustomerOverviewCard,
	SalesFormInvoiceDetailsPanel,
	SalesFormPricingOverview,
	buildSalesFormProfileSelectOptions,
	buildSalesFormSelectOptions,
	salesFormDeliveryOptions,
	salesFormPaymentMethods,
	salesFormPaymentTerms,
	type SalesFormSelectOption,
} from "@gnd/sales/sales-form";
import { Button } from "@gnd/ui/button";
import { Save } from "lucide-react";
import type { DealerSalesFormCustomer, DealerSalesFormProfile } from "./types";

type DealerQuoteSummaryPanelProps = {
	customer?: DealerSalesFormCustomer | null;
	profiles: DealerSalesFormProfile[];
	customerProfileId?: number | null;
	subTotal?: number | null;
	taxTotal?: number | null;
	grandTotal?: number | null;
	taxCode?: string | null;
	taxOptions: SalesFormSelectOption[];
	po?: string | null;
	paymentTerm?: string | null;
	goodUntil?: string | null;
	deliveryOption?: string | null;
	isSaving?: boolean;
	isFetching?: boolean;
	canSave?: boolean;
	isEditing?: boolean;
	onChangeCustomer: () => void;
	onProfileChange: (customerProfileId: number | null) => void;
	onTaxCodeChange: (taxCode: string | null) => void;
	onPoChange: (value: string) => void;
	onPaymentTermChange: (value: string) => void;
	onGoodUntilChange: (value: string | null) => void;
	onDeliveryOptionChange: (value: string) => void;
	onSave: () => void;
};

export function DealerQuoteSummaryPanel(props: DealerQuoteSummaryPanelProps) {
	const profileOptions = buildSalesFormProfileSelectOptions(props.profiles);
	const paymentTermOptions = buildSalesFormSelectOptions(salesFormPaymentTerms);
	const deliveryOptions = buildSalesFormSelectOptions(salesFormDeliveryOptions);
	const paymentMethodOptions = buildSalesFormSelectOptions(
		salesFormPaymentMethods,
	);
	const customerName =
		props.customer?.businessName || props.customer?.name || props.customer?.email;

	return (
		<div className="flex flex-col gap-5">
			<SalesFormCustomerOverviewCard
				customerName={customerName}
				customerInitials={customerName?.slice(0, 2)}
				accountNumber={props.customer?.id}
				profileOptions={profileOptions}
				profileValue={
					props.customerProfileId ? String(props.customerProfileId) : "none"
				}
				billingFallback="Dealer billing address"
				shippingFallback="Dealer shipping address"
				onChangeCustomer={props.onChangeCustomer}
				onProfileChange={(value) =>
					props.onProfileChange(value === "none" ? null : Number(value || 0))
				}
			/>
			<SalesFormInvoiceDetailsPanel
				deliveryOption={props.deliveryOption || "pickup"}
				deliveryOptions={deliveryOptions}
				goodUntil={props.goodUntil}
				onDeliveryOptionChange={props.onDeliveryOptionChange}
				onGoodUntilChange={props.onGoodUntilChange}
				onPaymentTermChange={props.onPaymentTermChange}
				onPoChange={props.onPoChange}
				paymentTerm={props.paymentTerm || "None"}
				paymentTerms={paymentTermOptions}
				po={props.po}
			/>
			<SalesFormPricingOverview
				grandTotal={props.grandTotal}
				paymentMethod="None"
				paymentMethods={paymentMethodOptions}
				showAddOnCost={false}
				showCcc={false}
				showLaborCost={false}
				showPaymentMethod={false}
				showTaxGroup
				subTotal={props.subTotal}
				taxCode={props.taxCode || "none"}
				taxOptions={props.taxOptions}
				taxTotal={props.taxTotal}
				onTaxCodeChange={(value) =>
					props.onTaxCodeChange(value === "none" ? null : value)
				}
			/>
			<Button
				className="w-full"
				disabled={props.isSaving || props.isFetching || !props.canSave}
				onClick={props.onSave}
				type="button"
			>
				<Save className="mr-2 size-4" />
				{props.isSaving
					? "Saving..."
					: props.isEditing
						? "Update quote"
						: "Save quote"}
			</Button>
		</div>
	);
}

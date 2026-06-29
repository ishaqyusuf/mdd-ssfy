"use client";

import {
	SalesFormInvoiceDetailsPanel,
	SalesFormDealerProfileCard,
	SalesFormPricingOverview,
	buildSalesFormSelectOptions,
	salesFormDeliveryOptions,
	salesFormPaymentMethods,
	salesFormPaymentTerms,
	type SalesFormSelectOption,
} from "@gnd/sales/sales-form";
import { Button } from "@gnd/ui/button";
import { Switch } from "@gnd/ui/switch";
import { Save } from "lucide-react";
import { DealerCustomerCard } from "./dealer-customer-card";
import { dealerPricingTerms } from "./dealer-pricing-terms";
import type {
	DealerInternalSalesFormProfile,
	DealerSalesFormCustomer,
	DealerSalesFormProfile,
} from "./types";

type DealerQuoteSummaryPanelProps = {
	dealerName?: string | null;
	dealerEmail?: string | null;
	customer?: DealerSalesFormCustomer | null;
	profiles: DealerSalesFormProfile[];
	internalProfile?: DealerInternalSalesFormProfile | null;
	customerProfileId?: number | null;
	costSubTotal?: number | null;
	salesCoefficient?: number | null;
	subTotal?: number | null;
	internalSubTotal?: number | null;
	dealerSubTotal?: number | null;
	grossProfit?: number | null;
	marginPercent?: number | null;
	dealerSalesPercentage?: number | null;
	internalProfileLabel?: string | null;
	dealerProfileLabel?: string | null;
	pricingView?: "internal" | "dealer";
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
	showDealerProfileCard?: boolean;
	showMargin?: boolean;
	onChangeCustomer: () => void;
	onProfileChange: (customerProfileId: number | null) => void;
	onPricingViewChange: (pricingView: "internal" | "dealer") => void;
	onShowMarginChange: (showMargin: boolean) => void;
	onTaxCodeChange: (taxCode: string | null) => void;
	onPoChange: (value: string) => void;
	onPaymentTermChange: (value: string) => void;
	onGoodUntilChange: (value: string | null) => void;
	onDeliveryOptionChange: (value: string) => void;
	onSave: () => void;
};

function formatCurrency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 2,
	}).format(Number(value || 0));
}

function formatPercent(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		maximumFractionDigits: 2,
	}).format(Number(value || 0));
}

export function DealerQuoteSummaryPanel(props: DealerQuoteSummaryPanelProps) {
	const paymentTermOptions = buildSalesFormSelectOptions(salesFormPaymentTerms);
	const deliveryOptions = buildSalesFormSelectOptions(salesFormDeliveryOptions);
	const paymentMethodOptions = buildSalesFormSelectOptions(
		salesFormPaymentMethods,
	);

	return (
		<div className="flex flex-col gap-5">
			{props.showDealerProfileCard ? (
				<SalesFormDealerProfileCard
					dealerEmail={props.dealerEmail}
					dealerName={props.dealerName}
					internalProfile={props.internalProfile}
					profile={props.profiles.find(
						(profile) => profile.id === props.customerProfileId,
					)}
					showInternalProfile
				/>
			) : null}
			<DealerCustomerCard
				customer={props.customer}
				profiles={props.profiles}
				profileValue={
					props.customerProfileId ? String(props.customerProfileId) : "none"
				}
				onChangeCustomer={props.onChangeCustomer}
				onProfileChange={props.onProfileChange}
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
				totalBreakdown={
					process.env.NODE_ENV !== "production"
						? {
								context: {
									enabled: true,
									internalProfileCoefficient: props.salesCoefficient,
									dealerSalesPercentage: props.dealerSalesPercentage,
									internalProfileLabel: props.internalProfileLabel,
									dealerProfileLabel: props.dealerProfileLabel,
									labels: {
										priceBreakdown: dealerPricingTerms.priceBreakdown,
										costPrice: dealerPricingTerms.costView,
										dealerProfile: "Dealer profile",
										dealerProfileSalesPrice: "Dealer sales price",
										customerProfile: "Customer profile",
										customerSalesPrice: "Customer sales price",
										displayedPrice: "Displayed total",
									},
								},
								subTotal: {
									costPrice: props.costSubTotal,
									displayPrice: props.subTotal,
								},
								grandTotal: {
									costPrice: props.costSubTotal,
									displayPrice: props.grandTotal,
								},
							}
						: undefined
				}
				taxCode={props.taxCode || "none"}
				taxOptions={props.taxOptions}
				taxTotal={props.taxTotal}
				onTaxCodeChange={(value) =>
					props.onTaxCodeChange(value === "none" ? null : value)
				}
			/>
			<div className="rounded-xl border bg-card p-4">
				<div className="grid grid-cols-2 gap-2">
					<Button
						type="button"
						variant={props.pricingView === "internal" ? "default" : "outline"}
						onClick={() => props.onPricingViewChange("internal")}
					>
						{dealerPricingTerms.costView}
					</Button>
					<Button
						type="button"
						variant={props.pricingView === "dealer" ? "default" : "outline"}
						onClick={() => props.onPricingViewChange("dealer")}
					>
						{dealerPricingTerms.salesPriceView}
					</Button>
				</div>
			</div>
			<div className="rounded-xl border bg-card p-4">
				<div className="flex items-center justify-between gap-3">
					<div>
						<div className="text-sm font-semibold">
							{dealerPricingTerms.showProfit}
						</div>
						<div className="text-xs text-muted-foreground">
							{dealerPricingTerms.profitDescription}
						</div>
					</div>
					<Switch
						checked={!!props.showMargin}
						onCheckedChange={props.onShowMarginChange}
					/>
				</div>
				{props.showMargin ? (
					<div className="mt-4 space-y-2 border-t pt-3 text-sm">
						<MarginRow
							label={dealerPricingTerms.costSubtotal}
							value={formatCurrency(props.internalSubTotal)}
						/>
						<MarginRow
							label={dealerPricingTerms.salesPriceSubtotal}
							value={formatCurrency(props.dealerSubTotal)}
						/>
						<MarginRow
							label="Gross profit"
							value={formatCurrency(props.grossProfit)}
						/>
						<MarginRow
							label="Margin"
							value={`${formatPercent(props.marginPercent)}%`}
						/>
						<MarginRow
							label={dealerPricingTerms.salesPriceMarkup}
							value={`${formatPercent(props.dealerSalesPercentage)}%`}
						/>
					</div>
				) : null}
			</div>
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

function MarginRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between gap-3">
			<span className="text-muted-foreground">{label}</span>
			<span className="font-semibold">{value}</span>
		</div>
	);
}

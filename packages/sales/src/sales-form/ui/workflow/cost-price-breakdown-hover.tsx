/** @jsxImportSource react */
"use client";

import type { ReactNode } from "react";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@gnd/ui/hover-card";

function toNumber(value: unknown, fallback = 0) {
	const number = Number(value);
	return Number.isFinite(number) ? number : fallback;
}

function firstPositiveNumber(...values: unknown[]) {
	for (const value of values) {
		const number = Number(value);
		if (Number.isFinite(number) && number > 0) return number;
	}
	return null;
}

function currency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));
}

function roundCurrency(value: number) {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

function coefficientValue(value?: number | null) {
	const coefficient = Number(value ?? 1);
	return Number.isFinite(coefficient) && coefficient > 0 ? coefficient : 1;
}

function coefficientMultiplier(value?: number | null) {
	return Number((1 / coefficientValue(value)).toFixed(2));
}

function salesPercentageValue(value?: number | null) {
	const percentage = Number(value ?? 0);
	return Number.isFinite(percentage) ? percentage : 0;
}

export type CostPriceBreakdownLabels = {
	priceBreakdown?: string;
	costPrice?: string;
	dealerProfile?: string;
	dealerProfileSalesPrice?: string;
	customerProfile?: string;
	customerSalesPrice?: string;
	displayedPrice?: string;
};

export type CostPriceBreakdownContext = {
	enabled?: boolean;
	internalProfileCoefficient?: number | null;
	dealerSalesPercentage?: number | null;
	internalProfileLabel?: string | null;
	dealerProfileLabel?: string | null;
	labels?: CostPriceBreakdownLabels;
};

export type CostPriceBreakdownInput = {
	costPrice?: unknown;
	unitCostPrice?: unknown;
	quantity?: unknown;
	dealerProfileSalesPrice?: unknown;
	customerSalesPrice?: unknown;
	displayPrice?: unknown;
};

export type CostPriceBreakdown = {
	costPrice: number;
	internalProfileCoefficient: number;
	internalProfileMultiplier: number;
	dealerSalesPercentage: number;
	dealerProfileSalesPrice: number;
	customerSalesPrice: number;
	displayPrice: number;
	unitCostPrice: number | null;
	quantity: number | null;
	dealerProfileUnitSalesPrice: number | null;
	customerUnitSalesPrice: number | null;
	hasDealerProfileOverride: boolean;
	hasCustomerSalesOverride: boolean;
	hasDisplayOverride: boolean;
};

export function resolveCostPriceBreakdown(
	input: CostPriceBreakdownInput,
	context?: CostPriceBreakdownContext | null,
): CostPriceBreakdown | null {
	if (!context?.enabled) return null;

	const costPrice = firstPositiveNumber(input.costPrice);
	if (costPrice == null) return null;

	const internalProfileCoefficient = coefficientValue(
		context.internalProfileCoefficient,
	);
	const internalProfileMultiplier = coefficientMultiplier(
		internalProfileCoefficient,
	);
	const dealerSalesPercentage = salesPercentageValue(
		context.dealerSalesPercentage,
	);
	const unitCostPrice = firstPositiveNumber(input.unitCostPrice);
	const quantity = firstPositiveNumber(input.quantity);
	const useUnitQuantityCalculation =
		unitCostPrice != null && quantity != null && quantity > 0;
	const calculatedDealerProfileUnitSalesPrice = useUnitQuantityCalculation
		? roundCurrency(unitCostPrice * internalProfileMultiplier)
		: null;
	const calculatedCustomerUnitSalesPrice =
		calculatedDealerProfileUnitSalesPrice == null
			? null
			: roundCurrency(
					calculatedDealerProfileUnitSalesPrice *
						(1 + dealerSalesPercentage / 100),
				);
	const inputDealerProfileSalesPrice = firstPositiveNumber(
		input.dealerProfileSalesPrice,
	);
	const dealerProfileSalesPrice =
		inputDealerProfileSalesPrice ??
		(useUnitQuantityCalculation && calculatedDealerProfileUnitSalesPrice != null
			? roundCurrency(calculatedDealerProfileUnitSalesPrice * quantity)
			: roundCurrency(costPrice * internalProfileMultiplier));
	const inputCustomerSalesPrice = firstPositiveNumber(input.customerSalesPrice);
	const customerSalesPrice =
		inputCustomerSalesPrice ??
		(useUnitQuantityCalculation && calculatedCustomerUnitSalesPrice != null
			? roundCurrency(calculatedCustomerUnitSalesPrice * quantity)
			: roundCurrency(
					dealerProfileSalesPrice * (1 + dealerSalesPercentage / 100),
				));
	const displayPrice =
		firstPositiveNumber(input.displayPrice) ?? customerSalesPrice;

	return {
		costPrice,
		internalProfileCoefficient,
		internalProfileMultiplier,
		dealerSalesPercentage,
		dealerProfileSalesPrice,
		customerSalesPrice,
		displayPrice,
		unitCostPrice: useUnitQuantityCalculation ? unitCostPrice : null,
		quantity: useUnitQuantityCalculation ? quantity : null,
		dealerProfileUnitSalesPrice: calculatedDealerProfileUnitSalesPrice,
		customerUnitSalesPrice: calculatedCustomerUnitSalesPrice,
		hasDealerProfileOverride: inputDealerProfileSalesPrice != null,
		hasCustomerSalesOverride: inputCustomerSalesPrice != null,
		hasDisplayOverride:
			Math.abs(
				roundCurrency(displayPrice) - roundCurrency(customerSalesPrice),
			) > 0.005,
	};
}

function BreakdownRow({
	label,
	value,
}: {
	label: ReactNode;
	value: ReactNode;
}) {
	return (
		<div className="flex items-start justify-between gap-3">
			<span className="text-muted-foreground">{label}</span>
			<span className="text-right font-semibold text-foreground">{value}</span>
		</div>
	);
}

export function CostPriceBreakdownHover({
	children,
	breakdown,
	context,
}: {
	children: ReactNode;
	breakdown: CostPriceBreakdownInput;
	context?: CostPriceBreakdownContext | null;
}) {
	const resolved = resolveCostPriceBreakdown(breakdown, context);
	if (!resolved) return <>{children}</>;

	const labels = {
		priceBreakdown: context?.labels?.priceBreakdown || "Price breakdown",
		costPrice: context?.labels?.costPrice || "Cost price",
		dealerProfile: context?.labels?.dealerProfile || "Dealer profile",
		dealerProfileSalesPrice:
			context?.labels?.dealerProfileSalesPrice || "Dealer sales price",
		customerProfile: context?.labels?.customerProfile || "Customer profile",
		customerSalesPrice:
			context?.labels?.customerSalesPrice || "Customer sales price",
		displayedPrice: context?.labels?.displayedPrice || "Displayed price",
	};
	const internalProfileLabel = context?.internalProfileLabel || "Profile";
	const dealerProfileLabel = context?.dealerProfileLabel || "Customer profile";
	const customerMultiplier = 1 + resolved.dealerSalesPercentage / 100;
	const dealerProfileSalesPriceLabel = resolved.hasDealerProfileOverride
		? currency(resolved.dealerProfileSalesPrice)
		: resolved.dealerProfileUnitSalesPrice != null && resolved.quantity != null
			? `${currency(resolved.dealerProfileSalesPrice)} (${currency(
					resolved.unitCostPrice,
				)} x ${resolved.internalProfileMultiplier.toFixed(
					2,
				)} x ${resolved.quantity})`
			: `${currency(resolved.dealerProfileSalesPrice)} (${currency(
					resolved.costPrice,
				)} x ${resolved.internalProfileMultiplier.toFixed(2)})`;
	const customerSalesPriceLabel = resolved.hasCustomerSalesOverride
		? currency(resolved.customerSalesPrice)
		: resolved.dealerProfileUnitSalesPrice != null && resolved.quantity != null
			? `${currency(resolved.customerSalesPrice)} (${currency(
					resolved.dealerProfileUnitSalesPrice,
				)} x ${customerMultiplier.toFixed(2)} x ${resolved.quantity})`
			: `${currency(resolved.customerSalesPrice)} (${currency(
					resolved.dealerProfileSalesPrice,
				)} x ${customerMultiplier.toFixed(2)})`;

	return (
		<HoverCard openDelay={150} closeDelay={100}>
			<HoverCardTrigger asChild>
				<span
					className="inline-flex cursor-help underline decoration-dotted underline-offset-2"
					data-testid="dealer-price-breakdown-trigger"
				>
					{children}
				</span>
			</HoverCardTrigger>
			<HoverCardContent align="end" className="w-80 space-y-3 p-3">
				<div>
					<p className="text-sm font-semibold text-foreground">
						{labels.priceBreakdown}
					</p>
				</div>
				<div className="space-y-2 text-xs">
					<BreakdownRow
						label={labels.costPrice}
						value={currency(resolved.costPrice)}
					/>
					<BreakdownRow
						label={labels.dealerProfile}
						value={`${internalProfileLabel} / coefficient ${resolved.internalProfileCoefficient}`}
					/>
					<BreakdownRow
						label={labels.dealerProfileSalesPrice}
						value={dealerProfileSalesPriceLabel}
					/>
					<BreakdownRow
						label={labels.customerProfile}
						value={`${dealerProfileLabel} / ${resolved.dealerSalesPercentage.toFixed(
							2,
						)}%`}
					/>
					<BreakdownRow
						label={labels.customerSalesPrice}
						value={customerSalesPriceLabel}
					/>
					{resolved.hasDisplayOverride ? (
						<BreakdownRow
							label={labels.displayedPrice}
							value={currency(resolved.displayPrice)}
						/>
					) : null}
				</div>
			</HoverCardContent>
		</HoverCard>
	);
}

import { composeGeneralV2InvoiceSections } from "./financial-composer";
import type { SalesOverviewData } from "./types";

function percentage(value?: number | null) {
	return Math.min(100, Math.max(0, Number(value || 0)));
}

function readableStatus(value?: string | null, fallback = "Pending") {
	const status = String(value || fallback)
		.replaceAll("-", " ")
		.trim();
	return status.replace(/\b\w/g, (character) => character.toUpperCase());
}

export function createGeneralTabV2ViewModel(data: SalesOverviewData) {
	const financial = composeGeneralV2InvoiceSections(data.financialBreakdown);
	const paymentPercentage = percentage(
		financial.invoiceTotalCents > 0
			? (financial.invoicePaidCents / financial.invoiceTotalCents) * 100
			: financial.payableDueCents <= 0
				? 100
				: 0,
	);
	const productionPercentage = percentage(
		data.pipeline?.production.requiredQty
			? (data.pipeline.production.completedQty /
					data.pipeline.production.requiredQty) *
					100
			: data.stats?.prodCompleted?.percentage,
	);
	const fulfillmentPercentage = percentage(
		data.pipeline?.fulfillment.requiredQty
			? (data.pipeline.fulfillment.deliveredQty /
					data.pipeline.fulfillment.requiredQty) *
					100
			: (data.stats?.dispatchCompleted?.percentage ??
					(data.status?.delivery?.status === "completed" ? 100 : 0)),
	);

	return {
		data,
		isQuote: data.type === "quote",
		documentKind: data.type === "quote" ? "Quote" : "Order",
		...financial,
		paymentPercentage,
		paymentStatus: financial.payableDueCents > 0 ? "Payment due" : "Settled",
		paymentMethod:
			data.paymentSummary?.methodLabel || data.paymentMethod || "Not selected",
		pipeline: data.pipeline ?? null,
		production: {
			status: readableStatus(
				data.pipeline?.production.state ?? data.status?.production?.status,
				"Awaiting",
			),
			percentage: productionPercentage,
		},
		fulfillment: {
			status: readableStatus(
				data.pipeline?.fulfillment.state ?? data.status?.delivery?.status,
			),
			percentage: fulfillmentPercentage,
		},
	};
}

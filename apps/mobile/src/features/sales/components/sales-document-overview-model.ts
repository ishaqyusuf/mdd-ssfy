import type { NewSalesFormType } from "../invoice-form/types";
import { getQuoteInvoiceStatus } from "./sales-document-list";

type InvoiceSummary = {
	total?: number | null;
	paid?: number | null;
	pending?: number | null;
	baseTotal?: number | null;
	displayCcc?: number | null;
	displayPaid?: number | null;
	displayPending?: number | null;
	displayTotal?: number | null;
} | null;

export type SalesDocumentOverviewSale = {
	id?: number | null;
	orderId?: string | null;
	slug?: string | null;
	displayName?: string | null;
	deliveryStatus?: string | null;
	address?: string | null;
	customerPhone?: string | null;
	email?: string | null;
	paymentMethod?: string | null;
	invoice?: InvoiceSummary;
	costLines?: Array<{
		id?: string | number | null;
		label?: string | null;
		title?: string | null;
		description?: string | null;
		amount?: number | null;
		value?: number | null;
	}> | null;
	overviewItems?: SalesDocumentOverviewApiItem[] | null;
};

type SalesDocumentOverviewApiItem = {
	id?: number | string | null;
	title?: string | null;
	subtitle?: string | null;
	qty?: number | null;
	total?: number | null;
};

type SalesDocumentOverviewDispatch = {
	dispatchables?: Array<{
		uid?: string | null;
		title?: string | null;
		subtitle?: string | null;
		img?: string | null;
		totalQty?: { qty?: number | null } | number | null;
	}> | null;
	deliveries?: unknown[] | null;
} | null;

export type SalesDocumentOverviewItem = {
	key: string;
	title: string;
	subtitle: string;
	quantity: number;
	image?: string | null;
};

export type SalesDocumentOverviewFinancialStat = {
	key: string;
	label: string;
	value: number;
	tone: "neutral" | "positive" | "warning";
};

export type SalesDocumentOverviewFinancialRow = {
	key: string;
	label: string;
	value: number;
	tone: "neutral" | "positive" | "warning";
	bold: boolean;
};

export function toSalesOverviewMoney(value?: number | null) {
	return `$${Number(value || 0).toFixed(2)}`;
}

export function getSalesDocumentOverviewAmounts(
	sale?: SalesDocumentOverviewSale | null,
) {
	const paid = Number(sale?.invoice?.paid || 0);
	const due = Number(sale?.invoice?.pending || 0);
	const total = Number(sale?.invoice?.total || 0);
	const cardCharged = sumExactSalesOverviewCostLines(sale, "Charged to Card");
	const cardPending = sumExactSalesOverviewCostLines(
		sale,
		"Total Due With C.C.C",
	);
	const displayPaid = Number(
		sale?.invoice?.displayPaid ?? (cardCharged || paid),
	);
	const displayDue = Number(
		sale?.invoice?.displayPending ?? (cardPending || due),
	);
	const displayTotal = Number(sale?.invoice?.displayTotal ?? total);
	const paidPct =
		total > 0 ? Math.min(100, Math.max(0, (paid / total) * 100)) : 0;

	return {
		displayDue,
		displayPaid,
		displayTotal,
		due: displayDue,
		paid: displayPaid,
		paidPct,
		principalDue: due,
		principalPaid: paid,
		principalTotal: total,
		total: displayTotal,
	};
}

export function getSalesDocumentOverviewFinancialDetails(
	sale?: SalesDocumentOverviewSale | null,
	type: NewSalesFormType = "order",
) {
	const amounts = getSalesDocumentOverviewAmounts(sale);
	const principalBalance = amounts.principalDue;
	const cardCharged = sumExactSalesOverviewCostLines(sale, "Charged to Card");
	const cardPending = sumExactSalesOverviewCostLines(
		sale,
		"Total Due With C.C.C",
	);
	const isQuote = type === "quote";
	const progressStats: SalesDocumentOverviewFinancialStat[] = isQuote
		? []
		: [
				{
					key: "order-total",
					label: "Order Total",
					value: amounts.principalTotal,
					tone: "neutral",
				},
				{
					key: "paid-order",
					label: "Paid (Order)",
					value: amounts.principalPaid,
					tone: "positive",
				},
				...(cardCharged > amounts.principalPaid
					? [
							{
								key: "card-paid",
								label: "Card Paid",
								value: cardCharged,
								tone: "positive" as const,
							},
						]
					: []),
				{
					key: "pending-order",
					label: "Pending (Order)",
					value: principalBalance,
					tone: principalBalance > 0 ? "warning" : "positive",
				},
				...(cardPending > principalBalance
					? [
							{
								key: "card-pending",
								label: "Card Pending",
								value: cardPending,
								tone: "warning" as const,
							},
						]
					: []),
			];

	return {
		paymentMethod: sale?.paymentMethod || "Not set",
		progressStats,
		ledgerRows: buildFinancialLedgerRows(sale, amounts),
	};
}

function buildFinancialLedgerRows(
	sale: SalesDocumentOverviewSale | null | undefined,
	amounts: ReturnType<typeof getSalesDocumentOverviewAmounts>,
): SalesDocumentOverviewFinancialRow[] {
	const costLines = sale?.costLines || [];
	if (!costLines.length) {
		const rows: SalesDocumentOverviewFinancialRow[] = [
			{
				key: "invoice-total",
				label: "Invoice Total",
				value: amounts.principalTotal,
				tone: "neutral",
				bold: true,
			},
			{
				key: "amount-collected",
				label: "Amount Collected",
				value: amounts.principalPaid,
				tone: "positive",
				bold: false,
			},
		];

		if (amounts.principalDue > 0) {
			rows.push({
				key: "pending-verification",
				label: "Pending Verification",
				value: amounts.principalDue,
				tone: "warning",
				bold: false,
			});
		}

		rows.push({
			key: "outstanding-balance",
			label: "Outstanding Balance",
			value: amounts.principalDue,
			tone: amounts.principalDue > 0 ? "warning" : "positive",
			bold: true,
		});

		return rows;
	}

	return costLines.map((line, index) => {
		const label = line.label || line.title || `Line ${index + 1}`;
		const normalizedLabel = label.toLowerCase();
		const value = Number(line.amount ?? line.value ?? 0);
		const isBalance =
			normalizedLabel.includes("due") || normalizedLabel.includes("balance");
		const isPaid =
			normalizedLabel.includes("paid") || normalizedLabel.includes("charged");
		const isTotal =
			normalizedLabel.includes("total") || normalizedLabel.includes("invoice");

		return {
			key: String(line.id ?? `${label}-${value}-${index}`),
			label,
			value,
			tone:
				isBalance && value > 0 ? "warning" : isPaid ? "positive" : "neutral",
			bold: isTotal || isBalance,
		};
	});
}

function sumExactSalesOverviewCostLines(
	sale: SalesDocumentOverviewSale | null | undefined,
	targetLabel: string,
) {
	return (sale?.costLines || []).reduce((sum, line) => {
		const label = String(line?.label || line?.title || "").toLowerCase();
		if (label !== targetLabel.toLowerCase()) return sum;
		return sum + Number(line?.amount ?? line?.value ?? 0);
	}, 0);
}

export function sumSalesOverviewCostLines(
	sale: SalesDocumentOverviewSale | null | undefined,
	target: "tax" | "discount",
) {
	return (sale?.costLines || [])
		.filter((line) =>
			String(line?.label || line?.title || "")
				.toLowerCase()
				.includes(target),
		)
		.reduce((acc, line) => acc + Number(line?.amount ?? line?.value ?? 0), 0);
}

export function getSalesDocumentOverviewCopy(
	type: NewSalesFormType,
	sale: SalesDocumentOverviewSale | null | undefined,
	documentNo: string,
) {
	const isQuote = type === "quote";
	const statusLabel = isQuote
		? getQuoteInvoiceStatus(sale || {})
		: sale?.deliveryStatus || "pending";

	return {
		documentLabel: isQuote ? "Quote" : "Order",
		title: `${isQuote ? "Quote" : "Order"} #${sale?.orderId || documentNo}`,
		subtitle: isQuote ? "Quote overview" : "Sales order overview",
		statusLabel,
		progressLabel: isQuote ? "Quote progress" : "Payment progress",
		totalLabel: isQuote ? "Quote Total" : "Total",
		financialTotalLabel: isQuote ? "Quote Total" : "Subtotal",
		openAmountLabel: isQuote ? "Open" : "Due",
		balanceLabel: isQuote ? "Open Quote Amount" : "Outstanding Balance",
		emptyItemsLabel: `No ${isQuote ? "quote" : "order"} items found.`,
		emptyActivitiesLabel: isQuote
			? "No recent activities for this quote."
			: "No recent activities for this order.",
		emptyDeliveriesLabel: "No deliveries scheduled.",
		showOrderLogistics: !isQuote,
	};
}

export function getSalesDocumentOverviewPrimaryAction(
	type: NewSalesFormType,
	sale: SalesDocumentOverviewSale | null | undefined,
) {
	if (type === "quote") {
		return sale?.slug
			? {
					label: "Edit Quote",
					kind: "edit-quote" as const,
					slug: sale.slug,
				}
			: null;
	}

	return sale?.id
		? {
				label: "Create Delivery",
				kind: "create-delivery" as const,
			}
		: null;
}

export function buildSalesDocumentOverviewItems(input: {
	sale?: SalesDocumentOverviewSale | null;
	dispatch?: SalesDocumentOverviewDispatch;
}) {
	const dispatchItems = input.dispatch?.dispatchables || [];

	if (dispatchItems.length) {
		return dispatchItems.map((item, index): SalesDocumentOverviewItem => {
			const totalQty =
				typeof item.totalQty === "number"
					? item.totalQty
					: Number(item.totalQty?.qty || 0);

			return {
				key: item.uid || `dispatch-${index}`,
				title: item.title || "Line item",
				subtitle: item.subtitle || "No subtitle",
				quantity: totalQty,
				image: item.img,
			};
		});
	}

	return (input.sale?.overviewItems || []).map(
		(item, index): SalesDocumentOverviewItem => ({
			key: String(item.id ?? `overview-${index}`),
			title: item.title || "Line item",
			subtitle: item.subtitle || "No subtitle",
			quantity: Number(item.qty || 0),
		}),
	);
}

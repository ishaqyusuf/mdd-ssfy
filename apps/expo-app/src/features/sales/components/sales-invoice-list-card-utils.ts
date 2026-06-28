import {
	type SalesDocumentListItem,
	type SalesDocumentListType,
	getQuoteInvoiceStatus,
} from "./sales-document-list";

export type SalesInvoiceListCardProps = {
	type: SalesDocumentListType;
	item: SalesDocumentListItem;
	onPress: () => void;
	disabled?: boolean;
};

export function toInvoiceListMoney(value?: number | null) {
	return `$${Number(value || 0).toFixed(2)}`;
}

export function getInvoiceListInitials(name?: string | null) {
	const raw = String(name || "-").trim();
	if (!raw || raw === "-") return "--";
	const parts = raw.split(/\s+/).filter(Boolean);
	if (parts.length === 1) return (parts[0] || "").slice(0, 2).toUpperCase();
	return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.toUpperCase();
}

export function getInvoiceListCardState(
	type: SalesDocumentListType,
	item: SalesDocumentListItem,
) {
	const principalTotal = Number(item?.invoice?.total || 0);
	const principalPaid = Number(item?.invoice?.paid || 0);
	const principalDue = Number(item?.invoice?.pending || 0);
	const total = Number(item?.invoice?.displayTotal ?? principalTotal);
	const paid = Number(item?.invoice?.displayPaid ?? principalPaid);
	const due = Number(item?.invoice?.displayPending ?? principalDue);
	const paidPct =
		principalTotal > 0
			? Math.min(100, Math.max(0, (principalPaid / principalTotal) * 100))
			: 0;
	const quoteStatus = getQuoteInvoiceStatus(item);
	const statusLabel =
		type === "quote" ? quoteStatus : item?.deliveryStatus || "pending";

	return {
		due,
		paid,
		paidPct,
		progressLabel: type === "quote" ? "Quote Progress" : "Payment Progress",
		referenceLabel:
			type === "quote" ? `Quote #${item?.orderId || "-"}` : `#${item?.orderId}`,
		statusLabel,
		total,
	};
}

export function getInvoiceListLedgerLabels(
	type: SalesDocumentListType,
	due: number,
) {
	if (type === "quote") {
		return {
			total: "Quote Total",
			due: null,
		};
	}

	return {
		total: "Total Amount",
		due: due > 0 ? "Remaining Due" : "Balance",
	};
}

export function shouldShowInvoiceListProgressFooter(
	type: SalesDocumentListType,
) {
	return type === "order";
}

type Tone = {
	chip: string;
	text: string;
	dot: string;
};

type LedgerTone = {
	chip: string;
	chipText: string;
	dueAccent: string;
	dueText: string;
};

export function getInvoiceListCard1Tone(
	type: SalesDocumentListType,
	status: string,
): Tone {
	if (type === "quote") return quoteStatusTone(status);
	const value = String(status || "").toLowerCase();
	if (value.includes("completed")) {
		return {
			chip: "border-emerald-300 bg-emerald-500/10",
			text: "text-emerald-700 dark:text-emerald-300",
			dot: "bg-emerald-500",
		};
	}
	if (value.includes("progress")) {
		return {
			chip: "border-amber-300 bg-amber-500/10",
			text: "text-amber-700 dark:text-amber-300",
			dot: "bg-amber-500",
		};
	}
	return {
		chip: "border-border bg-muted",
		text: "text-muted-foreground",
		dot: "bg-muted-foreground",
	};
}

export function getInvoiceListLedgerTone(
	status: string,
	due: number,
): LedgerTone {
	const normalized = status.toLowerCase();
	if (due <= 0 || normalized.includes("completed") || normalized === "paid") {
		return {
			chip: "border-emerald-200 dark:border-emerald-800",
			chipText: "text-emerald-700 dark:text-emerald-300",
			dueAccent: "border-emerald-500",
			dueText: "text-emerald-700 dark:text-emerald-300",
		};
	}
	if (
		normalized.includes("progress") ||
		normalized.includes("part") ||
		normalized === "open"
	) {
		return {
			chip: "border-amber-200 dark:border-amber-800",
			chipText: "text-amber-700 dark:text-amber-300",
			dueAccent: "border-amber-500",
			dueText: "text-amber-700 dark:text-amber-300",
		};
	}
	return {
		chip: "border-red-200 dark:border-red-900",
		chipText: "text-red-600 dark:text-red-300",
		dueAccent: "border-red-500",
		dueText: "text-red-600 dark:text-red-300",
	};
}

export function getInvoiceListDeliveryIcon(deliveryOption?: string | null) {
	const normalized = deliveryOption?.toLowerCase() || "";
	if (normalized.includes("express")) return "Zap";
	if (normalized.includes("pick")) return "Warehouse";
	return "Truck";
}

function quoteStatusTone(status: string): Tone {
	if (status === "Paid") {
		return {
			chip: "border-emerald-300 bg-emerald-500/10",
			text: "text-emerald-700 dark:text-emerald-300",
			dot: "bg-emerald-500",
		};
	}
	if (status === "Part paid") {
		return {
			chip: "border-amber-300 bg-amber-500/10",
			text: "text-amber-700 dark:text-amber-300",
			dot: "bg-amber-500",
		};
	}
	return {
		chip: "border-border bg-muted",
		text: "text-muted-foreground",
		dot: "bg-muted-foreground",
	};
}

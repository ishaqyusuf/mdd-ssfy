import type { RouterInputs } from "@api/trpc/routers/_app";
import { formatMoney } from "@gnd/utils";
import { formatDate } from "@gnd/utils/dayjs";
import dayjs from "dayjs";

export type SalesOrdersExportOrder = {
	id?: number | null;
	orderId?: string | null;
	createdAt?: Date | string | null;
	salesDate?: string | null;
	salesRepName?: string | null;
	poNo?: string | null;
	invoiceTotal?: number | null;
	displayAmountPaid?: number | null;
	amountPaid?: number | null;
	displayAmountDue?: number | null;
	amountDue?: number | null;
	customerName?: string | null;
	displayName?: string | null;
	customerPhone?: string | null;
	address?: string | null;
	deliveryOption?: string | null;
	statusLabel?: string | null;
	status?: string | null;
};

type SalesOrdersInput = NonNullable<RouterInputs["sales"]["getOrders"]>;

export type SalesOrdersExportHyperlinkCell = {
	t: "s";
	v: string;
	l: {
		Target: string;
	};
};

export type SalesOrdersExportRow = {
	Sn: string;
	Date: string;
	"Order #": SalesOrdersExportHyperlinkCell;
	"Sales Rep": string;
	"P.O": string;
	Invoice: string | number;
	Paid: string | number;
	Pending: string | number;
	Customer: string;
	Phone: string;
	Address: string;
	"Delivery Method": string;
	Status: string;
};

const emptyFallback = "-";

function textOrFallback(value: string | null | undefined) {
	const trimmed = value?.trim();
	return trimmed ? trimmed : emptyFallback;
}

function moneyValue(value: number | null | undefined) {
	return typeof value === "number" ? value : 0;
}

export function buildSalesOrderOverviewUrl(appUrl: string, orderId: string) {
	const baseUrl = appUrl.replace(/\/$/, "");
	const params = new URLSearchParams({
		"sales-overview-id": orderId,
		"sales-type": "order",
		mode: "sales",
		salesTab: "general",
	});

	return `${baseUrl}/sales-book/orders?${params.toString()}`;
}

export function toSalesOrdersExportRows(
	orders: SalesOrdersExportOrder[],
	appUrl: string,
): SalesOrdersExportRow[] {
	return orders.map((order, index) => {
		const orderId = order.orderId ?? "";

		return {
			Sn: `${index + 1}.`,
			Date:
				order.salesDate ??
				(order.createdAt ? formatDate(order.createdAt) : emptyFallback),
			"Order #": {
				t: "s",
				v: orderId,
				l: {
					Target: buildSalesOrderOverviewUrl(appUrl, orderId),
				},
			},
			"Sales Rep": textOrFallback(order.salesRepName),
			"P.O": textOrFallback(order.poNo),
			Invoice: formatMoney(moneyValue(order.invoiceTotal)),
			Paid: formatMoney(
				moneyValue(order.displayAmountPaid ?? order.amountPaid),
			),
			Pending: formatMoney(
				moneyValue(order.displayAmountDue ?? order.amountDue),
			),
			Customer: textOrFallback(order.customerName ?? order.displayName),
			Phone: textOrFallback(order.customerPhone),
			Address: textOrFallback(order.address),
			"Delivery Method": textOrFallback(order.deliveryOption),
			Status: textOrFallback(order.statusLabel ?? order.status),
		};
	});
}

export function getSalesOrdersExportFileName(now: Date | string = new Date()) {
	return `sales-report-export-${dayjs(now).format("DD-MM-YYYY")}.xlsx`;
}

export function hasSalesOrdersExportTrigger(
	hasFilters: boolean,
	selectedSalesIds: readonly number[],
) {
	return hasFilters || selectedSalesIds.length > 0;
}

export function buildSalesOrdersExportInput(
	filters: RouterInputs["sales"]["getOrders"],
	selectedSalesIds: readonly number[],
	sort?: string[] | null,
): RouterInputs["sales"]["getOrders"] {
	const baseFilters = (filters ?? {}) as SalesOrdersInput;
	const baseSort = (baseFilters as { sort?: string[] | null }).sort;
	return {
		...baseFilters,
		salesIds: selectedSalesIds.length > 0 ? [...selectedSalesIds] : undefined,
		size: 999,
		sort: sort ?? baseSort,
	};
}

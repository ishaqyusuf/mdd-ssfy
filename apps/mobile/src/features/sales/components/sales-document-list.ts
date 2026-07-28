import type { NewSalesFormType } from "../invoice-form/types";

export type SalesDocumentListType = NewSalesFormType;

export type SalesDocumentListItem = {
	id?: string | number | null;
	orderId?: string | null;
	slug?: string | null;
	displayName?: string | null;
	customerPhone?: string | null;
	deliveryStatus?: string | null;
	deliveryOption?: string | null;
	salesDate?: string | null;
	invoice?: {
		total?: number | null;
		paid?: number | null;
		pending?: number | null;
		baseTotal?: number | null;
		displayCcc?: number | null;
		displayPaid?: number | null;
		displayPending?: number | null;
		displayTotal?: number | null;
	} | null;
};

export type SalesOrdersListApiItem = {
	id?: string | number | null;
	orderId?: string | null;
	slug?: string | null;
	displayName?: string | null;
	customerName?: string | null;
	customerPhone?: string | null;
	fulfillmentLabel?: string | null;
	statusLabel?: string | null;
	deliveryOption?: string | null;
	salesDate?: string | null;
	baseInvoiceTotal?: number | null;
	invoiceTotal?: number | null;
	amountPaid?: number | null;
	amountDue?: number | null;
	displayAmountPaid?: number | null;
	displayAmountDue?: number | null;
	displayCcc?: number | null;
};

export type SalesOrdersListApiResponse = {
	data?: SalesOrdersListApiItem[];
	[key: string]: unknown;
};

type SalesDocumentListInput = {
	type: SalesDocumentListType;
	q?: string | null;
	filters?: Record<string, string | null | undefined>;
};

type QuoteStatusInput = {
	invoice?: {
		total?: number | null;
		pending?: number | null;
	} | null;
};

export function buildSalesDocumentListQueryInput({
	type,
	q,
	filters,
}: SalesDocumentListInput) {
	const normalized: Record<string, unknown> = {
		showing: "all sales",
		size: 50,
		q: q?.trim() || undefined,
	};

	if (type === "quote") {
		normalized.salesType = "quote";
	}

	for (const [key, value] of Object.entries(filters || {})) {
		if (value !== undefined && value !== null && String(value).length > 0) {
			normalized[key] = value;
		}
	}

	return normalized;
}

export function adaptSalesOrderListItem(
	row: SalesOrdersListApiItem,
): SalesDocumentListItem {
	const displayName = row.displayName ?? row.customerName ?? null;
	const amountPaid = Number(row.amountPaid || 0);
	const amountDue = Number(row.amountDue || 0);

	return {
		id: row.id,
		orderId: row.orderId,
		slug: row.slug,
		displayName,
		customerPhone: row.customerPhone,
		deliveryStatus: row.fulfillmentLabel ?? row.statusLabel ?? null,
		deliveryOption: row.deliveryOption,
		salesDate: row.salesDate,
		invoice: {
			total: row.baseInvoiceTotal ?? null,
			paid: amountPaid,
			pending: amountDue,
			baseTotal: row.baseInvoiceTotal ?? null,
			displayCcc: row.displayCcc ?? null,
			displayPaid: row.displayAmountPaid ?? amountPaid,
			displayPending: row.displayAmountDue ?? amountDue,
			displayTotal: row.invoiceTotal ?? row.baseInvoiceTotal ?? null,
		},
	};
}

export function adaptSalesOrderListResponse<T extends SalesOrdersListApiResponse>(
	response: T | undefined,
) {
	if (!response) return response;

	return {
		...response,
		data: (response.data || []).map(adaptSalesOrderListItem),
	};
}

export function getQuoteEditRoute(item: Pick<SalesDocumentListItem, "slug">) {
	const slug = item.slug?.trim();

	if (!slug) return null;

	return {
		pathname: "/(sales)/invoices/[slug]",
		params: { slug, type: "quote" },
	} as const;
}

export function getOrderOverviewRoute(
	item: Pick<SalesDocumentListItem, "orderId">,
) {
	const orderNo = item.orderId?.trim();

	if (!orderNo) return null;

	return {
		pathname: "/(sales)/orders/[orderNo]",
		params: { orderNo },
	} as const;
}

export function getQuoteOverviewRoute(
	item: Pick<SalesDocumentListItem, "orderId">,
) {
	const quoteNo = item.orderId?.trim();

	if (!quoteNo) return null;

	return {
		pathname: "/(sales)/quotes/[quoteNo]",
		params: { quoteNo },
	} as const;
}

export function getQuoteInvoiceStatus(item: QuoteStatusInput) {
	const pending = Number(item.invoice?.pending || 0);
	const total = Number(item.invoice?.total || 0);

	if (pending <= 0) return "Paid";
	if (pending >= total) return "Open";
	return "Part paid";
}

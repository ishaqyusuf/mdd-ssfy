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
	} | null;
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

export function getQuoteEditRoute(item: Pick<SalesDocumentListItem, "slug">) {
	const slug = item.slug?.trim();

	if (!slug) return null;

	return {
		pathname: "/(sales)/invoices/[slug]",
		params: { slug, type: "quote" },
	} as const;
}

export function getQuoteInvoiceStatus(item: QuoteStatusInput) {
	const pending = Number(item.invoice?.pending || 0);
	const total = Number(item.invoice?.total || 0);

	if (pending <= 0) return "Paid";
	if (pending >= total) return "Open";
	return "Part paid";
}

export const SALES_REPORT_LAYOUT_COOKIE = "gnd-sales-report-layout";

export const SALES_REPORT_CARD_IDS = [
	"summary",
	"booked-sales-trend",
	"recent-orders",
	"sales-reps",
	"products",
	"channels",
] as const;

export type SalesReportCardId = (typeof SALES_REPORT_CARD_IDS)[number];

export type SalesReportLayout = {
	order: SalesReportCardId[];
	hidden: SalesReportCardId[];
};

export const DEFAULT_SALES_REPORT_LAYOUT: SalesReportLayout = {
	order: [...SALES_REPORT_CARD_IDS],
	hidden: [],
};

export function normalizeSalesReportLayout(
	value?: Partial<SalesReportLayout> | null,
): SalesReportLayout {
	const valid = new Set<string>(SALES_REPORT_CARD_IDS);
	const requestedOrder = (value?.order || []).filter(
		(id): id is SalesReportCardId => valid.has(id),
	);
	const requestedSet = new Set(requestedOrder);
	const order = [
		...requestedOrder,
		...SALES_REPORT_CARD_IDS.filter((id) => !requestedSet.has(id)),
	];
	const hidden = [
		...new Set(
			(value?.hidden || []).filter((id): id is SalesReportCardId =>
				valid.has(id),
			),
		),
	];

	return { order, hidden };
}

export const SALES_PAGE_BREAK_MODES = [
	"section",
	"header",
	"fullHeader",
] as const;

export type SalesPageBreakMode = (typeof SALES_PAGE_BREAK_MODES)[number];

export const DEFAULT_SALES_PAGE_BREAK_MODE: SalesPageBreakMode = "header";

export function normalizeSalesPageBreakMode(
	value?: string | null,
): SalesPageBreakMode {
	return SALES_PAGE_BREAK_MODES.includes(value as SalesPageBreakMode)
		? (value as SalesPageBreakMode)
		: DEFAULT_SALES_PAGE_BREAK_MODE;
}

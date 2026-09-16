import type { SalesPrintControllerActionInput } from "@/modules/sales-print/application/use-sales-print-controller";
import type { SalesPrintProps } from "@/utils/sales-print-utils";
import type { PrintMode } from "@gnd/sales/print/types";

export const QUOTE_DOCUMENT_MENU_OPTIONS = [
	{
		label: "Detailed",
		params: { mode: "quote" },
	},
	{
		label: "Totals only",
		params: { mode: "quote", priceDisplay: "totals-only" },
	},
] as const satisfies ReadonlyArray<{
	label: string;
	params: SalesPrintProps;
}>;

export const ORDER_DOCUMENT_MENU_OPTIONS = [
	{
		label: "Order",
		params: { mode: "order" },
	},
	{
		label: "Order (Totals only)",
		params: { mode: "order", priceDisplay: "totals-only" },
	},
] as const satisfies ReadonlyArray<{
	label: string;
	params: SalesPrintProps;
}>;

export const ORDER_PDF_MENU_OPTIONS = [
	{
		label: "Order & Packing",
		params: { mode: "order-packing", dispatchId: "all" },
	},
	...ORDER_DOCUMENT_MENU_OPTIONS,
	{
		label: "Packing",
		params: { mode: "packing list" },
	},
	{
		label: "Production",
		params: { mode: "production" },
	},
] as const satisfies ReadonlyArray<{
	label: string;
	params: SalesPrintProps;
}>;

export function buildSalesMenuPrintControllerInput(input: {
	salesIds: number[];
	mode: PrintMode;
	dispatchId?: number | null;
	priceDisplay?: SalesPrintProps["priceDisplay"];
	openInNewTab?: boolean;
	salesType: "order" | "quote";
}): SalesPrintControllerActionInput {
	return {
		salesIds: input.salesIds,
		mode: input.mode,
		dispatchId: input.dispatchId ?? null,
		priceDisplay: input.priceDisplay ?? null,
		openInNewTab: input.openInNewTab,
		salesType: input.salesType,
	};
}

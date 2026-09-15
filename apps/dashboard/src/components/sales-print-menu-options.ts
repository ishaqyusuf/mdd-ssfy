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

export const ORDER_TOTALS_ONLY_PRINT_OPTION = {
	label: "Order (Totals only)",
	params: { mode: "order", priceDisplay: "totals-only" },
} as const satisfies {
	label: string;
	params: SalesPrintProps;
};

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

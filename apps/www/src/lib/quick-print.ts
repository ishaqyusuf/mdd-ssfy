import {
	downloadSalesPrintDocument,
	openSalesPrintDocument,
	printOrder,
	printOrderWithPacking,
	printPackingSlip,
	printProduction,
	printQuote,
} from "@/modules/sales-print/application/sales-print-service";
import type { PrintMode } from "@gnd/sales/print/types";

export interface QuickPrintOptions {
	salesIds: number[];
	mode: PrintMode;
	dispatchId?: number | null;
	v2?: boolean;
}

export type SalesPrintHelperOptions = Omit<QuickPrintOptions, "mode">;

export async function quickPrint({
	salesIds,
	mode,
	dispatchId,
}: QuickPrintOptions): Promise<void> {
	return openSalesPrintDocument({
		salesIds,
		mode,
		dispatchId: dispatchId ?? null,
	});
}

export async function downloadSalesDocument({
	salesIds,
	mode,
	dispatchId,
}: Omit<QuickPrintOptions, "v2">): Promise<void> {
	return downloadSalesPrintDocument({
		salesIds,
		mode,
		dispatchId: dispatchId ?? null,
	});
}

export {
	printOrder,
	printOrderWithPacking,
	printPackingSlip,
	printProduction,
	printQuote,
};

export const salesPrintHelper = {
	printOrder,
	printOrderWithPacking,
	printPackingSlip,
	printProduction,
	printQuote,
	downloadSalesDocument,
};

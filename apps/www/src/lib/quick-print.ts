import { resolveSalesDocumentAccessAction } from "@/actions/resolve-sales-document-access";
import type { PrintMode } from "@gnd/sales/print/types";
import { openLink } from "./open-link";

export interface QuickPrintOptions {
	salesIds: number[];
	mode: PrintMode;
	dispatchId?: number | null;
	/** Open the v2 PDF viewer (default: true) */
	v2?: boolean;
}

export type SalesPrintHelperOptions = Omit<QuickPrintOptions, "mode">;

/**
 * Generates a signed token and opens the sales print page in a new tab.
 * Pass v2=false to open the legacy invoice page instead.
 */
export async function quickPrint({
	salesIds,
	mode,
	dispatchId,
	v2 = true,
}: QuickPrintOptions): Promise<void> {
	const access = await resolveSalesDocumentAccessAction({
		salesIds,
		mode,
		dispatchId: dispatchId ?? null,
	});

	if (access.kind === "legacy") {
		const path = v2 ? "p/sales-document-v2" : "p/sales-invoice";
		openLink(
			path,
			v2
				? { token: access.accessToken, templateId: "template-2" }
				: { token: access.accessToken, preview: true },
			true,
		);
		return;
	}

	openLink(access.previewUrl, null, true);
}

export async function downloadSalesDocument({
	salesIds,
	mode,
	dispatchId,
}: Omit<QuickPrintOptions, "v2">): Promise<void> {
	const access = await resolveSalesDocumentAccessAction({
		salesIds,
		mode,
		dispatchId: dispatchId ?? null,
	});

	openLink(access.downloadUrl, null, true);
}

export function printOrder(options: SalesPrintHelperOptions) {
	return quickPrint({ ...options, mode: "invoice" });
}

export function printOrderWithPacking(options: SalesPrintHelperOptions) {
	return quickPrint({ ...options, mode: "order-packing" });
}

export function printPackingSlip(options: SalesPrintHelperOptions) {
	return quickPrint({ ...options, mode: "packing-slip" });
}

export function printProduction(options: SalesPrintHelperOptions) {
	return quickPrint({ ...options, mode: "production" });
}

export function printQuote(options: SalesPrintHelperOptions) {
	return quickPrint({ ...options, mode: "quote" });
}

export const salesPrintHelper = {
	printOrder,
	printOrderWithPacking,
	printPackingSlip,
	printProduction,
	printQuote,
	downloadSalesDocument,
};

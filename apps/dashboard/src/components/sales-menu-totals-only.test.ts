import { describe, expect, test } from "bun:test";
import {
	ORDER_TOTALS_ONLY_PRINT_OPTION,
	QUOTE_DOCUMENT_MENU_OPTIONS,
	buildSalesMenuPrintControllerInput,
} from "./sales-print-menu-options";

describe("sales menu totals-only printing", () => {
	test("offers detailed and totals-only quote Print and PDF actions", () => {
		expect(QUOTE_DOCUMENT_MENU_OPTIONS).toEqual([
			{ label: "Detailed", params: { mode: "quote" } },
			{
				label: "Totals only",
				params: { mode: "quote", priceDisplay: "totals-only" },
			},
		]);
	});

	test("adds only the requested order Print variant", () => {
		expect(ORDER_TOTALS_ONLY_PRINT_OPTION).toEqual({
			label: "Order (Totals only)",
			params: { mode: "order", priceDisplay: "totals-only" },
		});
	});

	test("builds a totals-only batch request for the shared print controller", () => {
		expect(
			buildSalesMenuPrintControllerInput({
				salesIds: [101, 102],
				mode: "quote",
				priceDisplay: "totals-only",
				salesType: "quote",
			}),
		).toEqual({
			salesIds: [101, 102],
			mode: "quote",
			dispatchId: null,
			priceDisplay: "totals-only",
			openInNewTab: undefined,
			salesType: "quote",
		});
	});
});

import { describe, expect, test } from "bun:test";
import {
	ORDER_DOCUMENT_MENU_OPTIONS,
	ORDER_PDF_MENU_OPTIONS,
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

	test("adds totals-only immediately after Order in the order PDF menu", () => {
		expect(ORDER_PDF_MENU_OPTIONS).toEqual([
			{
				label: "Order & Packing",
				params: { mode: "order-packing", dispatchId: "all" },
			},
			{ label: "Order", params: { mode: "order" } },
			{
				label: "Order (Totals only)",
				params: { mode: "order", priceDisplay: "totals-only" },
			},
			{ label: "Packing", params: { mode: "packing list" } },
			{ label: "Production", params: { mode: "production" } },
		]);
	});

	test("offers detailed and totals-only order document actions", () => {
		expect(ORDER_DOCUMENT_MENU_OPTIONS).toEqual([
			{ label: "Order", params: { mode: "order" } },
			{
				label: "Order (Totals only)",
				params: { mode: "order", priceDisplay: "totals-only" },
			},
		]);
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

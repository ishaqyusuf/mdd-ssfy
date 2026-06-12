import { describe, expect, test } from "bun:test";

import {
	buildSalesInventoryPrintViewerUrl,
	readSalesInventoryPrintParams,
} from "./inventory-print-request";

describe("inventory print request", () => {
	test("builds a separate inventory print viewer URL from unique sales ids", () => {
		expect(
			buildSalesInventoryPrintViewerUrl({
				salesIds: [10, 10, null, 20],
				mode: "production",
			}),
		).toBe("/p/sales-inventory-v2?ids=10%2C20&mode=production&preview=false");
	});

	test("reads ids, mode, preview, and template from search params", () => {
		expect(
			readSalesInventoryPrintParams({
				ids: "10,20,bad",
				mode: "packing-slip",
				preview: "true",
				templateId: "template-7",
			}),
		).toEqual({
			ids: [10, 20],
			mode: "packing-slip",
			preview: true,
			templateId: "template-7",
		});
	});
});

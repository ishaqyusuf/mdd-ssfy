import { describe, expect, it } from "bun:test";

import {
	DEFAULT_SALES_REPORT_LAYOUT,
	normalizeSalesReportLayout,
} from "./sales-report-layout";

describe("sales report layout", () => {
	it("preserves a valid custom order and appends newly introduced cards", () => {
		const layout = normalizeSalesReportLayout({
			order: ["products", "summary"],
			hidden: [],
		});

		expect(layout.order.slice(0, 2)).toEqual(["products", "summary"]);
		expect(new Set(layout.order)).toEqual(
			new Set(DEFAULT_SALES_REPORT_LAYOUT.order),
		);
	});

	it("drops unknown and duplicate hidden cards", () => {
		const layout = normalizeSalesReportLayout({
			order: ["summary"],
			hidden: ["products", "products", "unknown" as "summary"],
		});

		expect(layout.hidden).toEqual(["products"]);
	});
});

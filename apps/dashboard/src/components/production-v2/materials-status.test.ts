import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ProductionMaterialsNotice } from "./materials-status";

describe("ProductionMaterialsNotice", () => {
	it("shows an assigned worker when inbound materials are expected", () => {
		const html = renderToStaticMarkup(
			createElement(ProductionMaterialsNotice, {
				materials: [
					{
						salesOrderId: 42,
						salesItemId: 101,
						componentId: 501,
						name: "Oak panels",
						readiness: "awaiting_inbound",
						stockStatus: "awaiting_inbound",
						requiredQty: 2,
						availableQty: 0,
						openInboundQty: 2,
						expectedAt: "2026-07-29T12:00:00.000Z",
					},
				],
			}),
		);

		expect(html).toContain("This assignment is active");
		expect(html).toContain("Oak panels");
		expect(html).toContain("2 inbound");
		expect(html).toContain("Expected Jul 29, 2026");
	});
});

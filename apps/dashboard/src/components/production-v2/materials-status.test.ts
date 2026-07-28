import { describe, it } from "bun:test";
import assert from "node:assert/strict";
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
						undatedOpenInboundQty: 0,
					},
				],
			}),
		);

		assert.match(html, /This assignment is active/);
		assert.match(html, /Oak panels/);
		assert.match(html, /2 inbound/);
		assert.match(html, /Expected Jul 29, 2026/);
	});

	it("does not promise full availability when some inbound quantity is unscheduled", () => {
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
						requiredQty: 4,
						availableQty: 0,
						openInboundQty: 4,
						expectedAt: "2026-07-29T12:00:00.000Z",
						undatedOpenInboundQty: 2,
					},
				],
			}),
		);

		assert.match(html, /Latest known ETA Jul 29, 2026 · 2 unscheduled/);
		assert.doesNotMatch(html, />Expected Jul 29, 2026</);
	});

	it("keeps an assignment active when material status cannot load", () => {
		const html = renderToStaticMarkup(
			createElement(ProductionMaterialsNotice, {
				materials: [],
				unavailable: true,
			}),
		);

		assert.match(html, /Material status unavailable/);
		assert.match(html, /This assignment remains active/);
	});
});

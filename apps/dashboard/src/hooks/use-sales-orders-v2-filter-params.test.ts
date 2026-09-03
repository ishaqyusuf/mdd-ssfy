import { describe, expect, it } from "bun:test";

import {
	loadSalesOrdersV2FilterParams,
	salesOrdersV2FilterParams,
} from "./use-sales-orders-v2-filter-params";

describe("Sales Orders lifecycle filter URL contract", () => {
	it("serializes and reloads a stable multi-select lifecycle population", async () => {
		const lifecycle = ["conflict", "unknown"] as const;
		const serialized = salesOrdersV2FilterParams.lifecycle.serialize([
			...lifecycle,
		]);
		const loaded = await loadSalesOrdersV2FilterParams(
			new URLSearchParams(`lifecycle=${encodeURIComponent(serialized)}`),
		);

		expect(serialized).toBe("conflict,unknown");
		expect(loaded.lifecycle).toEqual(lifecycle);
	});

	it("keeps lifecycle independent from payment, Production, and Fulfillment filters", async () => {
		const loaded = await loadSalesOrdersV2FilterParams(
			new URLSearchParams(
				"lifecycle=conflict%2Cunknown&invoice=paid&production=pending&completion.fulfillment=pending",
			),
		);

		expect(loaded).toMatchObject({
			lifecycle: ["conflict", "unknown"],
			invoice: "paid",
			production: "pending",
			"completion.fulfillment": "pending",
		});
	});

	it("drops unsupported lifecycle members instead of widening the result set", async () => {
		const loaded = await loadSalesOrdersV2FilterParams(
			new URLSearchParams("lifecycle=conflict%2Clegacy-status"),
		);

		expect(loaded.lifecycle).toEqual(["conflict"]);
	});
});

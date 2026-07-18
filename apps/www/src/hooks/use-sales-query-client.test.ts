import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const source = readFileSync(
	resolve(dirname(fileURLToPath(import.meta.url)), "use-sales-query-client.ts"),
	{
		encoding: "utf8",
	},
);

describe("useSalesQueryClient query events", () => {
	it("keeps legacy invalidation methods behind domain events", () => {
		expect(source.includes('emit("sales.order.changed"')).toBe(true);
		expect(source.includes('emit("sales.quote.changed"')).toBe(true);
		expect(source.includes('emit("sales.payment.changed"')).toBe(true);
		expect(source.includes("getSalesScope(sales)")).toBe(true);
	});

	it("routes sales lifecycle helpers through their canonical events", () => {
		expect(
			source.includes('emit("sales.production.changed"'),
		).toBe(true);
		expect(
			source.includes('emit("sales.dispatch.changed"'),
		).toBe(true);
		expect(source.includes("salesPaymentUpdated:")).toBe(true);
		expect(source.includes("productionUpdated:")).toBe(true);
	});

	it("retains typed one-off invalidation for compatibility methods", () => {
		expect(
			source.includes('typedInvalidate.path("sales.productionOverview")'),
		).toBe(true);
		expect(
			source.includes('typedInvalidate.query("sales.getSaleOverview"'),
		).toBe(true);
		expect(source.includes('typedInvalidate.path("sales.getSaleOverview")')).toBe(
			true,
		);
	});
});

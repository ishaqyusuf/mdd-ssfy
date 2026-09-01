import { describe, expect, test } from "bun:test";

const source = await Bun.file(
	new URL("./sales-menu.tsx", import.meta.url),
).text();

describe("sales menu dependency-resolution error feedback", () => {
	test("uses one shared, referenced presentation instead of raw exception text", () => {
		const start = source.indexOf("const resolveInventoryAndContinue");
		const end = source.indexOf("const statusMenuActions", start);
		const resolutionBlock = source.slice(start, end);

		expect(start).toBeGreaterThan(-1);
		expect(end).toBeGreaterThan(start);
		expect(resolutionBlock).toContain(
			"getSalesStatusResolutionErrorPresentation(error)",
		);
		expect(resolutionBlock).toContain(
			"setInventoryResolutionError(presentation)",
		);
		expect(resolutionBlock).toContain("duration: 8000");
		expect(resolutionBlock).not.toContain("error.message");
		expect(source).toContain("The fulfillment job did not start.");
		expect(source).toContain(
			"<AlertTitle>{inventoryResolutionError.title}</AlertTitle>",
		);

		const mutationStart = source.indexOf(
			"const resolveInventoryMarkAsMutation",
		);
		const mutationEnd = source.indexOf("const invalidateOrders", mutationStart);
		const mutationBlock = source.slice(mutationStart, mutationEnd);
		expect(mutationBlock).toContain("onError: () => undefined");
	});
});

import { describe, expect, it } from "bun:test";

const source = await Bun.file(
	new URL("./sales-menu.tsx", import.meta.url),
).text();

describe("sales menu copy feedback", () => {
	it("confirms invoice creation before waiting for derived-data refreshes", () => {
		const moveStart = source.indexOf("async move()");
		const moveEnd = source.indexOf("\n\t\t}),", moveStart);
		const moveSource = source.slice(moveStart, moveEnd);
		const confirmation = moveSource.indexOf(
			'loader.success(isQuote ? "Invoice created"',
		);
		const refreshWait = moveSource.indexOf("await createdOrderRefresh");

		expect(moveStart).toBeGreaterThan(-1);
		expect(moveEnd).toBeGreaterThan(moveStart);
		expect(moveSource).toContain("refreshCreatedOrder(result.id, result.slug)");
		expect(confirmation).toBeGreaterThan(-1);
		expect(refreshWait).toBeGreaterThan(confirmation);
	});

	it("runs independent created-order refreshes concurrently", () => {
		const helperStart = source.indexOf(
			"const refreshCreatedOrder = useCallback(",
		);
		const helperEnd = source.indexOf("\n\t);", helperStart);
		const helperSource = source.slice(helperStart, helperEnd);

		expect(helperSource).toContain("Promise.allSettled([");
		expect(helperSource).toContain("resetSalesStatAction(salesId, orderNo)");
		expect(helperSource).toContain("sq.events.productionUpdated({");
	});
});

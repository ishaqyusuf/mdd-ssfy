import { describe, expect, it } from "bun:test";

const source = await Bun.file(
	new URL("./update-sales-control.ts", import.meta.url),
).text();

describe("update-sales-control permissions", () => {
	it("rechecks the task actor before Mark as Fulfilled writes", () => {
		expect(source).toContain("input.markAsCompleted");
		expect(source).toContain("userHasPermission(");
		expect(source).toContain('"markSalesOrderFulfilled"');
		expect(source.indexOf("userHasPermission(")).toBeLessThan(
			source.indexOf("await enforceSpecialOrderForAction"),
		);
	});
});

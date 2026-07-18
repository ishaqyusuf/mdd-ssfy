import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const source = readFileSync(
	resolve(dirname(fileURLToPath(import.meta.url)), "quick-actions-bar.tsx"),
	"utf8",
);

describe("Sales Overview quick actions query events", () => {
	it("emits a scoped stats event after reset completes", () => {
		expect(
			source.indexOf("await resetSalesStatAction") <
				source.indexOf("await salesQueryClient.events.salesStatReset()"),
		).toBe(true);
		expect(source.includes("orderNo: data?.orderId")).toBe(true);
	});
});

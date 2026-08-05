import { describe, expect, it } from "bun:test";
import { buildSalesFormHeaderTitle } from "./header-title";

describe("sales form header title", () => {
	it("shows the saved document number and persisted date", () => {
		expect(
			buildSalesFormHeaderTitle({
				type: "order",
				orderId: "1234PC",
				isSaved: true,
				createdAt: "2026-08-05T16:30:00.000Z",
			}),
		).toBe("#1234PC 08/05/26");
	});

	it("never adds a date before the sale is saved", () => {
		expect(
			buildSalesFormHeaderTitle({
				type: "order",
				orderId: "1234PC",
				isSaved: false,
				createdAt: "2026-08-05T16:30:00.000Z",
			}),
		).toBe("Editing order 1234PC");
		expect(
			buildSalesFormHeaderTitle({
				type: "order",
				isSaved: false,
				createdAt: "2026-08-05T16:30:00.000Z",
			}),
		).toBe("New order");
	});

	it("keeps a saved document title usable when its date is unavailable", () => {
		expect(
			buildSalesFormHeaderTitle({
				type: "quote",
				orderId: "4321PC",
				isSaved: true,
				createdAt: null,
			}),
		).toBe("#4321PC");
	});
});

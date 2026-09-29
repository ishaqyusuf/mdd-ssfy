import { describe, expect, test } from "bun:test";
import { buildDealerServiceItemProjection } from "./dealer-service-projection";

describe("dealer service office projection", () => {
	test("preserves selected workflow and exact office cents across service rows", () => {
		const projection = buildDealerServiceItemProjection({
			uid: "dealer-service",
			title: "Services",
			itemIndex: 2,
			internalLineTotal: 8,
			meta: {
				serviceRows: [
					{
						uid: "row-a",
						service: "Install",
						qty: 3,
						unitPrice: 2,
						lineTotal: 6,
						taxxable: true,
					},
					{
						uid: "row-b",
						service: "Measure",
						qty: 1,
						unitPrice: 4,
						lineTotal: 4,
					},
				],
			},
			formSteps: [
				{ stepId: 1, componentId: 907, prodUid: "UOxks", value: "Services" },
				{ stepId: 217, prodUid: "", value: "" },
			],
		});
		expect(projection?.items.map((row) => row.total)).toEqual([4.8, 3.2]);
		expect(
			projection?.items.map((row) => Math.round(row.qty * row.rate * 100)),
		).toEqual([480, 320]);
		expect(projection?.items[0]).toMatchObject({
			multiDykeUid: "dealer-service",
			multiDyke: true,
			meta: { tax: true, meta: { itemIndex: 2 } },
		});
		expect(projection?.formSteps).toMatchObject([
			{ stepId: 1, prodUid: "UOxks" },
			{ stepId: 217 },
		]);
	});

	test("allocates a rounding remainder without changing the saved office total", () => {
		const result = buildDealerServiceItemProjection({
			uid: "rounding",
			itemIndex: 0,
			internalLineTotal: 0.05,
			meta: {
				serviceRows: Array.from({ length: 3 }, (_, index) => ({
					uid: String(index),
					service: "Test",
					qty: 1,
					unitPrice: 0.02,
				})),
			},
		});
		expect(result?.items.map((row) => row.total)).toEqual([0.02, 0.02, 0.01]);
	});
});

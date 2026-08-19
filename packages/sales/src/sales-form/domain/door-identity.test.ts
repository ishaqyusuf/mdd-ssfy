import { describe, expect, it } from "bun:test";
import {
	collapseDuplicateSalesDoorRows,
	findDuplicateSalesDoorIdentities,
	getSalesDoorActiveIdentity,
} from "./door-identity";

describe("sales door active identity", () => {
	it("normalizes the component and dimension", () => {
		expect(
			getSalesDoorActiveIdentity({
				stepProductId: 1322,
				dimension: " 2-6  ×  6-8 ",
			}),
		).toBe("product:1322|2-6 x 6-8");
	});

	it("reports duplicate component and size rows", () => {
		expect(
			findDuplicateSalesDoorIdentities([
				{ stepProductId: 1322, dimension: "2-6 x 6-8" },
				{ stepProductId: 1322, dimension: "2-6 × 6-8" },
			]),
		).toEqual(["product:1322|2-6 x 6-8"]);
	});

	it("keeps the stable id and the most complete price without summing qty", () => {
		const [row] = collapseDuplicateSalesDoorRows([
			{
				id: 10,
				stepProductId: 1322,
				dimension: "2-6 x 6-8",
				totalQty: 1,
				unitPrice: 281.17,
				meta: { baseUnitPrice: 0 },
			},
			{
				id: 11,
				stepProductId: 1322,
				dimension: "2-6 X 6-8",
				totalQty: 1,
				unitPrice: 355.67,
				lineTotal: 355.67,
				jambSizePrice: 281.17,
				meta: { baseUnitPrice: 196.82, doorSalesUnitPrice: 281.17 },
			},
		]);
		expect(row).toMatchObject({
			id: 10,
			totalQty: 1,
			unitPrice: 355.67,
			lineTotal: 355.67,
		});
	});
});

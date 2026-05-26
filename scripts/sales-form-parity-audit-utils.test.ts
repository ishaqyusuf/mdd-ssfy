import { describe, expect, test } from "bun:test";

import {
	alternateLatestOrderQuote,
	compareTotals,
	groupSalesByMonth,
} from "./sales-form-parity-audit-utils";

describe("sales form parity audit utilities", () => {
	test("groups sales records by month while preserving type buckets", () => {
		const grouped = groupSalesByMonth([
			{
				id: 1,
				type: "order",
				orderId: "O-1",
				slug: "O-1",
				createdAt: "2026-05-10T00:00:00.000Z",
			},
			{
				id: 2,
				type: "quote",
				orderId: "Q-1",
				slug: "Q-1",
				createdAt: "2026-04-10T00:00:00.000Z",
			},
			{
				id: 3,
				type: "quote",
				orderId: "Q-2",
				slug: "Q-2",
				createdAt: "2026-05-09T00:00:00.000Z",
			},
		]);

		expect(Object.keys(grouped)).toEqual(["2026-05", "2026-04"]);
		expect(grouped["2026-05"]?.order.map((record) => record.orderId)).toEqual([
			"O-1",
		]);
		expect(grouped["2026-05"]?.quote.map((record) => record.orderId)).toEqual([
			"Q-2",
		]);
		expect(grouped["2026-05"]?.total).toBe(2);
	});

	test("alternates latest order then latest quote and continues remaining orders", () => {
		const ordered = alternateLatestOrderQuote({
			order: [
				{ id: 1, type: "order", orderId: "O-1", slug: "O-1", createdAt: "" },
				{ id: 2, type: "order", orderId: "O-2", slug: "O-2", createdAt: "" },
				{ id: 3, type: "order", orderId: "O-3", slug: "O-3", createdAt: "" },
			],
			quote: [
				{ id: 4, type: "quote", orderId: "Q-1", slug: "Q-1", createdAt: "" },
			],
		});

		expect(ordered.map((record) => record.orderId)).toEqual([
			"O-1",
			"Q-1",
			"O-2",
			"O-3",
		]);
	});

	test("alternates latest order then latest quote and continues remaining quotes", () => {
		const ordered = alternateLatestOrderQuote({
			order: [
				{ id: 1, type: "order", orderId: "O-1", slug: "O-1", createdAt: "" },
			],
			quote: [
				{ id: 2, type: "quote", orderId: "Q-1", slug: "Q-1", createdAt: "" },
				{ id: 3, type: "quote", orderId: "Q-2", slug: "Q-2", createdAt: "" },
			],
		});

		expect(ordered.map((record) => record.orderId)).toEqual([
			"O-1",
			"Q-1",
			"Q-2",
		]);
	});

	test("compares rounded cent totals", () => {
		expect(
			compareTotals({
				persisted: {
					subTotal: 100,
					tax: 7,
					grandTotal: 107,
				},
				calculated: {
					subTotal: 100.004,
					tax: 7,
					grandTotal: 107.01,
				},
			}),
		).toEqual({
			pass: false,
			deltas: {
				subTotal: 0,
				tax: 0,
				grandTotal: 0.01,
			},
		});
	});
});

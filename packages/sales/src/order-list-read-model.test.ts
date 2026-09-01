import { describe, expect, it } from "bun:test";
import {
	compareSalesOrderListRows,
	hydrateSalesOrderListRow,
	isSalesOrderListProjectionFresh,
	salesOrderListProjectionVersion,
	serializeSalesOrderListRow,
} from "./order-list-read-model";

describe("sales order list read model", () => {
	it("round-trips the dates required by the orders table", () => {
		const row = {
			id: 42,
			createdAt: new Date("2026-08-21T08:00:00.000Z"),
			latestPaymentReview: {
				receivedAt: new Date("2026-08-21T07:00:00.000Z"),
			},
			completion: {
				productionEffectiveAt: null,
				productionRecordedAt: new Date("2026-08-21T07:30:00.000Z"),
				history: [
					{
						effectiveAt: null,
						recordedAt: new Date("2026-08-21T07:30:00.000Z"),
						updatedAt: new Date("2026-08-21T07:31:00.000Z"),
					},
				],
			},
		};

		const hydrated = hydrateSalesOrderListRow<typeof row>(
			serializeSalesOrderListRow(row),
		);

		expect(hydrated.createdAt).toEqual(row.createdAt);
		expect(hydrated.latestPaymentReview.receivedAt).toEqual(
			row.latestPaymentReview.receivedAt,
		);
		expect(hydrated.completion.productionEffectiveAt).toBeNull();
		expect(hydrated.completion.productionRecordedAt).toEqual(
			row.completion.productionRecordedAt,
		);
		expect(hydrated.completion.history[0]?.updatedAt).toEqual(
			row.completion.history[0]?.updatedAt,
		);
		expect(
			"missing" in serializeSalesOrderListRow({ missing: undefined }),
		).toBe(false);
	});

	it("reports only rows whose normalized payload changed", () => {
		const legacyRows = [
			{ id: 1, status: "open" },
			{ id: 2, status: "paid" },
		];
		const projectedRows = [
			{ status: "open", id: 1 },
			{ id: 2, status: "outstanding" },
		];

		expect(compareSalesOrderListRows(legacyRows, projectedRows)).toEqual({
			matches: false,
			legacyIds: [1, 2],
			projectionIds: [1, 2],
			mismatchedIds: [2],
		});
	});

	it("ignores storage-level floating point noise but detects real changes", () => {
		expect(
			compareSalesOrderListRows(
				[{ id: 1, amountPaid: 0.009999999999990905 }],
				[{ id: 1, amountPaid: 0.009999999999990903 }],
			).matches,
		).toBe(true);
		expect(
			compareSalesOrderListRows(
				[{ id: 1, amountPaid: 0.01 }],
				[{ id: 1, amountPaid: 0.02 }],
			).matches,
		).toBe(false);
	});

	it("rejects wrong-version, changed-source, and expired rows", () => {
		const now = new Date("2026-08-21T08:10:00.000Z").getTime();
		const version = salesOrderListProjectionVersion();
		const base = {
			state: "ready",
			version,
			sourceUpdatedAt: new Date("2026-08-21T08:00:00.123Z"),
			projectionSourceUpdatedAt: new Date("2026-08-21T08:00:00.123Z"),
			projectedAt: new Date("2026-08-21T08:09:00.000Z"),
			maxAgeMs: 300_000,
			now,
		};

		expect(isSalesOrderListProjectionFresh(base)).toBe(true);
		expect(
			isSalesOrderListProjectionFresh({ ...base, version: version + 1 }),
		).toBe(false);
		expect(
			isSalesOrderListProjectionFresh({
				...base,
				projectionSourceUpdatedAt: new Date("2026-08-21T08:00:00.000Z"),
			}),
		).toBe(false);
		expect(
			isSalesOrderListProjectionFresh({
				...base,
				projectedAt: new Date("2026-08-21T08:00:00.000Z"),
			}),
		).toBe(false);
	});
});

import { describe, expect, it } from "bun:test";
import {
	compareSalesOrderListRows,
	hydrateSalesOrderListRow,
	isSalesOrderListProjectionFresh,
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
		};

		const hydrated = hydrateSalesOrderListRow<typeof row>(
			serializeSalesOrderListRow(row),
		);

		expect(hydrated.createdAt).toEqual(row.createdAt);
		expect(hydrated.latestPaymentReview.receivedAt).toEqual(
			row.latestPaymentReview.receivedAt,
		);
		expect("missing" in serializeSalesOrderListRow({ missing: undefined })).toBe(
			false,
		);
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

	it("rejects wrong-version, changed-source, and expired rows", () => {
		const now = new Date("2026-08-21T08:10:00.000Z").getTime();
		const base = {
			state: "ready",
			version: 1,
			sourceUpdatedAt: new Date("2026-08-21T08:00:00.123Z"),
			projectionSourceUpdatedAt: new Date("2026-08-21T08:00:00.123Z"),
			projectedAt: new Date("2026-08-21T08:09:00.000Z"),
			maxAgeMs: 300_000,
			now,
		};

		expect(isSalesOrderListProjectionFresh(base)).toBe(true);
		expect(
			isSalesOrderListProjectionFresh({ ...base, version: 2 }),
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

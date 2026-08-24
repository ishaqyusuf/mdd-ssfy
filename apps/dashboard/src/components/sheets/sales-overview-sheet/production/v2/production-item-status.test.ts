import { describe, expect, test } from "bun:test";

import {
	getProductionItemStatusBadges,
	getQuantityMatrixTotal,
} from "./production-item-status";

const labels = (
	status: Parameters<typeof getProductionItemStatusBadges>[0],
) => getProductionItemStatusBadges(status).map((badge) => badge.label);

const status = (overrides: Partial<Parameters<typeof labels>[0]> = {}) => ({
	assigned: 0,
	fulfilled: 0,
	shippable: true,
	submitted: 0,
	total: 3,
	...overrides,
});

describe("production item progressive status", () => {
	test("shows only the current completed or partial stage", () => {
		expect(labels(status())).toEqual(["NOT ASSIGNED"]);
		expect(labels(status({ assigned: 1 }))).toEqual(["1 OF 3 ASSIGNED"]);
		expect(labels(status({ assigned: 3 }))).toEqual(["ASSIGNED"]);
		expect(labels(status({ assigned: 3, submitted: 1 }))).toEqual([
			"1 OF 3 SUBMITTED",
		]);
		expect(labels(status({ assigned: 3, submitted: 3 }))).toEqual([
			"READY TO FULFILL",
		]);
		expect(
			labels(status({ assigned: 3, fulfilled: 2, submitted: 3 })),
		).toEqual(["2 OF 3 FULFILLED"]);
		expect(
			labels(status({ assigned: 3, fulfilled: 3, submitted: 3 })),
		).toEqual(["FULFILLED"]);
	});

	test("keeps partial upstream stages visible during overlapping work", () => {
		expect(
			labels(status({ assigned: 2, fulfilled: 1, submitted: 1 })),
		).toEqual([
			"2 OF 3 ASSIGNED",
			"1 OF 3 SUBMITTED",
			"1 OF 3 FULFILLED",
		]);
	});

	test("uses production completed for non-shippable items", () => {
		expect(
			labels(status({ assigned: 3, shippable: false, submitted: 3 })),
		).toEqual(["PRODUCTION COMPLETED"]);
	});

	test("supports both general and handled quantity matrices", () => {
		expect(getQuantityMatrixTotal({ qty: 4 })).toBe(4);
		expect(getQuantityMatrixTotal({ lh: 2, qty: 0, rh: 1 })).toBe(3);
		expect(getQuantityMatrixTotal(null)).toBe(0);
	});
});

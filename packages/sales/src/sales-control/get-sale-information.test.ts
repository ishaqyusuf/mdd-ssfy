import { describe, expect, it } from "bun:test";

import { FullSalesSelect } from "../utils/utils";
import {
	composeFullSalesSelect,
	hasHistoricalProductionCapability,
	preserveHistoricalProductionCapability,
} from "./get-sale-information";

describe("composeFullSalesSelect", () => {
	it("creates request-local assignment filters without mutating the shared select", () => {
		const workerSelect = composeFullSalesSelect(77);
		const adminSelect = composeFullSalesSelect();

		expect(workerSelect.assignments.where.assignedToId).toBe(77);
		expect(adminSelect.assignments.where.assignedToId).toBeUndefined();
		expect(FullSalesSelect.assignments.where.assignedToId).toBeUndefined();
		expect(adminSelect.itemControls.select.orderItemId).toBe(true);
		expect(workerSelect.assignments).not.toBe(adminSelect.assignments);
		expect(workerSelect.assignments.where).not.toBe(
			adminSelect.assignments.where,
		);
	});
});

describe("hasHistoricalProductionCapability", () => {
	const controls = [
		{
			uid: "legacy-control-41",
			orderItemId: 41,
			produceable: true,
		},
	];

	it("matches a historical control by its current uid", () => {
		expect(
			hasHistoricalProductionCapability({
				controls,
				controlUid: "legacy-control-41",
				itemId: 99,
			}),
		).toBe(true);
	});

	it("falls back to the linked order item when a legacy uid changed", () => {
		expect(
			hasHistoricalProductionCapability({
				controls,
				controlUid: "item-41",
				itemId: 41,
			}),
		).toBe(true);
	});

	it("does not match a control from another item", () => {
		expect(
			hasHistoricalProductionCapability({
				controls,
				controlUid: "item-42",
				itemId: 42,
			}),
		).toBe(false);
	});
});

describe("preserveHistoricalProductionCapability", () => {
	it("keeps legacy production items visible when the persisted control is produceable", () => {
		expect(
			preserveHistoricalProductionCapability(
				{ production: false, dispatch: true },
				true,
			),
		).toEqual({ production: true, dispatch: true });
	});

	it("does not turn unrelated historical items into production items", () => {
		expect(
			preserveHistoricalProductionCapability(
				{ production: false, dispatch: true },
				false,
			),
		).toEqual({ production: false, dispatch: true });
	});
});

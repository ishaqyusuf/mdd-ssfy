import { describe, expect, it } from "bun:test";
import {
	INVENTORY_PRODUCTION_LIFECYCLE_SYNC_ACTIONS,
	UPDATE_SALES_CONTROL_COMMAND_MAP,
	resolveLegacyUpdateSalesControlAction,
	shouldSyncInventoryProductionLifecycleForSalesControl,
} from "./update-sales-control-command-map";
import type { UpdateSalesControl } from "../../schema";

const baseInput = {
	meta: {
		salesId: 1,
		authorId: 2,
		authorName: "Test User",
	},
} satisfies Pick<UpdateSalesControl, "meta">;

describe("update sales control command map", () => {
	it("routes every production mutation through inventory lifecycle sync", () => {
		expect(INVENTORY_PRODUCTION_LIFECYCLE_SYNC_ACTIONS).toEqual([
			"submitAll",
			"createAssignments",
			"updateSubmissions",
			"deleteSubmissions",
			"deleteAssignments",
			"markAsCompleted",
		]);

		for (const action of INVENTORY_PRODUCTION_LIFECYCLE_SYNC_ACTIONS) {
			expect(
				shouldSyncInventoryProductionLifecycleForSalesControl({
					...baseInput,
					[action]: {},
				}),
				action,
			).toBe(true);
			expect(UPDATE_SALES_CONTROL_COMMAND_MAP[action], action).toBeDefined();
		}
	});

	it("does not refresh production lifecycle for dispatch-only mutations", () => {
		for (const action of [
			"packItems",
			"clearPackings",
			"cancelDispatch",
			"startDispatch",
			"submitDispatch",
		] as const) {
			expect(
				shouldSyncInventoryProductionLifecycleForSalesControl({
					...baseInput,
					[action]: {},
				}),
				action,
			).toBe(false);
		}
	});

	it("rejects ambiguous multi-action payloads before command execution", () => {
		expect(() =>
			resolveLegacyUpdateSalesControlAction({
				...baseInput,
				createAssignments: {},
				submitAll: {},
			}),
		).toThrow("Multiple actions are not allowed");
	});
});

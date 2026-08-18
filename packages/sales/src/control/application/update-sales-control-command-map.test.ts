import { describe, expect, it } from "bun:test";
import type { UpdateSalesControl } from "../../schema";
import {
	INVENTORY_PRODUCTION_LIFECYCLE_SYNC_ACTIONS,
	UPDATE_SALES_CONTROL_COMMAND_MAP,
	resolveLegacyUpdateSalesControlAction,
	shouldSyncInventoryProductionLifecycleForSalesControl,
} from "./update-sales-control-command-map";

const baseInput = {
	meta: {
		salesId: 1,
		authorId: 2,
		authorName: "Test User",
	},
} satisfies Pick<UpdateSalesControl, "meta">;

describe("update sales control command map", () => {
	it("keeps assignment independent from inventory lifecycle sync", () => {
		expect(INVENTORY_PRODUCTION_LIFECYCLE_SYNC_ACTIONS).toEqual([
			"updateSubmissions",
			"deleteSubmissions",
			"deleteAssignments",
			"markAsCompleted",
		]);
		expect(
			shouldSyncInventoryProductionLifecycleForSalesControl({
				...baseInput,
				createAssignments: {},
			}),
		).toBe(false);
		expect(
			shouldSyncInventoryProductionLifecycleForSalesControl({
				...baseInput,
				submitAll: {},
			}),
		).toBe(false);

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

	it("rejects payloads without an action before command execution", () => {
		expect(() =>
			resolveLegacyUpdateSalesControlAction(baseInput as UpdateSalesControl),
		).toThrow("One action is required");
	});
});

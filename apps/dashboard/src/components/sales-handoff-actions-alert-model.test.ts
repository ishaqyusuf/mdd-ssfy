import { describe, expect, it } from "bun:test";
import {
	advanceSalesHandoffFocusTracking,
	beginSalesHandoffFocusTracking,
	getSalesHandoffFocusRestoreTarget,
	groupSalesHandoffActionsByRepresentative,
	hiddenSalesHandoffActionCount,
	nextSalesHandoffVisibleCount,
	visibleSalesHandoffActions,
} from "./sales-handoff-actions-alert-model";

describe("sales handoff alert behavior", () => {
	it("reveals actions in batches of six and reports the current remainder", () => {
		const actions = Array.from({ length: 15 }, (_, index) => index + 1);
		expect(visibleSalesHandoffActions(actions, 6)).toEqual(actions.slice(0, 6));
		expect(hiddenSalesHandoffActionCount(actions, 6)).toBe(9);
		expect(nextSalesHandoffVisibleCount(6, actions.length)).toBe(12);
		expect(hiddenSalesHandoffActionCount(actions, 12)).toBe(3);
		expect(nextSalesHandoffVisibleCount(12, actions.length)).toBe(15);
	});

	it("groups visible admin actions by their responsible representative", () => {
		const actions = [
			{ id: "a", responsibleRepId: 7, responsibleRepName: "Pablo" },
			{ id: "b", responsibleRepId: 9, responsibleRepName: "Nia" },
			{ id: "c", responsibleRepId: 7, responsibleRepName: "Pablo" },
		];
		expect(groupSalesHandoffActionsByRepresentative(actions)).toEqual([
			{
				representativeId: 7,
				representativeName: "Pablo",
				actions: [actions[0], actions[2]],
			},
			{ representativeId: 9, representativeName: "Nia", actions: [actions[1]] },
		]);
	});

	it("restores the invoking pill only after its overview opens and closes", () => {
		let state = beginSalesHandoffFocusTracking({
			actionId: "action-1",
			orderId: "SO-1",
		});
		expect(advanceSalesHandoffFocusTracking(state, null)).toEqual({
			state,
			restoreActionId: null,
		});

		state = advanceSalesHandoffFocusTracking(state, "SO-1").state;
		expect(state?.observedOpen).toBe(true);
		expect(advanceSalesHandoffFocusTracking(state, "SO-2")).toEqual({
			state,
			restoreActionId: null,
		});
		expect(advanceSalesHandoffFocusTracking(state, null)).toEqual({
			state: null,
			restoreActionId: "action-1",
		});
	});

	it("falls back to the stable alert anchor when the resolved pill disappeared", () => {
		expect(getSalesHandoffFocusRestoreTarget(true)).toBe("origin");
		expect(getSalesHandoffFocusRestoreTarget(false)).toBe("fallback");
	});
});

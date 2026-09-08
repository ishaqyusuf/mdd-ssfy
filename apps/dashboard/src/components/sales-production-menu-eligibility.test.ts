import { expect, test } from "bun:test";
import { applySalesProductionMenuEligibility } from "./sales-status-menu-actions";
const actions = [
	{ action: "production_completed" as const, label: "Production completed" },
	{ action: "fulfilled" as const, label: "Fulfilled" },
];
test("production menu reflects stage applicability independently of fulfillment", () => {
	expect(applySalesProductionMenuEligibility(actions, "not_required")).toEqual([
		actions[1],
	]);
	expect(applySalesProductionMenuEligibility(actions, "required")).toEqual(
		actions,
	);
	expect(
		applySalesProductionMenuEligibility(actions, undefined)[0],
	).toMatchObject({
		disabled: true,
		disabledReason: "Production requirements need review",
	});
	expect(
		applySalesProductionMenuEligibility(
			[
				{
					action: "production_administrative_override",
					label: "Production completed",
				},
			],
			"unknown",
		)[0]?.disabled,
	).toBe(true);
});

test("removing production requirements retains an existing audited cancellation action", () => {
	const cancel = {
		action: "cancel_production" as const,
		label: "Cancel recorded completion",
	};
	expect(
		applySalesProductionMenuEligibility(
			[...actions, cancel],
			"not_required",
			true,
		),
	).toEqual([actions[1], cancel]);
});

test("ordinary cancellation is hidden when production is not required", () => {
	expect(
		applySalesProductionMenuEligibility(
			[{ action: "cancel_production", label: "Cancel Production" }],
			"not_required",
		),
	).toEqual([]);
});

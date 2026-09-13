import { describe, expect, test } from "bun:test";
import {
	canOpenSalesRequestGeneration,
	canShowSalesRequestGenerationEntry,
} from "./request-generation-entry-policy";

describe("Sales Request Generation pilot entry policy", () => {
	test.each([
		["pending", { status: "pending" as const }],
		["failed", { status: "error" as const }],
		["disabled", { status: "ready" as const, eligible: false }],
	])(
		"hides and blocks the entry point while access is %s",
		(_name, pilotAccess) => {
			expect(
				canShowSalesRequestGenerationEntry({
					mode: "create",
					hasHistoryPreview: false,
					pilotAccess,
				}),
			).toBe(false);
			expect(
				canOpenSalesRequestGeneration({
					mode: "create",
					pilotAccess,
					isSaving: false,
				}),
			).toBe(false);
		},
	);

	test("permits only an eligible, idle create surface", () => {
		const pilotAccess = { status: "ready" as const, eligible: true };
		expect(
			canShowSalesRequestGenerationEntry({
				mode: "create",
				hasHistoryPreview: false,
				pilotAccess,
			}),
		).toBe(true);
		expect(
			canShowSalesRequestGenerationEntry({
				mode: "edit",
				hasHistoryPreview: false,
				pilotAccess,
			}),
		).toBe(false);
		expect(
			canOpenSalesRequestGeneration({
				mode: "create",
				pilotAccess,
				isSaving: true,
			}),
		).toBe(false);
	});
});

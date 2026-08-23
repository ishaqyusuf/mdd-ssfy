import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import type { SalesHandoffTriggerPolicy } from "@gnd/settings";
import {
	formatSalesHandoffTriggerChangedAt,
	getSalesHandoffTriggerPercentageError,
	hasSalesHandoffTriggerChanges,
	toSalesHandoffTriggerDraft,
	toSalesHandoffTriggerInput,
} from "./sales-handoff-trigger-settings-model";

const persisted: SalesHandoffTriggerPolicy = {
	mode: "FULLY_PAID",
	percentage: null,
	revision: 4,
	changedAt: "2026-08-23T12:00:00.000Z",
};

describe("Sales Handoff Trigger settings interactions", () => {
	test("selecting percentage mode validates the editable value before save", () => {
		const draft = {
			...toSalesHandoffTriggerDraft(persisted),
			mode: "PAYMENT_PERCENTAGE" as const,
			percentage: "0",
		};
		expect(hasSalesHandoffTriggerChanges(draft, persisted)).toBe(true);
		expect(getSalesHandoffTriggerPercentageError(draft)).toContain(
			"1 through 100",
		);

		const corrected = { ...draft, percentage: "40" };
		expect(getSalesHandoffTriggerPercentageError(corrected)).toBeNull();
		expect(toSalesHandoffTriggerInput(corrected)).toEqual({
			mode: "PAYMENT_PERCENTAGE",
			percentage: 40,
		});
	});

	test("discarding reconstructs the persisted draft and clears the changed state", () => {
		const edited = {
			...toSalesHandoffTriggerDraft(persisted),
			mode: "ANY_PAYMENT" as const,
		};
		expect(hasSalesHandoffTriggerChanges(edited, persisted)).toBe(true);

		const discarded = toSalesHandoffTriggerDraft(persisted);
		expect(hasSalesHandoffTriggerChanges(discarded, persisted)).toBe(false);
		expect(toSalesHandoffTriggerInput(discarded)).toEqual({
			mode: "FULLY_PAID",
			percentage: null,
		});
	});

	test("renders the same policy timestamp in every server and browser timezone", () => {
		expect(formatSalesHandoffTriggerChangedAt("2026-08-23T12:05:00.000Z")).toBe(
			"Aug 23, 2026 at 12:05 PM UTC",
		);
		expect(formatSalesHandoffTriggerChangedAt("invalid")).toBe("Unknown time");
	});

	test("keeps query retry, mutation, and pending interaction wiring in the page", () => {
		const source = readFileSync(
			new URL("./sales-handoff-trigger-settings-page.tsx", import.meta.url),
			"utf8",
		);
		expect(source).toContain("getSalesHandoffTrigger.queryOptions()");
		expect(source).toContain("updateSalesHandoffTrigger.mutationOptions");
		expect(source).toContain("onRetry={() => void settingsQuery.refetch()}");
		expect(source).toContain("updateSettings.isPending");
		expect(source).toContain("queryClient.setQueryData");
	});
});

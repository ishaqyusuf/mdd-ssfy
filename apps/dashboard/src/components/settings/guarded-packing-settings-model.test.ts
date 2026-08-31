import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { DEFAULT_GUARDED_PACKING_POLICY } from "@gnd/settings";

import {
	guardedPackingPolicyToInput,
	isGuardedPackingPolicyDraftChanged,
} from "./guarded-packing-settings-model";

describe("guarded packing settings model", () => {
	it("maps every editable setting and excludes revision metadata", () => {
		expect(guardedPackingPolicyToInput(DEFAULT_GUARDED_PACKING_POLICY)).toEqual(
			{
				enabled: true,
				allowAwaitingProductionSubmission: true,
				allowPendingMaterialReview: true,
				reviewMode: "BLOCK_DELIVERY_UNTIL_APPROVED",
				notifySalesRep: true,
				createProductionEvidenceOnApproval: true,
			},
		);
	});

	it("detects a change to every configurable setting", () => {
		const base = guardedPackingPolicyToInput(DEFAULT_GUARDED_PACKING_POLICY);
		const variants = [
			{ ...base, enabled: false },
			{ ...base, allowAwaitingProductionSubmission: false },
			{ ...base, allowPendingMaterialReview: false },
			{ ...base, reviewMode: "ALLOW_DELIVERY_WHILE_PENDING" as const },
			{ ...base, notifySalesRep: false },
			{ ...base, createProductionEvidenceOnApproval: false },
		];
		expect(
			variants.every((draft) =>
				isGuardedPackingPolicyDraftChanged(
					draft,
					DEFAULT_GUARDED_PACKING_POLICY,
				),
			),
		).toBe(true);
		expect(
			isGuardedPackingPolicyDraftChanged(base, DEFAULT_GUARDED_PACKING_POLICY),
		).toBe(false);
	});

	it("keeps the delivery policy in one card and disables dependent controls", () => {
		const source = readFileSync(
			new URL("./guarded-packing-settings-page.tsx", import.meta.url),
			"utf8",
		);

		expect(source.match(/<SettingsCard\b/g)).toHaveLength(1);
		expect(source).toContain("footer={");
		expect(source).toContain("Save delivery policy");
		expect(source).toContain("aria-disabled={!draft.enabled}");
		expect(source).toContain("disabled={!draft.enabled}");
	});
});

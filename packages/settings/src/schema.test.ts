import { describe, expect, test } from "bun:test";
import {
	DEFAULT_SALES_HANDOFF_TRIGGER_POLICY,
	DEFAULT_SALES_OVERVIEW_VIEW_SETTINGS,
	DEFAULT_SALES_PRINT_SETTINGS,
	DEFAULT_SPECIAL_ORDER_SETTINGS,
	normalizeSalesHandoffTriggerPolicy,
	normalizeSalesOverviewViewSettings,
	normalizeSalesPrintSettings,
	normalizeSpecialOrderSettings,
	resolveSalesOverviewGeneralVersion,
	reviseSalesHandoffTriggerPolicy,
	salesHandoffTriggerInputSchema,
	salesOverviewViewSettingsSchema,
	salesPrintSettingsSchema,
	specialOrderSettingsSchema,
} from "./schema";

describe("sales handoff trigger settings", () => {
	test("defaults to fully paid without inventing a persisted revision", () => {
		expect(normalizeSalesHandoffTriggerPolicy()).toEqual(
			DEFAULT_SALES_HANDOFF_TRIGGER_POLICY,
		);
	});

	test("requires a whole-number percentage from one through one hundred", () => {
		for (const percentage of [0, 1.5, 101, null]) {
			expect(
				salesHandoffTriggerInputSchema.safeParse({
					mode: "PAYMENT_PERCENTAGE",
					percentage,
				}).success,
			).toBe(false);
		}
		expect(
			salesHandoffTriggerInputSchema.safeParse({
				mode: "PAYMENT_PERCENTAGE",
				percentage: 35,
			}).success,
		).toBe(true);
	});

	test("revises only effective policy changes", () => {
		const changed = reviseSalesHandoffTriggerPolicy({
			current: DEFAULT_SALES_HANDOFF_TRIGGER_POLICY,
			next: { mode: "ANY_PAYMENT", percentage: 80 },
			changedAt: "2026-08-23T10:00:00.000Z",
		});
		expect(changed).toEqual({
			changed: true,
			policy: {
				mode: "ANY_PAYMENT",
				percentage: null,
				revision: 1,
				changedAt: "2026-08-23T10:00:00.000Z",
			},
		});

		expect(
			reviseSalesHandoffTriggerPolicy({
				current: changed.policy,
				next: { mode: "ANY_PAYMENT", percentage: null },
				changedAt: "2026-08-23T11:00:00.000Z",
			}),
		).toEqual({ policy: changed.policy, changed: false });
	});
});

describe("sales overview view settings", () => {
	test("defaults every Sales Overview user to V2", () => {
		expect(normalizeSalesOverviewViewSettings()).toEqual(
			DEFAULT_SALES_OVERVIEW_VIEW_SETTINGS,
		);
		expect(
			resolveSalesOverviewGeneralVersion({
				isSuperAdmin: true,
			}),
		).toBe("v2");
		expect(
			resolveSalesOverviewGeneralVersion({
				isSuperAdmin: false,
			}),
		).toBe("v2");
	});

	test("lets Super Admin inherit the office default", () => {
		const settings = {
			officeDefault: "v2",
			superAdminPreview: "inherit",
		} as const;
		expect(
			resolveSalesOverviewGeneralVersion({
				isSuperAdmin: true,
				settings,
			}),
		).toBe("v2");
		expect(
			resolveSalesOverviewGeneralVersion({
				isSuperAdmin: false,
				settings,
			}),
		).toBe("v2");
	});

	test("falls back safely when persisted settings are malformed", () => {
		expect(
			salesOverviewViewSettingsSchema.safeParse({
				officeDefault: "v3",
				superAdminPreview: "everyone",
			}).success,
		).toBe(false);
		expect(
			resolveSalesOverviewGeneralVersion({
				isSuperAdmin: false,
				settings: { officeDefault: "v3" },
			}),
		).toBe("v2");
	});
});

describe("sales print settings", () => {
	test("uses the current V2 print defaults", () => {
		expect(normalizeSalesPrintSettings()).toEqual(DEFAULT_SALES_PRINT_SETTINGS);
	});

	test("fills omitted settings without discarding supplied choices", () => {
		expect(
			normalizeSalesPrintSettings({
				pageBreakMode: "section",
				showImages: false,
			}),
		).toEqual({
			...DEFAULT_SALES_PRINT_SETTINGS,
			pageBreakMode: "section",
			showImages: false,
		});
	});

	test("only accepts registered sales templates and page-break modes", () => {
		expect(
			salesPrintSettingsSchema.safeParse({
				templateId: "template-3",
				pageBreakMode: "every-row",
			}).success,
		).toBe(false);
	});
});

describe("special order settings", () => {
	test("launches in warning-only mode with seven-day links", () => {
		expect(normalizeSpecialOrderSettings()).toEqual(
			DEFAULT_SPECIAL_ORDER_SETTINGS,
		);
	});

	test("accepts all approved enforcement modes", () => {
		expect(
			normalizeSpecialOrderSettings({
				releaseAudience: "ALL_STAFF",
				enforcementMode: "BLOCK_PURCHASING_AND_PRODUCTION",
				approvalLinkLifetimeDays: 14,
				activePolicyVersionId: "policy_1",
			}),
		).toEqual({
			releaseAudience: "ALL_STAFF",
			enforcementMode: "BLOCK_PURCHASING_AND_PRODUCTION",
			approvalLinkLifetimeDays: 14,
			activePolicyVersionId: "policy_1",
		});
	});

	test("rejects approval-link lifetimes outside one through thirty days", () => {
		expect(
			specialOrderSettingsSchema.safeParse({
				enforcementMode: "WARNING_ONLY",
				approvalLinkLifetimeDays: 0,
				activePolicyVersionId: null,
			}).success,
		).toBe(false);
		expect(
			specialOrderSettingsSchema.safeParse({
				enforcementMode: "WARNING_ONLY",
				approvalLinkLifetimeDays: 31,
				activePolicyVersionId: null,
			}).success,
		).toBe(false);
	});
});

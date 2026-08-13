import { describe, expect, test } from "bun:test";
import {
	DEFAULT_SALES_PRINT_SETTINGS,
	DEFAULT_SPECIAL_ORDER_SETTINGS,
	normalizeSalesPrintSettings,
	normalizeSpecialOrderSettings,
	salesPrintSettingsSchema,
	specialOrderSettingsSchema,
} from "./schema";

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
				enforcementMode: "BLOCK_PURCHASING_AND_PRODUCTION",
				approvalLinkLifetimeDays: 14,
				activePolicyVersionId: "policy_1",
			}),
		).toEqual({
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

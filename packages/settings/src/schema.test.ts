import { describe, expect, test } from "bun:test";
import {
	DEFAULT_SALES_PRINT_SETTINGS,
	normalizeSalesPrintSettings,
	salesPrintSettingsSchema,
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

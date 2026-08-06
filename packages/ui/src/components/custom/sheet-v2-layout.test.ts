import { describe, expect, it } from "bun:test";

import {
	CUSTOM_SHEET_CLOSE_MS,
	CUSTOM_SHEET_OPEN_MS,
	CUSTOM_SHEET_V2_SIZE_REM,
	resolveCustomSheetDismissLayer,
	resolveCustomSheetLayout,
} from "./sheet-v2-layout";

describe("custom sheet v2 layout", () => {
	it("uses the Midday-aligned v2 sheet size scale", () => {
		expect(CUSTOM_SHEET_V2_SIZE_REM).toEqual({
			default: 32.5,
			lg: 32,
			xl: 36,
			"2xl": 42,
			"3xl": 48,
			"4xl": 56,
			"5xl": 64,
		});
	});

	it("defaults a single pane to Midday's 520px sheet width", () => {
		expect(
			resolveCustomSheetLayout({
				isSideBySide: true,
				secondaryOpened: false,
			}),
		).toMatchObject({
			activeSurfaceWidthRem: 32.5,
			primaryWidthRem: 32.5,
		});
	});

	it("adds two independent 2xl panes without redistributing either width", () => {
		expect(
			resolveCustomSheetLayout({
				isSideBySide: true,
				primarySize: "2xl",
				secondaryOpened: true,
				secondarySize: "2xl",
			}),
		).toMatchObject({
			activeSurfaceWidthRem: 84.0625,
			dividerWidthRem: 0.0625,
			primaryWidthRem: 42,
			secondaryWidthRem: 42,
		});
	});

	it("preserves unequal pane widths", () => {
		expect(
			resolveCustomSheetLayout({
				isSideBySide: true,
				primarySize: "3xl",
				secondaryOpened: true,
				secondarySize: "lg",
			}),
		).toMatchObject({
			activeSurfaceWidthRem: 80.0625,
			primaryWidthRem: 48,
			secondaryWidthRem: 32,
		});
	});

	it("uses the primary width while the secondary pane is closed", () => {
		expect(
			resolveCustomSheetLayout({
				isSideBySide: true,
				primarySize: "2xl",
				secondaryOpened: false,
				secondarySize: "3xl",
			}),
		).toMatchObject({
			activeSurfaceWidthRem: 42,
			dividerWidthRem: 0,
			primaryWidthRem: 42,
			secondaryWidthRem: 48,
		});
	});

	it("uses the secondary width alone when both panes cannot fit", () => {
		expect(
			resolveCustomSheetLayout({
				isSideBySide: false,
				primarySize: "2xl",
				secondaryOpened: true,
				secondarySize: "3xl",
			}),
		).toMatchObject({
			activeSurfaceWidthRem: 48,
			dividerWidthRem: 0,
			primaryWidthRem: 42,
			secondaryWidthRem: 48,
		});
	});

	it("reserves enough viewport width for the Midday frame and safe gutter", () => {
		expect(
			resolveCustomSheetLayout({
				isSideBySide: true,
				primarySize: "2xl",
				secondaryOpened: true,
				secondarySize: "2xl",
			}).sideBySideMinViewportRem,
		).toBe(87.0625);
	});

	it("matches Midday reveal and hide timing", () => {
		expect(CUSTOM_SHEET_OPEN_MS).toBe(300);
		expect(CUSTOM_SHEET_CLOSE_MS).toBe(200);
	});
});

describe("custom sheet layered dismissal", () => {
	it("dismisses the secondary pane before the primary sheet", () => {
		expect(
			resolveCustomSheetDismissLayer({
				canCloseSecondary: true,
				secondaryOpened: true,
			}),
		).toBe("secondary");
	});

	it("dismisses the primary sheet after the secondary pane has closed", () => {
		expect(
			resolveCustomSheetDismissLayer({
				canCloseSecondary: true,
				secondaryOpened: false,
			}),
		).toBe("primary");
	});

	it("does not trap dismissal without a secondary close handler", () => {
		expect(
			resolveCustomSheetDismissLayer({
				canCloseSecondary: false,
				secondaryOpened: true,
			}),
		).toBe("primary");
	});
});

export const CUSTOM_SHEET_V2_SIZE_REM = {
	default: 32.5,
	lg: 32,
	xl: 36,
	"2xl": 42,
	"3xl": 48,
	"4xl": 56,
	"5xl": 64,
} as const;

export type CustomSheetV2Size = keyof typeof CUSTOM_SHEET_V2_SIZE_REM;

export const CUSTOM_SHEET_DIVIDER_REM = 1 / 16;
export const CUSTOM_SHEET_FRAME_REM = 2;
export const CUSTOM_SHEET_VIEWPORT_GUTTER_REM = 1;
export const CUSTOM_SHEET_OPEN_MS = 300;
export const CUSTOM_SHEET_CLOSE_MS = 200;

type ResolveCustomSheetLayoutInput = {
	isSideBySide: boolean;
	primarySize?: CustomSheetV2Size | null;
	secondaryOpened: boolean;
	secondarySize?: CustomSheetV2Size | null;
};

export function resolveCustomSheetLayout({
	isSideBySide,
	primarySize = "default",
	secondaryOpened,
	secondarySize,
}: ResolveCustomSheetLayoutInput) {
	const resolvedPrimarySize = primarySize ?? "default";
	const resolvedSecondarySize = secondarySize ?? resolvedPrimarySize;
	const primaryWidthRem = CUSTOM_SHEET_V2_SIZE_REM[resolvedPrimarySize];
	const secondaryWidthRem = CUSTOM_SHEET_V2_SIZE_REM[resolvedSecondarySize];
	const combinedSurfaceWidthRem =
		primaryWidthRem + secondaryWidthRem + CUSTOM_SHEET_DIVIDER_REM;
	const dividerWidthRem =
		secondaryOpened && isSideBySide ? CUSTOM_SHEET_DIVIDER_REM : 0;
	const activeSurfaceWidthRem = secondaryOpened
		? isSideBySide
			? combinedSurfaceWidthRem
			: secondaryWidthRem
		: primaryWidthRem;

	return {
		activeSurfaceWidthRem,
		combinedSurfaceWidthRem,
		dividerWidthRem,
		primaryWidthRem,
		secondaryWidthRem,
		sideBySideMinViewportRem:
			combinedSurfaceWidthRem +
			CUSTOM_SHEET_FRAME_REM +
			CUSTOM_SHEET_VIEWPORT_GUTTER_REM,
	};
}

export function resolveCustomSheetDismissLayer({
	canCloseSecondary,
	secondaryOpened,
}: {
	canCloseSecondary: boolean;
	secondaryOpened: boolean;
}): "primary" | "secondary" {
	return secondaryOpened && canCloseSecondary ? "secondary" : "primary";
}

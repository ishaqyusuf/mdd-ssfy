import type { ThemeOverride } from "./theme-preference";

export type ResolvedThemeColorScheme = "light" | "dark";
type DeviceColorScheme = ResolvedThemeColorScheme | null | undefined;
type ThemeListener = () => void;

export function resolveThemeColorScheme(
	override: ThemeOverride,
	deviceColorScheme: DeviceColorScheme,
): ResolvedThemeColorScheme {
	if (override === "light" || override === "dark") return override;
	return deviceColorScheme === "dark" ? "dark" : "light";
}

export function toNativeColorScheme(
	override: ThemeOverride,
): ResolvedThemeColorScheme | null {
	return override === "system" ? null : override;
}

export function createThemeRuntime(initialOverride: ThemeOverride = "system") {
	let override = initialOverride;
	const listeners = new Set<ThemeListener>();

	return {
		getSnapshot: () => override,
		setOverride: (nextOverride: ThemeOverride) => {
			if (override === nextOverride) return;
			override = nextOverride;
			for (const listener of listeners) listener();
		},
		subscribe: (listener: ThemeListener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}

export const appThemeRuntime = createThemeRuntime();

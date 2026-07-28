import { THEME } from "@/lib/theme";
import type { ThemeOverride } from "@/lib/theme-preference";
import {
	appThemeRuntime,
	resolveThemeColorScheme,
	toNativeColorScheme,
} from "@/lib/theme-runtime";
import { useCallback, useSyncExternalStore } from "react";
import { Appearance, useColorScheme as useRNColorScheme } from "react-native";

export function applyThemeOverride(override: ThemeOverride) {
	Appearance.setColorScheme(toNativeColorScheme(override));
	appThemeRuntime.setOverride(override);
}

export function useColors() {
	const { colorScheme } = useColorScheme();

	return colorScheme === "dark" ? THEME.dark : THEME.light;
}

export function useColorScheme() {
	const deviceColorScheme = useRNColorScheme();
	const themeOverride = useSyncExternalStore(
		appThemeRuntime.subscribe,
		appThemeRuntime.getSnapshot,
		appThemeRuntime.getSnapshot,
	);

	const resolvedColorScheme = resolveThemeColorScheme(
		themeOverride,
		deviceColorScheme,
	);
	const setColorScheme = useCallback(applyThemeOverride, []);
	const toggleColorScheme = useCallback(() => {
		applyThemeOverride(resolvedColorScheme === "dark" ? "light" : "dark");
	}, [resolvedColorScheme]);

	return {
		colorScheme: resolvedColorScheme,
		setColorScheme,
		themeOverride,
		toggleColorScheme,
	};
}

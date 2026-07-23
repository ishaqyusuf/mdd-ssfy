import { describe, expect, mock, test } from "bun:test";

mock.module("@react-navigation/native", () => ({
	DarkTheme: { colors: {} },
	DefaultTheme: { colors: {} },
}));

const { nativewindThemeVars } = await import("./nativewind-theme-vars");
const { THEME } = await import("./theme");

describe("NativeWind theme variables", () => {
	test("maps semantic variables to the resolved light palette", () => {
		const variables = nativewindThemeVars("light");

		expect(variables["--background"]).toBe(THEME.light.background);
		expect(variables["--foreground"]).toBe(THEME.light.foreground);
		expect(variables["--primary"]).toBe(THEME.light.primary);
		expect(variables["--card"]).toBe(THEME.light.card);
		expect(variables["--border"]).toBe(THEME.light.border);
		expect(variables["--chart-5"]).toBe(THEME.light.chart5);
	});

	test("maps semantic variables to the resolved dark palette", () => {
		const variables = nativewindThemeVars("dark");

		expect(variables["--background"]).toBe(THEME.dark.background);
		expect(variables["--foreground"]).toBe(THEME.dark.foreground);
		expect(variables["--primary"]).toBe(THEME.dark.primary);
		expect(variables["--card"]).toBe(THEME.dark.card);
		expect(variables["--border"]).toBe(THEME.dark.border);
		expect(variables["--chart-5"]).toBe(THEME.dark.chart5);
	});
});

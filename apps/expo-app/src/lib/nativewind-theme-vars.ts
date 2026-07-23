import { THEME } from "./theme";

type ColorScheme = "dark" | "light";
type ThemeVariables = Record<`--${string}`, string>;

export function nativewindThemeVars(colorScheme: ColorScheme) {
	const colors = colorScheme === "dark" ? THEME.dark : THEME.light;

	return {
		"--accent": colors.accent,
		"--accent-foreground": colors.accentForeground,
		"--background": colors.background,
		"--border": colors.border,
		"--card": colors.card,
		"--card-foreground": colors.cardForeground,
		"--chart-1": colors.chart1,
		"--chart-2": colors.chart2,
		"--chart-3": colors.chart3,
		"--chart-4": colors.chart4,
		"--chart-5": colors.chart5,
		"--destructive": colors.destructive,
		"--destructive-foreground": colors.destructiveForeground,
		"--foreground": colors.foreground,
		"--input": colors.input,
		"--muted": colors.muted,
		"--muted-foreground": colors.mutedForeground,
		"--popover": colors.popover,
		"--popover-foreground": colors.popoverForeground,
		"--primary": colors.primary,
		"--primary-foreground": colors.primaryForeground,
		"--radius": colors.radius,
		"--ring": colors.ring,
		"--secondary": colors.secondary,
		"--secondary-foreground": colors.secondaryForeground,
		"--success": colors.success,
		"--success-foreground": colors.successForeground,
		"--warn": colors.warn,
		"--warn-foreground": colors.warnForeground,
	} satisfies ThemeVariables;
}

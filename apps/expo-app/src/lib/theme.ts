import { DarkTheme, DefaultTheme, type Theme } from "@react-navigation/native";

export const THEME = {
  light: {
    background: "rgb(255, 255, 255)",
    foreground: "rgb(10, 7, 5)",

    card: "rgb(255, 255, 255)",
    cardForeground: "rgb(10, 7, 5)",

    popover: "rgb(255, 255, 255)",
    popoverForeground: "rgb(10, 7, 5)",

    primary: "rgb(21, 21, 250)",
    primaryForeground: "rgb(6, 8, 59)",

    success: "rgb(34, 197, 94)",
    successForeground: "rgb(240, 253, 244)",

    warn: "rgb(245, 158, 11)",
    warnForeground: "rgb(69, 26, 3)",

    secondary: "rgb(245, 245, 244)",
    secondaryForeground: "rgb(26, 22, 20)",

    muted: "rgb(245, 245, 244)",
    mutedForeground: "rgb(120, 113, 108)",

    accent: "rgb(245, 245, 244)",
    accentForeground: "rgb(26, 22, 20)",

    destructive: "rgb(239, 68, 68)",
    destructiveForeground: "rgb(250, 250, 249)",

    border: "rgb(229, 231, 235)",
    input: "rgb(229, 231, 235)",
    ring: "rgb(10, 7, 5)",

    radius: "0.65rem",

    chart1: "rgb(234, 88, 12)",
    chart2: "rgb(22, 163, 151)",
    chart3: "rgb(30, 64, 92)",
    chart4: "rgb(250, 204, 21)",
    chart5: "rgb(249, 115, 22)",
  },

  dark: {
    background: "rgb(2, 6, 23)",
    foreground: "rgb(248, 250, 252)",

    card: "rgb(22, 28, 36)",
    cardForeground: "rgb(241, 245, 249)",

    popover: "rgb(24, 30, 38)",
    popoverForeground: "rgb(241, 245, 249)",

    primary: "rgb(249, 206, 31)",
    primaryForeground: "rgb(57, 27, 5)",

    success: "rgb(34, 197, 94)",
    successForeground: "rgb(236, 253, 245)",

    warn: "rgb(245, 158, 11)",
    warnForeground: "rgb(255, 251, 235)",

    secondary: "rgb(34, 40, 48)",
    secondaryForeground: "rgb(226, 232, 240)",

    muted: "rgb(40, 46, 54)",
    mutedForeground: "rgb(148, 163, 184)",

    accent: "rgb(45, 52, 61)",
    accentForeground: "rgb(241, 245, 249)",

    destructive: "rgb(178, 38, 38)",
    destructiveForeground: "rgb(250, 250, 250)",

    border: "rgb(45, 51, 59)",
    input: "rgb(51, 57, 65)",
    ring: "rgb(96, 165, 250)",

    radius: "0.65rem",

    chart1: "rgb(96, 165, 250)",
    chart2: "rgb(52, 211, 153)",
    chart3: "rgb(251, 191, 36)",
    chart4: "rgb(192, 132, 252)",
    chart5: "rgb(244, 63, 94)",
  },
};

export const NAV_THEME: Record<"light" | "dark", Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      background: THEME.light.background,
      border: THEME.light.border,
      card: THEME.light.card,
      notification: THEME.light.destructive,
      primary: THEME.light.primary,
      text: THEME.light.foreground,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      background: THEME.dark.background,
      border: THEME.dark.border,
      card: THEME.dark.card,
      notification: THEME.dark.destructive,
      primary: THEME.dark.primary,
      text: THEME.dark.foreground,
    },
  },
};

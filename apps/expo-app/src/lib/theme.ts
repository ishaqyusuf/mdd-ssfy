import { DarkTheme, DefaultTheme, type Theme } from "@react-navigation/native";

export const THEME = {
  light: {
    background: "rgb(248, 250, 252)",
    foreground: "rgb(15, 23, 42)",

    card: "rgb(255, 255, 255)",
    cardForeground: "rgb(15, 23, 42)",

    popover: "rgb(255, 255, 255)",
    popoverForeground: "rgb(15, 23, 42)",

    primary: "rgb(30, 64, 175)",
    primaryForeground: "rgb(239, 246, 255)",

    success: "rgb(22, 163, 74)",
    successForeground: "rgb(240, 253, 244)",

    warn: "rgb(217, 119, 6)",
    warnForeground: "rgb(255, 247, 237)",

    secondary: "rgb(241, 245, 249)",
    secondaryForeground: "rgb(30, 41, 59)",

    muted: "rgb(226, 232, 240)",
    mutedForeground: "rgb(100, 116, 139)",

    accent: "rgb(219, 234, 254)",
    accentForeground: "rgb(30, 64, 175)",

    destructive: "rgb(185, 28, 28)",
    destructiveForeground: "rgb(254, 242, 242)",

    border: "rgb(203, 213, 225)",
    input: "rgb(226, 232, 240)",
    ring: "rgb(37, 99, 235)",

    radius: "0.65rem",

    chart1: "rgb(37, 99, 235)",
    chart2: "rgb(13, 148, 136)",
    chart3: "rgb(217, 119, 6)",
    chart4: "rgb(99, 102, 241)",
    chart5: "rgb(225, 29, 72)",
  },

  dark: {
    background: "rgb(15, 23, 42)",
    foreground: "rgb(226, 232, 240)",

    card: "rgb(30, 41, 59)",
    cardForeground: "rgb(226, 232, 240)",

    popover: "rgb(30, 41, 59)",
    popoverForeground: "rgb(226, 232, 240)",

    primary: "rgb(96, 165, 250)",
    primaryForeground: "rgb(15, 23, 42)",

    success: "rgb(22, 163, 74)",
    successForeground: "rgb(236, 253, 245)",

    warn: "rgb(245, 158, 11)",
    warnForeground: "rgb(255, 251, 235)",

    secondary: "rgb(51, 65, 85)",
    secondaryForeground: "rgb(226, 232, 240)",

    muted: "rgb(30, 41, 59)",
    mutedForeground: "rgb(148, 163, 184)",

    accent: "rgb(30, 58, 138)",
    accentForeground: "rgb(219, 234, 254)",

    destructive: "rgb(220, 38, 38)",
    destructiveForeground: "rgb(254, 242, 242)",

    border: "rgb(51, 65, 85)",
    input: "rgb(71, 85, 105)",
    ring: "rgb(125, 211, 252)",

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

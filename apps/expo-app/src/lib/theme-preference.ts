import AsyncStorage from "@react-native-async-storage/async-storage";

const THEME_OVERRIDE_KEY = "gnd_theme_override";

export type ThemeOverride = "system" | "light" | "dark";

function isThemeOverride(value: string | null): value is ThemeOverride {
  return value === "system" || value === "light" || value === "dark";
}

export async function getThemeOverride(): Promise<ThemeOverride> {
  const value = await AsyncStorage.getItem(THEME_OVERRIDE_KEY);
  return isThemeOverride(value) ? value : "system";
}

export async function setThemeOverride(value: ThemeOverride) {
  await AsyncStorage.setItem(THEME_OVERRIDE_KEY, value);
}

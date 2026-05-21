import { THEME } from "@/lib/theme";
import { useCallback } from "react";
import { Appearance, useColorScheme as useRNColorScheme } from "react-native";

type AppColorScheme = "light" | "dark" | "system";

export function useColors() {
  const { colorScheme } = useColorScheme();

  return colorScheme === "dark" ? THEME.dark : THEME.light;
}

export function useColorScheme() {
  const colorScheme = useRNColorScheme();

  const resolvedColorScheme: "light" | "dark" =
    colorScheme === "dark" ? "dark" : "light";
  const setColorScheme = useCallback((scheme: AppColorScheme) => {
    Appearance.setColorScheme(scheme === "system" ? null : scheme);
  }, []);
  const toggleColorScheme = useCallback(() => {
    Appearance.setColorScheme(
      resolvedColorScheme === "dark" ? "light" : "dark",
    );
  }, [resolvedColorScheme]);

  return {
    colorScheme: resolvedColorScheme,
    setColorScheme,
    toggleColorScheme,
  };
}

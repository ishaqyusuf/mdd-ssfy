import { THEME } from "@/lib/theme";
import { useColorScheme as useNativeWindColorScheme } from "nativewind";

type AppColorScheme = "light" | "dark";

export function useColors() {
  const { colorScheme } = useColorScheme();

  return colorScheme === "dark" ? THEME.dark : THEME.light;
}

export function useColorScheme() {
  const { colorScheme, setColorScheme, toggleColorScheme } = useNativeWindColorScheme();

  const resolvedColorScheme: AppColorScheme = colorScheme === "dark" ? "dark" : "light";

  return {
    colorScheme: resolvedColorScheme,
    setColorScheme: (scheme: AppColorScheme) => setColorScheme(scheme),
    toggleColorScheme,
  };
}

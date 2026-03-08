import { THEME } from "@/lib/theme";
import { useColorScheme as useNativeWindColorScheme } from "nativewind";

type AppColorScheme = "light" | "dark" | "system";

export function useColors() {
  const { colorScheme } = useColorScheme();

  return colorScheme === "dark" ? THEME.dark : THEME.light;
}

export function useColorScheme() {
  const { colorScheme, setColorScheme, toggleColorScheme } =
    useNativeWindColorScheme();

  const resolvedColorScheme: "light" | "dark" =
    colorScheme === "dark" ? "dark" : "light";

  return {
    colorScheme: resolvedColorScheme,
    setColorScheme: (scheme: AppColorScheme) => setColorScheme(scheme),
    toggleColorScheme,
  };
}

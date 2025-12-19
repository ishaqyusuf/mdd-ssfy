import { THEME } from "@/lib/theme";
import { useColorScheme } from "nativewind";

export function useColors() {
  const { colorScheme } = useColorScheme();
  const _theme = colorScheme ?? "light";

  return _theme === "dark" ? THEME.dark : THEME.light;
}

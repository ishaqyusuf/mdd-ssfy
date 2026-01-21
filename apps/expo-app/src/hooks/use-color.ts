import { THEME } from "@/lib/theme";
// import { useColorScheme as useNativeWindColorScheme } from "nativewind";

export function useColors() {
  // const { colorScheme } = useColorScheme();
  const colorScheme = null as any;
  const _theme = colorScheme ?? "light";

  return _theme === "dark" ? THEME.dark : THEME.light;
}

export function useColorScheme() {
  return {
    colorScheme: "light",
  };
}

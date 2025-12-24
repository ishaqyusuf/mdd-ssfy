/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from "@/constants/Colors";
import { useColorScheme } from "nativewind";
import colors from "@/components/ui/colors";
import {
  DarkTheme as _DarkTheme,
  DefaultTheme,
  Theme,
} from "@react-navigation/native";
const DarkTheme: Theme = {
  ..._DarkTheme,
  colors: {
    ..._DarkTheme.colors,
    primary: colors.primary[200],
    background: colors.charcoal[950],
    text: colors.charcoal[100],
    border: colors.charcoal[500],
    card: colors.charcoal[850],
  },
};

const LightTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary[400],
    background: colors.white,
  },
};
export function useThemeConfig() {
  // props: { light?: string; dark?: string },
  // colorName: keyof typeof Colors.light & keyof typeof Colors.dark
  const { colorScheme } = useColorScheme();

  if (colorScheme === "dark") return DarkTheme;

  return LightTheme;
  // const theme = useColorScheme() ?? "light";
  // const colorFromProps = props[theme];

  // if (colorFromProps) {
  //   return colorFromProps;
  // } else {
  //   return Colors[theme][colorName];
  // }
}
export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const { colorScheme } = useColorScheme();
  const theme = colorScheme ?? "light";
  const colorFromProps = props[theme];
  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}

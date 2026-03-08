import { Button } from "@/components/ui/button";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { Image, type ImageStyle } from "react-native";

import { useColorScheme } from "@/hooks/use-color";
import {
  getThemeOverride,
  setThemeOverride,
  type ThemeOverride,
} from "@/lib/theme-preference";
const THEME_TOGGLE_IMAGES = {
  light: require("@assets/images/theme-toggle-light.png"),
  dark: require("@assets/images/theme-toggle-dark.png"),
};

const IMAGE_STYLE: ImageStyle = {
  height: 22,
  width: 22,
};

export function ThemeToggle() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [themeOverride, setThemeOverrideState] =
    useState<ThemeOverride>("system");

  useEffect(() => {
    (async () => {
      const override = await getThemeOverride();
      setThemeOverrideState(override);
    })();
  }, []);

  async function toggleColorScheme() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const nextOverride: ThemeOverride =
      themeOverride === "dark"
        ? "light"
        : themeOverride === "light"
          ? "dark"
          : colorScheme === "dark"
            ? "light"
            : "dark";

    setThemeOverrideState(nextOverride);
    await setThemeOverride(nextOverride);
    setColorScheme(nextOverride);
  }

  return (
    <Button
      onPress={toggleColorScheme}
      variant="ghost"
      size="icon"
      className="web:mr-5 size-9 rounded-full"
    >
      <Image source={THEME_TOGGLE_IMAGES[colorScheme]} style={IMAGE_STYLE} />
    </Button>
  );
}

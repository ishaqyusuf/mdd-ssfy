import { ProductTabs } from "@/components/product-tabs";
import ThemeToggle from "@/components/theme-toggle";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { AC } from "@/lib/ac";
import { colorsObject, hexToRgba } from "@/lib/colors";
import { Gesture, GestureDetector, State } from "react-native-gesture-handler";

import { Link, router, Stack } from "expo-router";
import { Platform, Pressable, TouchableOpacity, View } from "react-native";
import { Text } from "@/components/ui";
import { showErrorMessage } from "@/components/ui/utils";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  const onSwipe = () => {};
  const pan = Gesture.Pan().onEnd((e) => {
    // console.log(e);
    // if (e.translationX < -50 && activeIndex < tabs.length - 1) {
    //   // swipe left → next tab
    //   setActiveIndex((i) => i + 1);
    // } else if (e.translationX > 50 && activeIndex > 0) {
    //   // swipe right → prev tab
    //   setActiveIndex((i) => i - 1);
    // }
  });
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        {/* <GestureDetector gesture={pan}> */}
        <Stack.Screen
          name="media-player/index"
          options={{
            headerShown: false,
            headerTransparent: false,
            statusBarHidden: false,
          }}
        />
        {/* </GestureDetector> */}
      </Stack>
      {/* <StatusBar style="auto" /> */}
    </>
  );
}

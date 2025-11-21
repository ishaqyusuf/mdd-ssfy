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

export default function RootLayout() {
  const onSwipe = () => {};
  const pan = Gesture.Pan().onEnd((e) => {
    console.log(e);
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
          header(props) {
            return (
              <View className="space-y-4">
                <ThemedView className="px-4 flex-row">
                  <Pressable
                    onPress={(e) => {
                      showErrorMessage("Hello flash!");
                      router.push("/");
                    }}
                    className="p-1.5 rounded-full  border border-muted"
                  >
                    <IconSymbol
                      color={hexToRgba(colorsObject.gray)}
                      name="chevron.left"
                      size={24}
                    />
                  </Pressable>
                </ThemedView>
                <ThemedView className="p-4">
                  <Text className="text-4xl font-semibold">Products</Text>
                </ThemedView>
                <ProductTabs />
              </View>
            );
          },
          statusBarHidden: false,
          statusBarStyle: "dark",
          // title: "Movies",
          // headerTintColor: AC.label,
          // headerLargeStyle: {
          //   backgroundColor: AC.systemGroupedBackground,
          // },
          headerRight: () => <ThemeToggle />,
          ...Platform.select({
            ios: {
              headerTransparent: false,
            },
          }),
        }}
      >
        <GestureDetector gesture={pan}>
          <Stack.Screen
            name="fikri-products/index"
            options={{ headerShown: true, title: "", headerTransparent: false }}
          />
        </GestureDetector>
      </Stack>
      {/* <StatusBar style="auto" /> */}
    </>
  );
}
function HeaderRightClose() {
  return (
    <Link
      href="/"
      dismissTo
      asChild
      style={{
        padding: 8,
        marginRight: process.env.EXPO_OS === "web" ? 0 : -12,
      }}
    >
      <TouchableOpacity>
        <IconSymbol name="xmark.circle.fill" color={AC.systemGray} size={28} />
      </TouchableOpacity>
    </Link>
  );
}

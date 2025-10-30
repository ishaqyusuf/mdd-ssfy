import { ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import "../global.css";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
// import "@gnd/ui/globals.css";

import { ThemedView } from "@/components/ThemedView";
import { TRPCReactProvider } from "@/trpc/client";
import { useThemeConfig } from "@/hooks/useThemeColor";
import { StyleSheet } from "react-native";
import FlashMessage from "react-native-flash-message";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { AudioPlayer } from "@/components/audio-player";
export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <Providers>
      <NuqsAdapter>
        <TRPCReactProvider>
          <Stack>
            <Stack.Screen
              options={{
                headerShown: true,
                // headerTintColor: "red",
                // headerTransparent: false,
                // headerTitle: "",
                header(props) {
                  return (
                    <ThemedView className="h-14  flex-row items-center px-4">
                      {/* <ThemedText>Titless!</ThemedText> */}
                    </ThemedView>
                  );
                },
                // statusBarHidden: false,
                // title: "",

                // headerTransparent: false,
                // headerRight(props) {
                //   return <ThemeToggle />;
                // },
              }}
            />

            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="example" options={{ headerShown: false }} />
            <Stack.Screen
              name="media-player"
              options={{ headerShown: false }}
            />
            <Stack.Screen name="posts" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
        </TRPCReactProvider>
        <StatusBar style="auto" />
        <AudioPlayer />
      </NuqsAdapter>
    </Providers>
  );
}
function Providers({ children }) {
  const theme = useThemeConfig();
  return (
    <GestureHandlerRootView
      style={styles.container}
      className={theme.dark ? `dark` : undefined}
    >
      {/* <KeyboardProvider> */}
      <ThemeProvider value={theme}>
        <BottomSheetModalProvider>
          <FlashMessage position="top" />
          {children}
        </BottomSheetModalProvider>
      </ThemeProvider>
      {/* </KeyboardProvider> */}
    </GestureHandlerRootView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

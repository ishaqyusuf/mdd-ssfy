import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useThemeConfig } from "@/hooks/use-theme-color";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";
import "@/styles/global.css";
import { useColorScheme } from "@/example/components/useColorScheme";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  AuthProvider,
  useAuthContext,
  useCreateAuthContext,
} from "@/hooks/use-auth";

import Toast from "react-native-toast-message";
import { ToastProviderWithViewport } from "@/components/ui/toast";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import FlashMessage from "react-native-flash-message";
import { TRPCReactProvider } from "@/trpc/client";
import { StaticTrpc } from "@/components/static-trpc";
import { StatusBar } from "expo-status-bar";
export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: "(tabs)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}
const InitialLayout = () => {
  const { token } = useAuthContext();

  return (
    <>
      <TRPCReactProvider>
        <StaticTrpc />
        <StatusBar style="auto" />
        <Stack>
          <Stack.Protected guard={!token}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Protected guard={!!token}>
            <Stack.Screen
              name="(installers)"
              options={{ headerShown: false }}
            />
          </Stack.Protected>

          <Stack.Screen name="+not-found" />
        </Stack>
        <Toast />
      </TRPCReactProvider>
    </>
  );
};
function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const theme = useThemeConfig();
  // const { token } = useAuthContext();
  return (
    <GestureHandlerRootView
      className={theme.dark ? `dark` : "light"}
      style={{ flex: 1 }}
    >
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <AuthProvider value={useCreateAuthContext()}>
          <ToastProviderWithViewport>
            <BottomSheetModalProvider>
              <FlashMessage position="top" />
              <InitialLayout />
            </BottomSheetModalProvider>
          </ToastProviderWithViewport>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

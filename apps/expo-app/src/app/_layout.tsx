import FontAwesome from "@expo/vector-icons/FontAwesome";
import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";
import "@/styles/global.css";
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
import { View } from "react-native";
import { StaticRouter } from "@/components/static-router";
import { KeyboardProvider } from "react-native-keyboard-controller";
import * as Updates from "expo-updates";

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

  const { isUpdatePending } = Updates.useUpdates();
  useEffect(() => {
    if (isUpdatePending) {
      Updates.reloadAsync();
    }
  }, [isUpdatePending]);
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
  const { token, isAdmin, isDriver } = useAuthContext();

  return (
    <>
      <TRPCReactProvider>
        <StaticTrpc />
        <StaticRouter />
        {/* <StatusBar style="dark" /> */}
        <StatusBar style="auto" />

        <Stack>
          <Stack.Protected guard={!token}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Protected guard={!!isDriver}>
            <Stack.Screen name="(drivers)" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Protected guard={!!isAdmin}>
            <Stack.Screen name="(job-admin)" options={{ headerShown: false }} />
            <Stack.Screen
              name="(job-admin)/job-overview/[jobId]"
              options={{ headerShown: false }}
            />
          </Stack.Protected>
          <Stack.Protected guard={!!token}>
            <Stack.Screen name="job-form" options={{ headerShown: false }} />
            <Stack.Screen
              name="job-overview-v2"
              options={{ headerShown: false }}
            />
          </Stack.Protected>
          <Stack.Protected guard={!isAdmin && !isDriver}>
            <Stack.Screen name="unavailable" options={{ headerShown: false }} />
          </Stack.Protected>

          <Stack.Screen name="+not-found" />
        </Stack>
        <Toast />
      </TRPCReactProvider>
    </>
  );
};
function RootLayoutNav() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* 
        using  <View className={cn(theme.dark ? "dark" : "", "flex-1")}></View> somehow freezes scroll. the issue is mainly the dark className.
      */}
      <KeyboardProvider>
        <View className="flex-1">
          <ThemeProvider
            value={DefaultTheme}
            // value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
          >
            <AuthProvider value={useCreateAuthContext()}>
              <ToastProviderWithViewport>
                <BottomSheetModalProvider>
                  <FlashMessage position="top" />
                  <InitialLayout />
                </BottomSheetModalProvider>
              </ToastProviderWithViewport>
            </AuthProvider>
          </ThemeProvider>
          {/* </View> */}
        </View>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

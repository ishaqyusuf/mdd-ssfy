import FontAwesome from "@expo/vector-icons/FontAwesome";
import { ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { Fragment, useEffect } from "react";
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
import { useColorScheme } from "@/hooks/use-color";
import { NAV_THEME } from "@/lib/theme";
import { getThemeOverride } from "@/lib/theme-preference";

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
  const { token, currentSection, sections, isAdmin } = useAuthContext();
  const { colorScheme } = useColorScheme();
  const canAccessJobs = currentSection?.isJobs;
  const canAccessInstaller = currentSection?.isInstaller;
  const canAccessDispatchOrDriver =
    currentSection?.isDispatch || currentSection?.isDriver;
  const hasAnySection = sections.length > 0;

  return (
    <>
      <TRPCReactProvider>
        <StaticTrpc />
        <StaticRouter />
        <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />

        <Stack>
          <Stack.Protected guard={!token}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Protected guard={!!token && !!canAccessDispatchOrDriver}>
            <Stack.Screen name="(drivers)" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Protected guard={!!token && !!isAdmin}>
            <Stack.Screen name="(sales)" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Protected guard={!!token && !!canAccessJobs}>
            <Stack.Screen name="(job-admin)" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Protected guard={!!token && !!canAccessInstaller}>
            <Stack.Screen
              name="(installers)"
              options={{ headerShown: false }}
            />
          </Stack.Protected>
          <Stack.Protected
            guard={!!token && (canAccessJobs || canAccessInstaller)}
          >
            <Stack.Screen name="job-form" options={{ headerShown: false }} />
            <Stack.Screen
              name="job-overview-v2"
              options={{ headerShown: false }}
            />
          </Stack.Protected>
          <Stack.Protected guard={!!token && !hasAnySection}>
            <Stack.Screen name="unavailable" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Protected guard={!!token}>
            <Stack.Screen
              name="settings"
              options={{
                presentation: "modal",
                headerShown: false,
                // header: () => <Header title="Create Installer Profile" />,
              }}
            />

            <Stack.Screen
              name="notifications"
              options={{
                presentation: "modal",
                headerShown: false,
              }}
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
  const { colorScheme, setColorScheme } = useColorScheme();
  const navigationTheme =
    colorScheme === "dark" ? NAV_THEME.dark : NAV_THEME.light;
  const rootClassName =
    colorScheme === "dark"
      ? "darks flex-1 bg-background"
      : "flex-1 bg-background";

  useEffect(() => {
    let mounted = true;
    (async () => {
      const override = await getThemeOverride();
      if (!mounted) return;
      setColorScheme(override);
    })();
    return () => {
      mounted = false;
    };
  }, [setColorScheme]);
  const Container = ({ children }) => {
    // return <Fragment>{children}</Fragment>;
    return <View className={rootClassName}>{children}</View>;
    // return <View style={{ flex: 1 }}>{children}</View>;
  };
  // const Container = View
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <Container
        // className="flex-1"
        // className={rootClassName}
        // style={{ flex: 1 }}
        >
          <ThemeProvider value={navigationTheme}>
            <AuthProvider value={useCreateAuthContext()}>
              <ToastProviderWithViewport>
                <BottomSheetModalProvider>
                  <FlashMessage position="top" />
                  <InitialLayout />
                </BottomSheetModalProvider>
              </ToastProviderWithViewport>
            </AuthProvider>
          </ThemeProvider>
        </Container>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

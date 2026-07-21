import FontAwesome from "@expo/vector-icons/FontAwesome";
import { ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";
import "@/styles/global.css";
import {
  AuthProvider,
  useAuthContext,
  useCreateAuthContext,
} from "@/hooks/use-auth";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AppAutoUpdateModal } from "@/components/app-auto-update-modal";
import { StaticRouter } from "@/components/static-router";
import { StaticTrpc } from "@/components/static-trpc";
import { ToastProviderWithViewport } from "@/components/ui/toast";
import { useColorScheme } from "@/hooks/use-color";
import { NAV_THEME } from "@/lib/theme";
import { getThemeOverride } from "@/lib/theme-preference";
import { Sentry, initSentry } from "@/lib/sentry";
import { TRPCReactProvider } from "@/trpc/client";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import FlashMessage from "react-native-flash-message";
import { KeyboardProvider } from "react-native-keyboard-controller";
import Toast from "react-native-toast-message";

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
initSentry();

function RootLayout() {
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
  const { token, currentSection, currentSectionKey, sections, isAdmin } =
    useAuthContext();
  const { colorScheme } = useColorScheme();
  const canAccessJobs = currentSection?.isJobs;
  const canAccessInstaller = currentSection?.isInstaller;
  const canAccessDispatchOrDriver =
    currentSection?.isDispatch || currentSection?.isDriver;
  const hasAnySection = sections.length > 0 || isAdmin;
  const navigationTheme =
    colorScheme === "dark" ? NAV_THEME.dark : NAV_THEME.light;

  return (
    <>
      <TRPCReactProvider>
        <StaticTrpc />
        <StaticRouter />
        <AppAutoUpdateModal />
        <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />

        <Stack
          screenOptions={{
            headerShadowVisible: false,
            headerStyle: {
              backgroundColor: navigationTheme.colors.background,
            },
            headerTintColor: navigationTheme.colors.text,
            headerTitleStyle: {
              color: navigationTheme.colors.text,
            },
          }}
        >
          <Stack.Protected guard={!token}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Protected guard={!!token && !!canAccessDispatchOrDriver}>
            <Stack.Screen name="(drivers)" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Protected
            guard={!!token && !!isAdmin && currentSectionKey === "sales"}
          >
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
            <Stack.Screen name="(job)" options={{ headerShown: false }} />
            <Stack.Screen
              name="job-overview-v2"
              options={{ headerShown: false }}
            />
          </Stack.Protected>
          <Stack.Protected guard={!!token && !hasAnySection}>
            <Stack.Screen name="unavailable" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Protected guard={!!token}>
            <Stack.Screen name="hrm" options={{ headerShown: false }} />
            <Stack.Screen
              name="settings"
              options={{
                presentation: "modal",
                headerShown: false,
                // header: () => <Header title="Create Installer Profile" />,
              }}
            />
            {__DEV__ ? (
              <Stack.Screen
                name="design-system-preview"
                options={{
                  presentation: "modal",
                  headerShown: false,
                }}
              />
            ) : null}
            <Stack.Screen
              name="updates"
              options={{
                presentation: "modal",
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="documents"
              options={{
                presentation: "modal",
                headerShown: false,
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
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <View className="flex-1 bg-background">
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
        </View>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);

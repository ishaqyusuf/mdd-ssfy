import { useThemeConfig } from "@/hooks/use-theme-color";
import { useOnboardingStore } from "@/store/onboardingStore";
import { TRPCReactProvider } from "@/trpc/client";
import "@root/global.css";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Toast from "react-native-toast-message";
import { ThemeProvider } from "@react-navigation/native";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import FlashMessage from "react-native-flash-message";
import { StaticTrpc } from "@/components/static-trpc";
// import { authClient } from "@/lib/auth-client";
const InitialLayout = () => {
  const { hasCompletedOnboarding } = useOnboardingStore();
  const isAuthenticated = true;
  // const isLoading = false
  // console.log({
  //   hasCompletedOnboarding,
  //   isAuthenticated,
  // });
  // const { data: session } = authClient.useSession();

  return (
    <>
      <TRPCReactProvider>
        <StatusBar style="auto" />
        <Stack>
          <Stack.Screen name="(installers)" options={{ headerShown: false }} />
          <Stack.Protected guard={!hasCompletedOnboarding && !isAuthenticated}>
            <Stack.Screen
              name="(onboarding)"
              options={{ headerShown: false }}
            />
          </Stack.Protected>
          <Stack.Protected guard={hasCompletedOnboarding && !isAuthenticated}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Protected guard={isAuthenticated && hasCompletedOnboarding}>
            <Stack.Screen name="(protected)" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Screen name="+not-found" />
        </Stack>
        <Toast />
        <StaticTrpc />
      </TRPCReactProvider>
    </>
  );
};

export const RootLayout = () => {
  const theme = useThemeConfig();
  return (
    <GestureHandlerRootView
      className={theme.dark ? `dark` : undefined}
      style={{ flex: 1 }}
    >
      <ThemeProvider value={theme}>
        <BottomSheetModalProvider>
          <FlashMessage position="top" />
          <InitialLayout />
        </BottomSheetModalProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
};

export default RootLayout;

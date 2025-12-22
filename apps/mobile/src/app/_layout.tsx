import { useThemeConfig } from "@/hooks/use-theme-color";
import { TRPCReactProvider } from "@/trpc/client";
import "@root/global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Toast from "react-native-toast-message";
import { ThemeProvider } from "@react-navigation/native";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import FlashMessage from "react-native-flash-message";
import { StaticTrpc } from "@/components/static-trpc";
import {
  AuthProvider,
  useAuthContext,
  useCreateAuthContext,
} from "@/hooks/use-auth";
import { ToastProviderWithViewport } from "@/components/ui/toast";

// import { authClient } from "@/lib/auth-client";
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

export const RootLayout = () => {
  const theme = useThemeConfig();
  return (
    <GestureHandlerRootView
      className={theme.dark ? `dark` : "light"}
      style={{ flex: 1 }}
    >
      {/* <Text>Theme: {theme.dark ? "Dark" : "Light"}</Text> */}
      <ThemeProvider value={theme}>
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
};

export default RootLayout;

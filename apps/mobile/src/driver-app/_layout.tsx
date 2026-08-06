import { AppRootProviders } from "@/components/app-root-providers";
import { StaticRouter } from "@/components/static-router";
import { StaticTrpc } from "@/components/static-trpc";
import { applyThemeOverride } from "@/hooks/use-color";
import { wrapRootLayoutWithSentry } from "@/lib/sentry";
import { getThemeOverride } from "@/lib/theme-preference";
import { TRPCReactProvider } from "@/trpc/client";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";
import "@/styles/global.css";
import Toast from "react-native-toast-message";

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync();

function DriverPlatformRootLayout() {
	const [, fontError] = useFonts({
		SpaceMono: require("../../assets/fonts/SpaceMono-Regular.ttf"),
		...FontAwesome.font,
	});

	useEffect(() => {
		if (fontError) throw fontError;
	}, [fontError]);

	useEffect(() => {
		void getThemeOverride()
			.then(applyThemeOverride)
			.catch(() => applyThemeOverride("system"));
		void SplashScreen.hideAsync();
	}, []);

	return (
		<AppRootProviders>
			<DriverPlatformRoutes />
		</AppRootProviders>
	);
}

function DriverPlatformRoutes() {
	return (
		<TRPCReactProvider>
			<StaticTrpc />
			<StaticRouter />
			<StatusBar style="auto" />
			<Stack initialRouteName="index" screenOptions={{ headerShown: false }}>
				<Stack.Screen name="index" />
				<Stack.Screen name="(auth)" />
				<Stack.Screen name="(drivers)" />
				<Stack.Screen name="unavailable" />
				<Stack.Screen name="+not-found" />
			</Stack>
			<Toast />
		</TRPCReactProvider>
	);
}

export default wrapRootLayoutWithSentry(DriverPlatformRootLayout);

import { ToastProviderWithViewport } from "@/components/ui/toast";
import { AuthProvider, useCreateAuthContext } from "@/hooks/use-auth";
import { useColorScheme } from "@/hooks/use-color";
import { nativewindThemeVars } from "@/lib/nativewind-theme-vars";
import { NAV_THEME } from "@/lib/theme";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { ThemeProvider } from "@react-navigation/native";
import { VariableContextProvider } from "nativewind";
import { type PropsWithChildren, useMemo } from "react";
import { View } from "react-native";
import FlashMessage from "react-native-flash-message";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

export function AppRootProviders({ children }: PropsWithChildren) {
	const { colorScheme } = useColorScheme();
	const navigationTheme =
		colorScheme === "dark" ? NAV_THEME.dark : NAV_THEME.light;
	const themeVariables = useMemo(
		() => nativewindThemeVars(colorScheme),
		[colorScheme],
	);

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<KeyboardProvider>
				<VariableContextProvider value={themeVariables}>
					<View className="flex-1 bg-background">
						<ThemeProvider value={navigationTheme}>
							<AuthProvider value={useCreateAuthContext()}>
								<ToastProviderWithViewport>
									<BottomSheetModalProvider>
										<FlashMessage position="top" />
										{children}
									</BottomSheetModalProvider>
								</ToastProviderWithViewport>
							</AuthProvider>
						</ThemeProvider>
					</View>
				</VariableContextProvider>
			</KeyboardProvider>
		</GestureHandlerRootView>
	);
}

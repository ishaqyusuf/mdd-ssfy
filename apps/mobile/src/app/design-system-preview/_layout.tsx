import { Redirect, Stack } from "expo-router";

export default function DesignSystemPreviewLayout() {
	if (!__DEV__) {
		return <Redirect href="/" />;
	}

	return (
		<Stack>
			<Stack.Screen name="index" options={{ headerShown: false }} />
			<Stack.Screen name="template-a" options={{ headerShown: false }} />
			<Stack.Screen name="template-b" options={{ headerShown: false }} />
			<Stack.Screen name="template-c" options={{ headerShown: false }} />
		</Stack>
	);
}

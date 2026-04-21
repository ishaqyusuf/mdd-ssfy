import { Stack } from "expo-router";

export default function DriversLayout() {
	return (
		<Stack initialRouteName="index">
			<Stack.Screen name="index" options={{ headerShown: false }} />
			<Stack.Screen name="dispatch/index" options={{ headerShown: false }} />
			<Stack.Screen name="dispatch/all" options={{ headerShown: false }} />
			<Stack.Screen
				name="dispatch/[dispatchId]"
				options={{ headerShown: false }}
			/>
			<Stack.Screen
				name="warehouse-packing/index"
				options={{ headerShown: false }}
			/>
			<Stack.Screen
				name="warehouse-packing/[dispatchId]"
				options={{ headerShown: false }}
			/>
			<Stack.Screen name="settings" options={{ headerShown: false }} />
			<Stack.Screen name="notifications" options={{ headerShown: false }} />
		</Stack>
	);
}

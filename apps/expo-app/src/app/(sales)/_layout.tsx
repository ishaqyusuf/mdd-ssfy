import { Stack } from "expo-router";

export default function SalesLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="orders/index" options={{ headerShown: false }} />
      <Stack.Screen name="orders/[orderNo]" options={{ headerShown: false }} />
      <Stack.Screen
        name="orders/[orderNo]/delivery/create"
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="orders/[orderNo]/delivery/[dispatchId]"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="dispatch/[dispatchId]"
        options={{ headerShown: false }}
      />
      <Stack.Screen name="dispatch/new" options={{ headerShown: false }} />
    </Stack>
  );
}

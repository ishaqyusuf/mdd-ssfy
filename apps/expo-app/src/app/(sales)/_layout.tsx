import { Stack } from "expo-router";

export default function SalesLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="invoices/new" options={{ headerShown: false }} />
      <Stack.Screen name="invoices/[slug]" options={{ headerShown: false }} />
      <Stack.Screen
        name="invoices/customer-selector"
        options={{
          headerShown: false,
          presentation: "fullScreenModal",
        }}
      />
      <Stack.Screen
        name="invoices/sales-details"
        options={{
          headerShown: false,
          presentation: "fullScreenModal",
        }}
      />
      <Stack.Screen
        name="invoices/door-size"
        options={{
          headerShown: false,
          presentation: "fullScreenModal",
        }}
      />
      <Stack.Screen name="orders/index" options={{ headerShown: false }} />
      <Stack.Screen name="orders/[orderNo]" options={{ headerShown: false }} />
      <Stack.Screen name="quotes/index" options={{ headerShown: false }} />
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

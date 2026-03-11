import { Stack } from "expo-router";

export default function HrmLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="employees" options={{ headerShown: false }} />
      <Stack.Screen name="payment-receipts" options={{ headerShown: false }} />
      <Stack.Screen name="pay-portal" options={{ headerShown: false }} />
    </Stack>
  );
}

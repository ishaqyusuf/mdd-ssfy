import { Stack } from "expo-router";

export default function ObytesRootLayout() {
  return (
    <Stack screenOptions={{}}>
      <Stack.Screen name="ui" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
    </Stack>
  );
}

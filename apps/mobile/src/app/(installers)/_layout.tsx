import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack initialRouteName="dashboard">
      <Stack.Screen name="dashboard" options={{ headerShown: false }} />
      <Stack.Screen name="sign-up" options={{ headerShown: false }} />
    </Stack>
  );
}

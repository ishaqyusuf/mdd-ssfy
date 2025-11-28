import { Header } from "@/components/installers/dashboard/Header";
import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack initialRouteName="dashboard">
      <Stack.Screen
        name="dashboard"
        options={{
          header: () => (
            <Header
              name="Ishaq"
              avatarUrl="https://avatar.iran.liara.run/public/34"
            />
          ),
        }}
      />
      <Stack.Screen name="sign-up" options={{ headerShown: false }} />
    </Stack>
  );
}

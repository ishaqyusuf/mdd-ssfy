import { Stack } from "expo-router";
import { JobsHeader } from "@/components/jobs-header";
import { Header } from "@/components/installer-dashboard/installer-dashboard-header";

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="jobs"
        options={{
          header: () => <JobsHeader />,
        }}
      />
      <Stack.Screen name="sign-up" options={{ headerShown: false }} />
    </Stack>
  );
}

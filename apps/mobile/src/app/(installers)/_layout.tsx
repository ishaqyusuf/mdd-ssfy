import { Header } from "@/components/installers/dashboard/installer-dashboard-header";
import { Stack } from "expo-router";
import { JobsHeader } from "@/components/installers/jobs/jobs-header";

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          header: () => <Header />,
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

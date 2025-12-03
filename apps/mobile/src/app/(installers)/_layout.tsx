import { Header } from "@/components/installers/dashboard/installer-dashboard-header";
import { Stack } from "expo-router";
import { JobsHeader } from "@/components/installers/jobs/jobs-header";

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          header: () => (
            <Header
              name="Ishaq"
              avatarUrl="https://avatar.iran.liara.run/public/34"
            />
          ),
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

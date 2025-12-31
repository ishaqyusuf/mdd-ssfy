import { Stack } from "expo-router";
import { JobsHeader } from "@/components/jobs-header";

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
      <Stack.Screen
        name="home2"
        options={{
          // header: () => <JobsHeader />,
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          presentation: "modal",
          headerShown: false,
          // header: () => <Header title="Create Installer Profile" />,
        }}
      />
      <Stack.Screen
        name="overview/[jobId]"
        options={{
          presentation: "modal",
          headerShown: false,
          // header: () => <Header title="Create Installer Profile" />,
        }}
      />
      {/* <Stack.Screen name="sign-up" options={{ headerShown: false }} /> */}
    </Stack>
  );
}

import { Stack } from "expo-router";
import { JobsHeader } from "@/components/jobs-header";

export default function AuthLayout() {
  return (
    <Stack initialRouteName="index">
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
        name="home1"
        options={{
          // header: () => <JobsHeader />,
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="jobs2"
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
        name="settings"
        options={{
          presentation: "modal",
          headerShown: false,
          // header: () => <Header title="Create Installer Profile" />,
        }}
      />
      <Stack.Screen
        name="job/[id]"
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
    </Stack>
  );
}

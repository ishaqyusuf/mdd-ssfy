import { Stack } from "expo-router";
// import { JobsHeader } from "@/components/jobs-header";
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
        name="home1"
        options={{
          // header: () => <JobsHeader />,
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="jobs"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}

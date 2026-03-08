import { Stack } from "expo-router";

export default function JobLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="job-form"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="job/[id]/index"
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="job/[id]/alert/[alert]"
        options={{
          presentation: "fullScreenModal",
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="job/[id]/review"
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
    </Stack>
  );
}

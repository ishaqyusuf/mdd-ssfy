import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack>
      {/* <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      /> */}
      <Stack.Screen
        name="(tabs)"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="analytics"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="edit-profile"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}

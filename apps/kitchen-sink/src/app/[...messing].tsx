import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Link, Stack } from "expo-router";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <ThemedView className="flex-1 items-center justify-center p-4">
        <ThemedText className="mb-4 text-2xl font-bold">
          This screen doesn&apos;t exist.
        </ThemedText>

        <Link href="/" className="mt-4">
          <ThemedText className="text-blue-500 underline">
            Go to home screen!
          </ThemedText>
        </Link>
      </ThemedView>
    </>
  );
}

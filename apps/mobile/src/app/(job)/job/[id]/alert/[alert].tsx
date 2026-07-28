import { JobAlertScreen } from "@/screens/job-alert-screen";
import { Stack, useLocalSearchParams } from "expo-router";

export default function JobAlertPage() {
  const { id, alert } = useLocalSearchParams<{ id?: string; alert?: string }>();
  const parsedId = Number(id);
  const jobId = Number.isFinite(parsedId) ? parsedId : 0;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <JobAlertScreen jobId={jobId} alert={String(alert || "submitted")} />
    </>
  );
}

import { JobAlertScreen } from "@/screens/job-alert-screen";
import { useLocalSearchParams } from "expo-router";

export default function JobAlertPage() {
  const { id, alert } = useLocalSearchParams<{ id?: string; alert?: string }>();
  const parsedId = Number(id);
  const jobId = Number.isFinite(parsedId) ? parsedId : 0;

  return <JobAlertScreen jobId={jobId} alert={String(alert || "submitted")} />;
}


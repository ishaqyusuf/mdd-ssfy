import JobOverviewScreen from "@/screens/job-overview-screen";
import { useAuthContext } from "@/hooks/use-auth";
import { useLocalSearchParams } from "expo-router";

export default function JobDetailsPage() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const auth = useAuthContext();
  const parsedId = Number(id);
  const jobId = Number.isFinite(parsedId) ? parsedId : undefined;

  return <JobOverviewScreen adminMode={auth.isAdmin} jobId={jobId} />;
}


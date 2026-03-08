import { useAuthContext } from "@/hooks/use-auth";
import { JobReviewScreen } from "@/screens/job-review-screen";
import { useLocalSearchParams } from "expo-router";

export default function JobReviewPage() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const auth = useAuthContext();
  const parsedId = Number(id);
  const jobId = Number.isFinite(parsedId) ? parsedId : undefined;

  return <JobReviewScreen adminMode={auth.isAdmin} jobId={jobId} />;
}

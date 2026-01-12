import { JobFormScreen } from "@/screens/job-form-screen";
import { useLocalSearchParams } from "expo-router";

export default function SubmitJob() {
  const { jobId } = useLocalSearchParams();
  return <JobFormScreen jobId={+jobId} />;
}

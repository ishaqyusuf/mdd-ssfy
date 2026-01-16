import { JobFormScreen } from "@/screens/job-form-screen";
import { useLocalSearchParams } from "expo-router";

export default function SubmitJob() {
  const { controlId } = useLocalSearchParams();
  return (
    <JobFormScreen action="re-assign" admin controlId={controlId as string} />
  );
}

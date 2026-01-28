import { JobFormScreen } from "@/screens/job-form-screen";
import { useLocalSearchParams } from "expo-router";

export default function CreateJob() {
  const { jobType } = useLocalSearchParams();
  // console.log({ jobType });
  return <JobFormScreen admin type={String(jobType)} />;
}

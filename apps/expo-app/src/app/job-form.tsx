import { JobFormV2Screen } from "@/screens/job-form-v2-screen";
import { useLocalSearchParams } from "expo-router";

const ACTIONS = ["submit", "create", "update", "re-assign"] as const;

export default function JobFormRoute() {
  const params = useLocalSearchParams();
  const action = ACTIONS.find((value) => value === params.action);
  const admin = params.admin === "true" || params.admin === "1";

  return <JobFormV2Screen admin={admin} action={action} />;
}

import { JobFormScreen } from "@/screens/job-form-screen";
import { useLocalSearchParams } from "expo-router";

const ACTIONS = ["submit", "create", "update", "re-assign"] as const;

export default function JobFormRoute() {
  const params = useLocalSearchParams();
  const action = ACTIONS.find((value) => value === params.action);
  const admin = params.admin === "true" || params.admin === "1";

  return <JobFormScreen admin={admin} action={action} />;
}

import JobOverviewV2Screen from "@/screens/job-overview-v2-screen";
import { useLocalSearchParams } from "expo-router";

export default function JobOverviewV2Route() {
  const params = useLocalSearchParams();

  return (
    <JobOverviewV2Screen
      jobId={params.jobId}
      adminMode={params.admin === "true" || params.admin === "1"}
    />
  );
}

import JobOverviewScreen from "@/screens/job-overview-screen";
import { useLocalSearchParams } from "expo-router";

export default function Screen() {
  const { id: jobId } = useLocalSearchParams();
  // return <JobOverviewScreen2 adminMode jobId={jobId} />;
  return <JobOverviewScreen adminMode jobId={jobId} />;
}

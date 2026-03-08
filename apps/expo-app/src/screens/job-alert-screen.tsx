import { SafeArea } from "@/components/safe-area";
import { JobAlertView } from "@/components/job-alert/job-alert-view";
import { normalizeJobAlert } from "@/components/job-alert/config";
import { useRouter } from "expo-router";

type JobAlertScreenProps = {
  jobId: number;
  alert: string;
};

export function JobAlertScreen({ jobId, alert }: JobAlertScreenProps) {
  const router = useRouter();
  const resolvedAlert = normalizeJobAlert(alert);
  const jobsHref = "/(job)/jobs";

  return (
    <SafeArea>
      <JobAlertView
        alert={resolvedAlert}
        jobId={jobId}
        onViewJob={() => router.replace(`/job/${jobId}` as any)}
        onCreateJob={() => router.replace(jobsHref as any)}
        onGoHome={() => router.replace("/" as any)}
      />
    </SafeArea>
  );
}

import { SafeArea } from "@/components/safe-area";
import { JobV2Footer } from "@/components/forms/job-v2/job-v2-footer";
import { JobV2Header } from "@/components/forms/job-v2/job-v2-header";
import { JobV2Shell } from "@/components/forms/job-v2/job-v2-shell";
import { JobV2StepContent } from "@/components/forms/job-v2/job-v2-step-content";
import {
  JobFormV2Props,
  JobFormV2Provider,
  useCreateJobFormV2Context,
} from "@/hooks/use-job-form-v2";

export function JobFormV2Screen(props: JobFormV2Props) {
  const ctx = useCreateJobFormV2Context(props);

  return (
    <JobFormV2Provider value={ctx}>
      <SafeArea>
        <JobV2Shell header={<JobV2Header />} footer={<JobV2Footer />}>
          <JobV2StepContent />
        </JobV2Shell>
      </SafeArea>
    </JobFormV2Provider>
  );
}

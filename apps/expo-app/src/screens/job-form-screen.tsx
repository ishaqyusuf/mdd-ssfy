import { JobFormV2Screen } from "@/screens/job-form-v2-screen";
import { useJobFormV2Params } from "@/hooks/use-job-form-v2-params";

export interface JobFormScreenProps {
  admin?: boolean;
  action?: "submit" | "create" | "update" | "re-assign";
  [key: string]: any;
}

export function JobFormScreen(props: JobFormScreenProps) {
  const params = useJobFormV2Params();

  // Legacy job form remains here for rollback while V2 is active.
  // return (
  //   <JobFormContextProvider value={useCreateJobFormContext(props)}>
  //     <Content />
  //   </JobFormContextProvider>
  // );

  return (
    <JobFormV2Screen
      admin={props.admin ?? params.admin}
      action={props.action ?? params.action}
    />
  );
}

// import JobsExampleScreen from "@/components/examples/screen-example-jobs";
import { JobsProvider, useCreateJobsContext } from "@/context/jobs-context";
import { JobsScreen } from "@/screens/jobs-screen";

export default function Screen({}) {
  return (
    <>
      <JobsProvider
        value={useCreateJobsContext({
          admin: true,
        })}
      >
        <JobsScreen />
      </JobsProvider>
    </>
  );
}

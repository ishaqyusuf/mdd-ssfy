import { useJobFormV2Context } from "@/hooks/use-job-form-v2";
import { View } from "react-native";
import { CompletedStep } from "./steps/completed-step";
import { JobDetailsStep } from "./steps/job-details-step";
import { SelectContractorStep } from "./steps/select-contractor-step";
import { SelectProjectStep } from "./steps/select-project-step";
import { SelectTaskStep } from "./steps/select-task-step";
import { SelectUnitStep } from "./steps/select-unit-step";

export function JobV2StepContent() {
  const { currentTab } = useJobFormV2Context();

  return (
    <View className="flex-1">
      {currentTab === "user" ? <SelectContractorStep /> : null}
      {currentTab === "project" ? <SelectProjectStep /> : null}
      {currentTab === "task" ? <SelectTaskStep /> : null}
      {currentTab === "unit" ? <SelectUnitStep /> : null}
      {currentTab === "form" ? <JobDetailsStep /> : null}
      {currentTab === "completed" ? <CompletedStep /> : null}
    </View>
  );
}

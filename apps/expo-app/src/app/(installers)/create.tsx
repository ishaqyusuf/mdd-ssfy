import { JobFormHeader } from "@/components/forms/job/header";
import { JobFormStep } from "@/components/forms/job/job-form-step";
import { SelectProjectStep } from "@/components/forms/job/select-project-step";
import { SelectUnitStep } from "@/components/forms/job/select-unit-step";
import { Tabs } from "@/components/ui/composite";
import {
  JobFormContext,
  useCreateJobFormContext,
  useJobFormContext,
} from "@/hooks/use-job-form-2";
import { View } from "react-native";

export default function CreateJob() {
  return (
    <JobFormContext.Provider value={useCreateJobFormContext(null)}>
      <Content />
    </JobFormContext.Provider>
  );
}
function Content() {
  const { tab } = useJobFormContext();
  return (
    <View className="flex-1 flex flex-col">
      <JobFormHeader />

      <Tabs className="flex-1" onValueChange={(e) => {}} value={tab}>
        <Tabs.Content className="flex-1" value="0">
          <SelectProjectStep />
        </Tabs.Content>
        <Tabs.Content className="flex-1" value="1">
          <SelectUnitStep />
        </Tabs.Content>
        <Tabs.Content value="2" className="flex-1">
          <JobFormStep />
        </Tabs.Content>
      </Tabs>
    </View>
  );
}

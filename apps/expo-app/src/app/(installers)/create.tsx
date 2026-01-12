import { JobFormHeader } from "@/components/forms/job/header";
import { JobFormStep } from "@/components/forms/job/job-form-step";
import { JobSubmittedStep } from "@/components/forms/job/job-submitted-step";
import { SelectCoWorkerStep } from "@/components/forms/job/select-coworker-step";
import { SelectProjectStep } from "@/components/forms/job/select-project-step";
import { SelectUnitStep } from "@/components/forms/job/select-unit-step";
import { Tabs } from "@/components/ui/composite";
import {
  JobFormContext,
  JobFormTabs,
  useCreateJobFormContext,
  useJobFormContext,
} from "@/hooks/use-job-form-2";
import { View } from "react-native";

export default function CreateJob() {
  return (
    <JobFormContext.Provider value={useCreateJobFormContext({})}>
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
        <TabsContent value="project">
          <SelectProjectStep />
        </TabsContent>
        <TabsContent value="unit">
          <SelectUnitStep />
        </TabsContent>
        <TabsContent value="main">
          <JobFormStep />
        </TabsContent>
        <TabsContent value="coworker">
          <SelectCoWorkerStep />
        </TabsContent>
        <TabsContent value="completed">
          {/* <SelectCoWorkerStep /> */}
          <JobSubmittedStep />
        </TabsContent>
      </Tabs>
    </View>
  );
}
function TabsContent({ value, children }: { value: JobFormTabs; children }) {
  return (
    <Tabs.Content className="flex-1" value={value}>
      {children}
    </Tabs.Content>
  );
}

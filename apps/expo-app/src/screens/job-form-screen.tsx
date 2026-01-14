import { AssignTo } from "@/components/forms/job/assign-to";
import { JobFormHeader } from "@/components/forms/job/header";
import { JobFormStep } from "@/components/forms/job/job-form-step";
import { JobSubmittedStep } from "@/components/forms/job/job-submitted-step";
import { SelectCoWorkerStep } from "@/components/forms/job/select-coworker-step";
import { SelectProjectStep } from "@/components/forms/job/select-project-step";
import { SelectUnitStep } from "@/components/forms/job/select-unit-step";
import { SafeArea } from "@/components/safe-area";

import { Tabs } from "@/components/ui/composite";
import {
  JobFormContextProvider,
  JobFormProps,
  JobFormTabs,
  useCreateJobFormContext,
  useJobFormContext,
} from "@/hooks/use-job-form-2";
import { View } from "react-native";

export function JobFormScreen(props: JobFormProps) {
  return (
    <JobFormContextProvider value={useCreateJobFormContext(props)}>
      <Content />
    </JobFormContextProvider>
  );
}
function Content() {
  const { tab } = useJobFormContext();
  return (
    <View className="flex-1 flex flex-col">
      {tab == "completed" || <JobFormHeader />}

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
        <TabsContent value="assign-to">
          <AssignTo />
        </TabsContent>
        <TabsContent value="coworker">
          <SelectCoWorkerStep />
        </TabsContent>
        <TabsContent value="completed">
          {/* <SelectCoWorkerStep /> */}
          <SafeArea>
            <JobSubmittedStep />
          </SafeArea>
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

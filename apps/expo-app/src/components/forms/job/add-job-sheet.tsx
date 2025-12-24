import React, {
  // useEffect,
  useMemo,
} from "react";

// import { ProjectSelect } from "./step-1-project";
// import { UnitSelect } from "./step-2-unit";
// import { Step3Tasks } from "./step-3-tasks";
import { Modal } from "@/components/ui/modal";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import {
  useCreateJobFormContext,
  JobFormProvider,
  // useJobFormContext,
} from "@/hooks/use-job-form";
// import { Tabs } from "@/components/ui/composite";
import { Step4Meta } from "./step-4-meta";
// import { Step4Meta } from "./step-4-meta";

export function AddJobSheet({ ref }) {
  const snapPoints = useMemo(
    () => [
      // "50%", "90%",
      "100%",
    ],
    []
  );
  const ctx = useCreateJobFormContext(ref);
  return (
    <Modal
      snapPoints={snapPoints}
      title="Add New Job"
      ref={ctx.ref}
      // onDismiss={ctx.onDismiss}
      onChange={ctx.onChange}
    >
      <JobFormProvider value={ctx}>
        <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 60 }}>
          <Step4Meta />
          {/* <Tabs onValueChange={(e) => {}} value={ctx.tab}>
            <Tabs.Content value="project" className="w-full">
              <ProjectSelect
                onSelect={(e) => {
                  ctx.setTab("unit");
                }}
              />
            </Tabs.Content>
            <Tabs.Content value="unit" className="w-full">
              <UnitSelect
                onSelect={(e) => {
                  ctx.setTab("tasks");
                }}
              />
            </Tabs.Content>
            <Tabs.Content value="tasks" className="w-full">
              <Step3Tasks />
            </Tabs.Content>
            <Tabs.Content value="meta" className="w-full">
              <Step4Meta />
            </Tabs.Content>
          </Tabs> */}
        </BottomSheetScrollView>
      </JobFormProvider>
    </Modal>
  );
}

import React, { useMemo } from "react";

import { useAddJobStore } from "../../../stores/use-add-job-store";
import { Step1Project } from "./step-1-project";
import { Step2Unit } from "./step-2-unit";
import { Step3Tasks } from "./step-3-tasks";
import { Modal } from "@/components/ui/modal";
import { _trpc } from "@/components/static-trpc";
import { useQuery } from "@tanstack/react-query";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import {
  useCreateJobFormContext,
  JobFormProvider,
  useJobFormContext,
} from "@/hooks/use-job-form";
import { Tabs } from "@/components/ui/composite";

export function AddJobSheet({ ref }) {
  return (
    <JobFormProvider value={useCreateJobFormContext(ref)}>
      <Content />
    </JobFormProvider>
  );
}
export function Content() {
  const ctx = useJobFormContext();
  const snapPoints = useMemo(() => ["50%", "90%"], []);

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
          <Tabs onValueChange={(e) => {}} value={ctx.tab}>
            <Tabs.Content value="project" className="w-full">
              <Step1Project />
            </Tabs.Content>
            <Tabs.Content value="unit" className="w-full">
              <Step2Unit />
            </Tabs.Content>
            <Tabs.Content value="tasks" className="w-full">
              <Step3Tasks />
            </Tabs.Content>
          </Tabs>
        </BottomSheetScrollView>
      </JobFormProvider>
    </Modal>
  );
}

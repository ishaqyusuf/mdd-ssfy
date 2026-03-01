import { useJobFormV2Context } from "@/hooks/use-job-form-v2";
import { useCallback, useRef } from "react";
import { ScrollView, View } from "react-native";
import { CompletedStep } from "./steps/completed-step";
import { JobDetailsStep } from "./steps/job-details-step";
import { SelectContractorStep } from "./steps/select-contractor-step";
import { SelectProjectStep } from "./steps/select-project-step";
import { SelectTaskStep } from "./steps/select-task-step";
import { SelectUnitStep } from "./steps/select-unit-step";
import { StepScrollProvider } from "./ui/step-scroll-context";

export function JobV2StepContent() {
  const { currentTab } = useJobFormV2Context();
  const scrollRef = useRef<ScrollView>(null);
  const scrollToY = useCallback((y: number) => {
    scrollRef.current?.scrollTo({
      y: Math.max(0, y),
      animated: true,
    });
  }, []);

  return (
    <StepScrollProvider value={{ scrollToY }}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerClassName="gap-3 pb-6"
        showsVerticalScrollIndicator={false}
      >
        {currentTab === "user" ? <SelectContractorStep /> : null}
        {currentTab === "project" ? <SelectProjectStep /> : null}
        {currentTab === "task" ? <SelectTaskStep /> : null}
        {currentTab === "unit" ? <SelectUnitStep /> : null}
        {currentTab === "form" ? <JobDetailsStep /> : null}
        {currentTab === "completed" ? <CompletedStep /> : null}

        <View className="h-8" />
      </ScrollView>
    </StepScrollProvider>
  );
}

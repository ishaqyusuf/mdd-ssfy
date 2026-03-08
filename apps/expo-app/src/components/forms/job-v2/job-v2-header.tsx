import { BackBtn } from "@/components/back-btn";
import { useJobFormV2Context } from "@/hooks/use-job-form-v2";
import { Text, View } from "react-native";
import { NeoCard } from "./ui/neo-card";
import { StepTrack } from "./ui/step-track";

const TAB_TITLE: Record<string, string> = {
  user: "Pick Contractor",
  project: "Pick Project",
  task: "Pick Task Template",
  unit: "Pick Unit",
  form: "Craft Job Details",
  completed: "Job Submitted",
};

export function JobV2Header() {
  const { action, step, tabs, currentTab, admin, prevStep, isInstallCostStepActive } = useJobFormV2Context();
  const subtitle = admin ? "Admin Assignment Flow" : "Contractor Job Flow";
  const displayTitle =
    currentTab === "form" && isInstallCostStepActive
      ? "Configure Task Costs"
      : TAB_TITLE[currentTab] || "Job Form";
  const displayCount = tabs.length + (isInstallCostStepActive ? 1 : 0);
  const displayStep = isInstallCostStepActive ? tabs.length + 1 : step;

  return (
    <View className="px-4 pb-2 pt-2">
      <NeoCard className="rounded-[28px] bg-card p-4">
        <View className="mb-3 flex-row items-center gap-3">
          <BackBtn onPress={prevStep} />
          <View className="flex-1">
            <Text className="text-[11px] uppercase tracking-[1.4px] text-muted-foreground">
              {subtitle}
            </Text>
            <Text className="text-xl font-black text-foreground">
              {displayTitle}
            </Text>
            <Text className="text-xs text-muted-foreground">
              {action?.replace("-", " ") || "submit"}
            </Text>
          </View>
        </View>
        <StepTrack count={displayCount} current={displayStep} />
      </NeoCard>
    </View>
  );
}

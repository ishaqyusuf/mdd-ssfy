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
  const { action, step, tabs, currentTab, admin } = useJobFormV2Context();
  const subtitle = admin ? "Admin Assignment Flow" : "Contractor Job Flow";

  return (
    <View className="px-4 pb-2 pt-2">
      <NeoCard className="rounded-[28px] bg-card p-4">
        <View className="mb-3 flex-row items-center gap-3">
          <BackBtn />
          <View className="flex-1">
            <Text className="text-[11px] uppercase tracking-[1.4px] text-muted-foreground">
              {subtitle}
            </Text>
            <Text className="text-xl font-black text-foreground">
              {TAB_TITLE[currentTab] || "Job Form"}
            </Text>
            <Text className="text-xs text-muted-foreground">
              {action?.replace("-", " ") || "create"}
            </Text>
          </View>
        </View>
        <StepTrack count={tabs.length} current={step} />
      </NeoCard>
    </View>
  );
}

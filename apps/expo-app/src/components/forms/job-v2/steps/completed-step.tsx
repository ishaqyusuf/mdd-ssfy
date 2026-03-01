import { useJobFormV2Context } from "@/hooks/use-job-form-v2";
import { Text, View } from "react-native";
import { NeoCard } from "../ui/neo-card";

export function CompletedStep() {
  const { savedData } = useJobFormV2Context();

  return (
    <View className="gap-3">
      <NeoCard className="items-center border-primary/30 bg-primary/10 py-10">
        <Text className="text-xs uppercase tracking-[1.2px] text-primary">Job Created</Text>
        <Text className="mt-1 text-2xl font-black text-foreground">Submission Complete</Text>
        <Text className="mt-2 text-sm text-muted-foreground">
          {savedData?.id ? `Job #${savedData.id} is ready.` : "Your job has been saved."}
        </Text>
      </NeoCard>
    </View>
  );
}

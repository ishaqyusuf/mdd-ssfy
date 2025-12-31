// apps/expo-app/src/components/forms/job/select-project-step.tsx
import { ScrollView, Text, View } from "react-native";
import { useJobFormContext } from "@/hooks/use-job-form-2";
import { JobSelectProjectSearch } from "./job-select-project-search";
import { JobSelectProjectList } from "./job-select-project-list";
import { JobSelectProjectFooter } from "./job-select-project-footer";

export type Project = {
  id: string;
  name: string;
  location: string;
  icon: string; // Lucide icon name
};

export function SelectProjectStep() {
  const { setTab } = useJobFormContext();

  const handleContinue = () => {
    setTab("1");
  };

  return (
    <View className="relative flex-1">
      {/* <JobSelectProjectHeader onBack={handleBack} /> */}
      <View className="px-5 pt-2 pb-4">
        <Text className="text-3xl font-bold text-foreground leading-tight">
          Which project is this for?
        </Text>
      </View>
      <JobSelectProjectSearch />
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <JobSelectProjectList />
      </ScrollView>
      <JobSelectProjectFooter onContinue={handleContinue} />
    </View>
  );
}

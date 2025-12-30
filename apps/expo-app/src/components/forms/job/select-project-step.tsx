// apps/expo-app/src/components/forms/job/select-project-step.tsx
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useJobFormContext } from "@/hooks/use-job-form-2";
import { JobSelectProjectSearch } from "./job-select-project-search";
import { JobSelectProjectList } from "./job-select-project-list";
import { useColors } from "@/hooks/use-color";
import { JobSelectProjectFooter } from "./job-select-project-footer";

export type Project = {
  id: string;
  name: string;
  location: string;
  icon: string; // Lucide icon name
};

export function SelectProjectStep() {
  const { setTab } = useJobFormContext();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    "1"
  );
  const colors = useColors();

  const handleContinue = () => {
    // Logic to proceed to the next step
    console.log("Selected Project ID:", selectedProjectId);
    // Example: setTab('next-step');
  };

  const handleBack = () => {
    // Logic to go back
    console.log("Go back");
  };
  return (
    <View className="relative">
      {/* <JobSelectProjectHeader onBack={handleBack} /> */}
      <View className="px-5 pt-2 pb-4">
        <Text className="text-3xl font-bold text-foreground leading-tight">
          Which project is this for?
        </Text>
      </View>
      <JobSelectProjectSearch />
      <ScrollView className="" keyboardShouldPersistTaps="handled">
        <JobSelectProjectList />
      </ScrollView>
      <JobSelectProjectFooter onContinue={handleContinue} />
    </View>
  );
}

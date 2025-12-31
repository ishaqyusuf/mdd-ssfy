// apps/expo-app/src/components/forms/job/select-project-step.tsx
import { Text, View } from "react-native";
import { useJobFormContext } from "@/hooks/use-job-form-2";
import { JobSelectProjectSearch } from "./job-select-project-search";
import { JobSelectProjectFooter } from "./job-select-project-footer";
import { JobSelectUnitList } from "./job-select-unit-list";

export type Project = {
  id: string;
  name: string;
  location: string;
  icon: string; // Lucide icon name
};

export function SelectUnitStep() {
  const { setTab } = useJobFormContext();

  const handleContinue = () => {
    setTab("main");
  };

  return (
    <View className="relative flex-1">
      <View className="px-5 pt-2 pb-4">
        <Text className="text-3xl font-bold text-foreground leading-tight">
          Select Unit
        </Text>
      </View>
      <JobSelectProjectSearch />

      <JobSelectUnitList />

      <JobSelectProjectFooter onContinue={handleContinue} />
    </View>
  );
}

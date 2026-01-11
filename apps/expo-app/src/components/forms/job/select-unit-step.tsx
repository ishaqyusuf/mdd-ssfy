// apps/expo-app/src/components/forms/job/select-project-step.tsx
import { Text, View } from "react-native";
import { useJobFormContext } from "@/hooks/use-job-form-2";
import { JobSelectUnitList } from "./job-select-unit-list";
import { useSearch } from "@/hooks/use-search";
import { SearchInput } from "./search-input";

export type Project = {
  id: string;
  name: string;
  location: string;
  icon: string; // Lucide icon name
};

export function SelectUnitStep() {
  const { setTab, jobsListData, ...ctx } = useJobFormContext();

  const handleContinue = () => {
    setTab("main");
  };

  const jobsList = jobsListData?.homeList;
  const { clear, query, results } = useSearch({
    items: jobsList!,
  });
  return (
    <View className="relative flex-1 bg-background">
      <View className="px-5 pt-2 pb-4">
        <Text className="text-3xl font-bold text-foreground leading-tight">
          Select Unit
        </Text>
      </View>
      <SearchInput placeholder="Search units" />

      <JobSelectUnitList items={results} />

      {/* <JobSelectProjectFooter onContinue={handleContinue} /> */}
    </View>
  );
}

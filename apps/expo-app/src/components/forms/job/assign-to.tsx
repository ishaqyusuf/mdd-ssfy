// apps/expo-app/src/components/forms/job/select-project-step.tsx
import { ScrollView, Text, View } from "react-native";
import { useJobFormContext } from "@/hooks/use-job-form-2";
import { SearchInput } from "./search-input";
import { JobSelectCoWorkerList } from "./workers-select-list";
import { Titles } from "@/components/titles";
import { useSearch } from "@/hooks/use-search";

export type Project = {
  id: string;
  name: string;
  location: string;
  icon: string; // Lucide icon name
};

export function AssignTo() {
  const { setTab, users } = useJobFormContext();
  const { clear, query, results } = useSearch({
    items: users?.data!,
  });
  return (
    <View className="relative flex-1">
      {/* <JobSelectProjectHeader onBack={handleBack} /> */}
      <Titles.BigTitle title="Assign To" />
      <SearchInput placeholder="Search workers" />
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <JobSelectCoWorkerList items={results} />
      </ScrollView>
    </View>
  );
}

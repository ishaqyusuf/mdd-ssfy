// apps/expo-app/src/components/forms/job/select-project-step.tsx
import { ScrollView, Text, View } from "react-native";
import { useJobFormContext } from "@/hooks/use-job-form-2";
import { SearchInput } from "../../search-input";
import { JobSelectProjectList } from "./job-select-project-list";

import { Titles } from "@/components/titles";
import { useSearch } from "@/hooks/use-search";

export type Project = {
  id: string;
  name: string;
  location: string;
  icon: string; // Lucide icon name
};

export function SelectProjectStep() {
  const { setTab, ...ctx } = useJobFormContext();
  const { clear, setQuery, query, results } = useSearch({
    items: ctx?.projectList!,
  });
  // const handleContinue = () => {
  //   setTab("unit");
  // };

  return (
    <View className="relative flex-1">
      {/* <JobSelectProjectHeader onBack={handleBack} /> */}
      <Titles.BigTitle title={"Which project is this for?"} />

      <SearchInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search projects"
      />
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <JobSelectProjectList items={results} />
      </ScrollView>
      {/* <JobSelectProjectFooter onContinue={handleContinue} /> */}
    </View>
  );
}

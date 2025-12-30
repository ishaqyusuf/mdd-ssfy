// apps/expo-app/src/components/forms/job/select-project-step.tsx
import { useState } from "react";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { View } from "@/components/ui/view";
import { useJobFormContext } from "@/hooks/use-job-form";
import { JobSelectProjectHeader } from "./job-select-project-header";
import { JobSelectProjectSearch } from "./job-select-project-search";
import { JobSelectProjectList } from "./job-select-project-list";
import { JobSelectProjectFooter } from "./job-select-project-footer";

export type Project = {
  id: string;
  name: string;
  location: string;
  icon: string; // Lucide icon name
};

const customProject: Project = {
  id: "custom",
  name: "Custom Project",
  location: "Unit selection disabled",
  icon: "Plus",
};

const recentProjects: Project[] = [
  {
    id: "1",
    name: "Antillia Villas",
    location: "Nassau, Bahamas",
    icon: "Building2",
  },
  { id: "2", name: "Palm Cay", location: "Eastern Road", icon: "Palmtree" },
  { id: "3", name: "Ocean Gate", location: "West Bay St.", icon: "Home" },
  { id: "4", name: "The Reef", location: "Paradise Island", icon: "Waves" },
];

export function SelectProjectStep() {
  const { setTab } = useJobFormContext();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    "1"
  );

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
    <View edges={["top"]} className="bg-background">
      <View className="flex-1">
        {/* <JobSelectProjectHeader onBack={handleBack} /> */}
        {/* <ScrollView contentContainerStyle={{ paddingBottom: 140 }}> */}
        <View className="px-5 pt-2 pb-4">
          <Text className="text-3xl font-bold  leading-tight">
            Which project is this for?
          </Text>
        </View>
        <JobSelectProjectSearch />
        <JobSelectProjectList
          customProject={customProject}
          recentProjects={recentProjects}
          selectedProjectId={selectedProjectId}
          onSelectProject={setSelectedProjectId}
        />
        {/* </ScrollView> */}
      </View>
      {/* <JobSelectProjectFooter onContinue={handleContinue} /> */}
    </View>
  );
}

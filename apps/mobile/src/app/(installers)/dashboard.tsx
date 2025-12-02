import { AddNewJobFAB } from "@/components/installers/dashboard/add-new-job-fab";
import { JobAnalytics } from "@/components/installers/dashboard/job-analytics";
import { RecentJobs } from "@/components/installers/dashboard/recent-jobs";
import { ScrollView, View } from "react-native";
import { JobOverviewModal } from "@/components/installers/job-overview/job-overview-modal";
import { Redirect } from "expo-router";

export default function Dashboard() {
  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <ScrollView contentContainerStyle={{ paddingBottom: 80, paddingTop: 16 }}>
        <View className="px-4 space-y-6">
          <JobAnalytics />
          <RecentJobs />
        </View>
      </ScrollView>
      <AddNewJobFAB />
      <JobOverviewModal />
    </View>
  );
}

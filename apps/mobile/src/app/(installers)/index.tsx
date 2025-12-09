import { ScrollView, View } from "react-native";
import { JobOverviewModal } from "@/components/job-overview/job-overview-modal";
import { JobAnalytics } from "@/components/installer-dashboard/job-analytics";
import { RecentJobs } from "@/components/installer-dashboard/recent-jobs";
import { AddNewJobFAB } from "@/components/installer-dashboard/add-new-job-fab";

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

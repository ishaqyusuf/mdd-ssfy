import { ScrollView, View } from "react-native";
import { JobOverviewModal } from "@/components/job-overview/job-overview-modal";
import { JobAnalytics } from "@/components/installer-dashboard/job-analytics";
import { RecentJobs } from "@/components/installer-dashboard/recent-jobs";
import { AddNewJobFAB } from "@/components/installer-dashboard/add-new-job-fab";
import { Header } from "@/components/installer-dashboard/installer-dashboard-header";
import { Debug } from "@/components/debug";
import { Link } from "expo-router";

export default function Dashboard() {
  return (
    <View className="flex-1 bg-background">
      <Header />
      <ScrollView contentContainerStyle={{ paddingBottom: 80, paddingTop: 16 }}>
        <View className="px-4 space-y-6">
          <JobAnalytics />
          <Debug>
            <Link href={"/home2"}>New Dashboard</Link>
          </Debug>
          <RecentJobs />
        </View>
      </ScrollView>
      <AddNewJobFAB />
      <JobOverviewModal />
    </View>
  );
}

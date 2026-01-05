import { ScrollView, View } from "react-native";
import { JobOverviewModal } from "@/components/job-overview/job-overview-modal";
import { JobAnalytics } from "@/components/installer-dashboard/job-analytics";
import { RecentJobs } from "@/components/installer-dashboard/recent-jobs";
import { AddNewJobFAB } from "@/components/installer-dashboard/add-new-job-fab";
import { Debug } from "@/components/debug";
import { Link } from "expo-router";
import { Header } from "@/components/installer-dashboard/installer-dashboard-header";

export default function Dashboard() {
  return (
    <View className="flex-1 bg-background">
      <Dashboardv1 />
      {/* <Dashboardv2 /> */}
    </View>
  );
}

function Dashboardv1() {
  return (
    <>
      <Header />
      <ScrollView contentContainerStyle={{ paddingBottom: 80, paddingTop: 16 }}>
        {/* <JobAnalytics /> */}
        <View className="px-4 space-y-6">
          <JobAnalytics />
          <Debug>
            <Link className="text-foreground p-2 bg-foreground" href={"/home2"}>
              New Dashboard!
            </Link>
          </Debug>
          <RecentJobs />
        </View>
      </ScrollView>
      <AddNewJobFAB />
      <JobOverviewModal />
    </>
  );
}

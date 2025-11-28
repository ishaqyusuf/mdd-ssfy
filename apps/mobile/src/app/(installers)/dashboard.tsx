import { AddNewJobFAB } from "@/components/installers/dashboard/add-new-job-fab";
import { JobAnalytics } from "@/components/installers/dashboard/job-analytics";
import { RecentJobs } from "@/components/installers/dashboard/recent-jobs";
import {
  PROJECTS,
  TASKS,
  UNITS,
} from "@/components/installers/add-job/dummy-data";
import { ScrollView, View } from "react-native";

const recentJobsData = [
  {
    id: "1",
    task: TASKS[0],
    unit: UNITS[0],
    project: PROJECTS[0],
    status: "Completed",
  },
  {
    id: "2",
    task: TASKS[1],
    unit: UNITS[2],
    project: PROJECTS[1],
    status: "In Progress",
  },
  {
    id: "3",
    task: TASKS[2],
    unit: UNITS[4],
    project: PROJECTS[2],
    status: "Completed",
  },
  {
    id: "4",
    task: TASKS[3],
    unit: UNITS[1],
    project: PROJECTS[0],
    status: "Pending",
  },
];

export default function Dashboard() {
  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <ScrollView contentContainerStyle={{ paddingBottom: 80, paddingTop: 16 }}>
        <View className="px-4 space-y-6">
          <JobAnalytics
            completed={12}
            inProgress={3}
            paid={10}
            pendingPayments={2}
          />
          <RecentJobs jobs={recentJobsData} />
        </View>
      </ScrollView>
      <AddNewJobFAB />
    </View>
  );
}
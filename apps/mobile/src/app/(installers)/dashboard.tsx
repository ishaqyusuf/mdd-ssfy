import { AddNewJobFAB } from "@/components/installers/dashboard/add-new-job-fab";
import { JobAnalytics } from "@/components/installers/dashboard/job-analytics";
import { RecentJobs } from "@/components/installers/dashboard/recent-jobs";
import {
  PROJECTS,
  TASKS,
  UNITS,
} from "@/components/installers/add-job/dummy-data";
import { DetailedJob } from "@/components/installers/job-overview/types";
import { ScrollView, View } from "react-native";
import { JobOverviewModal } from "@/components/installers/job-overview/job-overview-modal";

const recentJobsData: DetailedJob[] = [
  {
    id: "1",
    project: PROJECTS[0],
    unit: UNITS[0],
    model: "1589 LH",
    tasks: [
      { task: TASKS[0], quantity: 1 },
      { task: TASKS[1], quantity: 2 },
    ],
    totalInstallCost: TASKS[0].ratePerUnit * 1 + TASKS[1].ratePerUnit * 2,
    jobStatus: "Completed",
    paymentStatus: "Paid",
    submissionDate: new Date("2023-10-15"),
  },
  {
    id: "2",
    project: PROJECTS[1],
    unit: UNITS[2],
    model: "1200 SH",
    tasks: [{ task: TASKS[2], quantity: 1 }],
    totalInstallCost: TASKS[2].ratePerUnit * 1,
    jobStatus: "In Progress",
    paymentStatus: "Partially Paid",
    submissionDate: new Date("2023-10-20"),
  },
  {
    id: "3",
    project: PROJECTS[2],
    unit: UNITS[4],
    model: "2000 DH",
    tasks: [
      { task: TASKS[3], quantity: 1 },
      { task: TASKS[4], quantity: 1 },
    ],
    totalInstallCost: TASKS[3].ratePerUnit + TASKS[4].ratePerUnit,
    jobStatus: "Submitted",
    paymentStatus: "Unpaid",
    submissionDate: new Date("2023-10-22"),
  },
  {
    id: "4",
    project: PROJECTS[0],
    unit: UNITS[1],
    model: "1589 LH",
    tasks: [{ task: TASKS[0], quantity: 1 }],
    totalInstallCost: TASKS[0].ratePerUnit * 1,
    jobStatus: "Pending Submission",
    paymentStatus: "Unpaid",
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
      <JobOverviewModal />
    </View>
  );
}

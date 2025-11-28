import { AddNewJobFAB } from '@/components/installers/dashboard/AddNewJobFAB';
import { JobAnalytics } from '@/components/installers/dashboard/JobAnalytics';
import { RecentJobs } from '@/components/installers/dashboard/RecentJobs';
import { ScrollView, View } from 'react-native';

const recentJobsData = [
  { id: '1', title: 'Kitchen Cabinet Installation', status: 'Completed', location: '123 Main St, Anytown, USA' },
  { id: '2', title: 'Bookshelf Assembly', status: 'In Progress', location: '456 Oak Ave, Sometown, USA' },
  { id: '3', title: 'Custom Wardrobe Fitting', status: 'Completed', location: '789 Pine Ln, Yourtown, USA' },
  { id: '4', title: 'Office Desk Setup', status: 'Pending', location: '101 Maple Dr, Mytown, USA' },
];


export default function Dashboard() {
  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
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

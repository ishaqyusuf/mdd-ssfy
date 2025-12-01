import React from "react";
import { View, FlatList, ActivityIndicator } from "react-native";
import { Text } from "@/components/ui/text";
import { JobsHeader } from "@/components/installers/jobs/jobs-header";
import { useJobsStore } from "@/stores/use-jobs-store";
import { RecentJobsItem } from "@/components/installers/jobs/recent-jobs-item";

export default function JobsPage() {
  const { jobs, loading, fetchJobs, hasMore, loadMoreJobs } = useJobsStore();

  React.useEffect(() => {
    fetchJobs(true); // Fetch initial jobs on mount
  }, [fetchJobs]);

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View className="py-4">
        <ActivityIndicator size="large" />
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* <JobsHeader /> */}
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <RecentJobsItem job={item} />}
        onEndReached={() => {
          if (hasMore && !loading) {
            loadMoreJobs();
          }
        }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={() => (
          <View className="flex-1 items-center justify-center py-10">
            <Text className="text-gray-500 dark:text-gray-400">
              No jobs found.
            </Text>
          </View>
        )}
        ListFooterComponent={renderFooter}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
      />
    </View>
  );
}

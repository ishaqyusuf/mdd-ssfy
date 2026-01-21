import { Text } from "@/components/ui/text";
import { MaterialIcons } from "@expo/vector-icons";
import { useColorScheme } from "@/hooks/use-color";
import { TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native"; // Add this
import { LegendList } from "@legendapp/list";
import { _trpc } from "@/components/static-trpc";
import { useQuery } from "@tanstack/react-query";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { getColorFromName } from "@gnd/utils/colors";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@gnd/utils/dayjs";
import { useJobOverviewStore } from "@/stores/use-job-overview-store";
import { getSessionProfile } from "@/lib/session-store";
import { useRouter } from "expo-router";
import { JobListItem1 } from "./job-list-item-1";

// type RecentJobsProps = {};
export type JobItem = RouterOutputs["jobs"]["getJobs"]["data"][number];

export function RecentJobs() {
  // { jobs }: RecentJobsProps
  const { colorScheme } = useColorScheme();
  const { openModal } = useJobOverviewStore((s) => s.actions);
  const profile = getSessionProfile();
  const navigation = useNavigation(); // Add this
  const { data, isPending } = useQuery(
    _trpc.jobs.getJobs.queryOptions({
      size: 5,
      userId: profile.user.id,
    }),
  );
  const router = useRouter();
  const renderItem = ({ item }: { item: JobItem }) => {
    return <JobListItem1 item={item} />;
  };

  return (
    <View className="mt-8 gap-2">
      <View className="flex-row justify-between items-center mb-4">
        <View className="flex-row items-center">
          <MaterialIcons
            name="history"
            size={22}
            color={colorScheme === "dark" ? "#9CA3AF" : "#6B7280"}
          />
          <Text className="text-xl font-bold text-gray-800 dark:text-gray-100 ml-2">
            Recent Jobs
          </Text>
        </View>
        <TouchableOpacity
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg"
          // onPress={() => navigation.navigate("/jobs")} // Navigate to jobs page
        >
          <Text className="text-sm font-medium text-primary-medium-blue dark:text-sky-400">
            View All
          </Text>
        </TouchableOpacity>
      </View>
      {isPending ? (
        [...Array.from({ length: 5 })].map((_, index) => (
          <Skeleton
            key={index}
            className="h-20 bg-gray-200/60 dark:bg-gray-700/60 rounded-xl animate-pulse mb-3"
          />
        ))
      ) : (
        <LegendList
          data={data?.data || []}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          // scrollEnabled={false}
        />
      )}
    </View>
  );
}

import { Text } from "@/components/ui/text";
import { MaterialIcons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
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
import { JobItem } from "./recent-jobs";
import { JobListItem2 } from "./job-list-item-2";
import { Debug } from "../debug";

export function RecentJobs2() {
  // { jobs }: RecentJobsProps
  const { colorScheme } = useColorScheme();
  const { openModal } = useJobOverviewStore((s) => s.actions);
  const profile = getSessionProfile();
  const navigation = useNavigation(); // Add this
  const { data, isPending } = useQuery(
    _trpc.jobs.getJobs.queryOptions({
      size: 5,
      userId: profile.user.id,
    })
  );
  const router = useRouter();
  const renderItem = ({ item }: { item: JobItem }) => {
    return <JobListItem2 item={item} />;
  };

  return (
    <View className="px-5 mt-4 mb-8">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-lg font-bold text-foreground">
          Recent Activity
        </Text>
        <Debug>
          <TouchableOpacity
            onPress={(e) => {
              router.push("/jobs2");
            }}
          >
            <Text className="text-sm font-bold text-primary">View All</Text>
          </TouchableOpacity>
        </Debug>
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

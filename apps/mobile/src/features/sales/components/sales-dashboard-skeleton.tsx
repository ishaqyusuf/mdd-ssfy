import { Skeleton } from "@/components/ui/skeleton";
import { ScrollView, View } from "react-native";

export function SalesDashboardSkeleton() {
  return (
    <ScrollView
      contentContainerStyle={{
        paddingTop: 4,
        paddingBottom: 36,
        paddingHorizontal: 16,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View className="mb-5 flex-row flex-wrap gap-3">
        {[0, 1, 2, 3].map((index) => (
          <View
            key={`sales-dashboard-stat-skeleton-${index}`}
            className="min-h-[96px] min-w-[47%] flex-1 rounded-2xl border border-border bg-card p-4"
          >
            <Skeleton className="h-3 w-24 rounded-md" />
            <Skeleton className="mt-4 h-8 w-16 rounded-md" />
          </View>
        ))}
      </View>

      <View className="gap-3">
        <Skeleton className="h-[72px] w-full rounded-2xl" />
        {[0, 1].map((index) => (
          <View
            key={`sales-dashboard-action-skeleton-${index}`}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <View>
                  <Skeleton className="h-4 w-20 rounded-md" />
                  <Skeleton className="mt-2 h-3 w-40 rounded-md" />
                </View>
              </View>
              <Skeleton className="h-5 w-5 rounded-full" />
            </View>
          </View>
        ))}
      </View>

      <View className="mt-6">
        <View className="mb-3 flex-row items-center justify-between">
          <Skeleton className="h-5 w-28 rounded-md" />
          <Skeleton className="h-3 w-20 rounded-md" />
        </View>
        <View className="gap-3">
          {[0, 1, 2].map((index) => (
            <SalesDashboardRecentSaleSkeleton
              key={`sales-dashboard-recent-skeleton-${index}`}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function SalesDashboardRecentSaleSkeleton() {
  return (
    <View className="overflow-hidden rounded-3xl border border-border bg-card">
      <View className="border-b border-border/70 px-4 pb-3 pt-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-2xl" />
            <View>
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="mt-2 h-3 w-36 rounded-md" />
            </View>
          </View>
          <Skeleton className="h-6 w-20 rounded-full" />
        </View>
      </View>
      <View className="px-4 py-3">
        <View className="mb-3 flex-row gap-2">
          {[0, 1, 2].map((index) => (
            <Skeleton
              key={`sales-dashboard-metric-chip-skeleton-${index}`}
              className="h-[54px] flex-1 rounded-xl"
            />
          ))}
        </View>
        <Skeleton className="mb-3 h-1.5 w-full rounded-full" />
        <View className="flex-row items-center justify-between">
          <Skeleton className="h-3 w-28 rounded-md" />
          <Skeleton className="h-3 w-32 rounded-md" />
        </View>
      </View>
    </View>
  );
}

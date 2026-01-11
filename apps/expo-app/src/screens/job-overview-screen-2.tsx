import { AdminJobReviewCard } from "@/components/admin-job-review-card";
import { BlurView } from "@/components/blur-view";
import { Debug } from "@/components/debug";
import { SafeArea } from "@/components/safe-area";
import { _trpc } from "@/components/static-trpc";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import {
  JobOverviewProps,
  JobProvider,
  useCreateJobContext,
  useJobContext,
} from "@/hooks/use-job";
import { useJobTaskList } from "@/hooks/use-job-task-list";
import { cn } from "@/lib/utils";
import { formatMoney } from "@gnd/utils";
import { getColorFromName } from "@gnd/utils/colors";
import { formatDate } from "@gnd/utils/dayjs";
import { LegendList } from "@legendapp/list";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { createContext, useContext } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";

export default function JobOverviewScreen2(props: JobOverviewProps) {
  return (
    <JobProvider value={useCreateJobContext(props)}>
      <Content />
    </JobProvider>
  );
}
function Content() {
  const { isPending, job } = useJobContext();
  if (isPending || !job) return <SkeletonView />;

  return (
    <SafeArea>
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-border bg-background">
        <View className="flex-row items-center gap-4">
          <Pressable className="size-10 rounded-full bg-card items-center justify-center border border-border">
            <Icon name="ArrowLeft" className="text-muted-foreground size-20" />
          </Pressable>
          <View>
            <Text className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Job #2024-85
            </Text>
            <Text className="text-lg font-bold text-foreground">
              Job Details
            </Text>
          </View>
        </View>
        <Avatar initials="AD" className="size-10" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
      >
        {/* Main Job Card */}
        <View className="bg-card rounded-2xl p-6 border border-border mb-6">
          <View className="flex-row justify-between items-start mb-4">
            <View className="flex-1 pr-4">
              <View className="flex-row items-center gap-2 mb-2">
                <Icon
                  name="Building"
                  className="text-muted-foreground size-14"
                />
                <Text className="text-xs font-medium text-muted-foreground">
                  Skyline Apartments • Unit 4B
                </Text>
              </View>
              <Text className="text-2xl font-bold text-foreground leading-tight">
                Kitchen Cabinet Installation
              </Text>
            </View>

            <View className="flex-row items-center px-3 py-1.5 rounded-full bg-secondary border border-border">
              <Icon
                name="Clock"
                className="text-secondary-foreground mr-1.5 size-12"
              />
              <Text className="text-xs font-medium text-secondary-foreground">
                Pending
              </Text>
            </View>
          </View>

          <Text className="text-sm text-muted-foreground leading-relaxed mb-6">
            Full installation of upper and lower shaker-style cabinets. Includes
            hardware installation and minor leveling adjustments.
          </Text>

          <View className="flex-row items-center justify-between pt-4 border-t border-border">
            <View className="flex-row items-center">
              <View className="flex-row -space-x-3 mr-4">
                <Avatar
                  initials="MS"
                  className="size-8 bg-background ring-2 ring-card"
                />
                <Avatar
                  initials="JL"
                  className="size-8 bg-background ring-2 ring-card"
                />
                <View className="size-8 rounded-full bg-muted items-center justify-center ring-2 ring-card border border-border">
                  <Text className="text-[10px] font-medium text-muted-foreground">
                    +1
                  </Text>
                </View>
              </View>
              <Text className="text-xs text-muted-foreground font-medium">
                Assigned Team
              </Text>
            </View>

            <Pressable className="bg-secondary p-2 rounded-full">
              <Icon
                name="MapPin"
                className="text-secondary-foreground size-16"
              />
            </Pressable>
          </View>
        </View>

        {/* Breakdown Section */}
        <View className="bg-card rounded-2xl border border-border mb-6 overflow-hidden">
          <View className="px-6 py-4 border-b border-border bg-muted/20 flex-row items-center gap-3">
            <Icon name="Receipt" className="text-muted-foreground size-16" />
            <Text className="font-semibold text-foreground">Job Breakdown</Text>
          </View>

          <View className="p-6 gap-5">
            {/* Line Item 1 */}
            <View className="flex-row justify-between items-start">
              <View>
                <Text className="text-sm font-medium text-foreground">
                  Base Cabinets Install
                </Text>
                <Text className="text-xs text-muted-foreground mt-0.5">
                  Qty: 8 units
                </Text>
              </View>
              <Text className="text-sm font-medium text-foreground">
                $480.00
              </Text>
            </View>

            {/* Line Item 2 */}
            <View className="flex-row justify-between items-start">
              <View>
                <Text className="text-sm font-medium text-foreground">
                  Wall Cabinets Install
                </Text>
                <Text className="text-xs text-muted-foreground mt-0.5">
                  Qty: 6 units
                </Text>
              </View>
              <Text className="text-sm font-medium text-foreground">
                $360.00
              </Text>
            </View>

            {/* Line Item 3 */}
            <View className="flex-row justify-between items-start">
              <View>
                <View className="flex-row items-center gap-2">
                  <Text className="text-sm font-medium text-foreground">
                    Materials Run
                  </Text>
                  <View className="px-1.5 py-0.5 rounded bg-muted">
                    <Text className="text-[10px] font-bold text-muted-foreground uppercase">
                      Extra
                    </Text>
                  </View>
                </View>
                <Text className="text-xs text-muted-foreground mt-0.5">
                  Home Depot pickup
                </Text>
              </View>
              <Text className="text-sm font-medium text-foreground">
                $45.00
              </Text>
            </View>

            {/* Total Footer */}
            <View className="mt-2 pt-4 border-t border-dashed border-border flex-row justify-between items-center">
              <Text className="text-sm font-medium text-muted-foreground">
                Total Estimate
              </Text>
              <Text className="text-xl font-bold text-accent-foreground">
                $885.00
              </Text>
            </View>
          </View>
        </View>

        {/* Notes Section */}
        <View className="bg-card rounded-2xl p-6 border border-border mb-6">
          <View className="flex-row items-center gap-2 mb-4">
            <Icon name="FileText" className="text-muted-foreground size-16" />
            <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Field Notes
            </Text>
          </View>

          <View className="bg-muted/30 p-4 rounded-xl border border-border">
            <Text className="text-sm text-foreground italic leading-relaxed">
              {`Client requested soft-close hinges on all doors. I've added this
              to the materials list but need approval for the extra hardware
              cost.`}
            </Text>
            <View className="flex-row items-center gap-2 mt-3">
              <Avatar initials="MS" className="size-5" />
              <Text className="text-[10px] text-muted-foreground font-medium">
                Mike S. • 2 hours ago
              </Text>
            </View>
          </View>
        </View>

        {/* Admin Review Action Area */}
        <AdminJobReviewCard />
      </ScrollView>

      {/* Bottom Navigation */}
      <View className="absolute bottom-0 left-0 right-0 bg-background border-t border-border flex-row justify-between items-center px-6 pt-3 pb-8">
        <Pressable className="items-center gap-1.5 w-16">
          <Icon name="LayoutGrid" className="text-muted-foreground size-24" />
          <Text className="text-[10px] font-medium text-muted-foreground">
            Home
          </Text>
        </Pressable>

        <Pressable className="items-center gap-1.5 w-16">
          <Icon name="ClipboardList" className="text-foreground size-24" />
          <Text className="text-[10px] font-medium text-foreground">Jobs</Text>
        </Pressable>

        <Pressable className="items-center gap-1.5 w-16">
          <Icon name="Users" className="text-muted-foreground size-24" />
          <Text className="text-[10px] font-medium text-muted-foreground">
            Teams
          </Text>
        </Pressable>

        <Pressable className="items-center gap-1.5 w-16">
          <Icon name="Settings" className="text-muted-foreground size-24" />
          <Text className="text-[10px] font-medium text-muted-foreground">
            Settings
          </Text>
        </Pressable>
      </View>
    </SafeArea>
  );
}

function SkeletonView() {
  // return <LegendList ListHeaderComponent={<></>} />;

  return (
    <SafeArea>
      {/* <View className="flex-1 bg-background"> */}
      <View className="px-5 pt-4 pb-3">
        <Skeleton className="h-6 w-24 rounded-md" />
      </View>

      <ScrollView
        // className="flex-1"
        style={{ flex: 1 }}
        contentContainerClassName="p-5 pt-4 gap-6 pb-32"
      >
        <View className="gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-9 w-3/4 rounded-md" />
          <Skeleton className="h-4 w-40 rounded-md" />
        </View>

        <Skeleton className="h-4 w-32 rounded-md" />

        <Skeleton className="h-24 w-full rounded-xl" />

        <View className="gap-3">
          <Skeleton className="h-5 w-32 rounded-md" />
          <View className="gap-2">
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-4/5 rounded-md" />
          </View>
        </View>

        <Skeleton className="h-40 w-full rounded-xl" />

        <View className="gap-3">
          <Skeleton className="h-5 w-40 rounded-md" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-row -mx-5 px-5"
            contentContainerClassName="gap-3 pb-2"
          >
            {[1, 2, 3].map((_, i) => (
              <Skeleton key={i} className="h-20 w-28 rounded-xl" />
            ))}
          </ScrollView>
        </View>

        <Skeleton className="h-32 w-full rounded-xl" />
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-5 bg-background">
        <Skeleton className="h-12 w-full rounded-xl" />
      </View>
      {/* </View> */}
    </SafeArea>
  );
}
const Avatar = ({
  initials,
  className,
}: {
  initials: string;
  className?: string;
}) => {
  return (
    <View
      className={`items-center justify-center bg-secondary rounded-full overflow-hidden border border-border ${className}`}
    >
      <Text className="text-secondary-foreground text-xs font-medium uppercase">
        {initials}
      </Text>
    </View>
  );
};

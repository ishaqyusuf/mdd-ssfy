import { HeaderContainer } from "@/components/header-container";
import { AdminJobsItem } from "@/components/jobs-item-admin";
import { PressableLink } from "@/components/pressable-link";
import { _trpc } from "@/components/static-trpc";
import { Titles } from "@/components/titles";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useAuthContext } from "@/hooks/use-auth";
import { LegendList } from "@legendapp/list";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef } from "react";
import { Animated, View } from "react-native";
export function JobsAdminHome() {
  return (
    <>
      <Header />
      {/* <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
      > */}

      <Content />
      {/* </ScrollView> */}
    </>
  );
}
function Content() {
  const { data, isPending } = useQuery(
    _trpc.jobs.getJobs.queryOptions({
      size: 5,
      //   userId: profile.user.id,
    })
  );
  const params = useLocalSearchParams();
  console.log({ params });
  const translateY = params.scrollAnimatedValue as unknown as Animated.Value;

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: translateY } } }],
    { useNativeDriver: true }
  );

  const hideTab = translateY?.interpolate?.({
    inputRange: [0, 50],
    outputRange: [0, 70], // tab height
    extrapolate: "clamp",
  });

  const scrollY = useRef(new Animated.Value(0)).current;

  const tabTranslate = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, 70], // hide tab bar
    extrapolate: "clamp",
  });

  return (
    <View className="gap-4 flex-1">
      <LegendList
        // onScroll={Animated.event(
        //   [{ nativeEvent: { contentOffset: { y: translateY } } }],
        //   { useNativeDriver: true }
        // )}
        scrollEventThrottle={16}
        ListHeaderComponent={
          <View className="gap-4 px-4 my-4">
            <StatsGrid />
            <View className="flex-row justify-between items-center px-1">
              <Text className="text-lg font-bold text-foreground">
                Recent Jobs
              </Text>
              <PressableLink
                href={"/jobs"}
                className="px-3 py-1.5 rounded-full bg-primary/10 active:bg-primary/20"
              >
                <Text className="text-xs font-semibold text-primary">
                  See All
                </Text>
              </PressableLink>
            </View>
          </View>
        }
        data={data?.data || []}
        renderItem={({ item }) => (
          <>
            <AdminJobsItem item={item} />
          </>
        )}
        keyExtractor={(item) => String(item.id)}
        ListFooterComponent={<View className="mb-48"></View>}
        // scrollEnabled={false}
      />
    </View>
  );
}
function StatsGrid() {
  const router = useRouter();

  const { data } = useQuery(_trpc.jobs.adminAnalytics.queryOptions({}));
  return (
    <View className="flex-row flex-wrap gap-4 mb-8">
      {/* Pending Card */}
      <View className="flex-1 min-w-[45%] bg-card p-4 rounded-2xl border border-border shadow-sm justify-between h-32 relative overflow-hidden">
        <View className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-accent/10 blur-xl" />
        <View className="flex-row items-center gap-2 z-10">
          <View className="h-8 w-8 rounded-lg bg-accent/20 items-center justify-center">
            <Icon
              name="Hourglass"
              className="text-accent-foreground"
              size={18}
            />
          </View>
          <Text className="text-xs font-semibold text-muted-foreground">
            Approved
          </Text>
        </View>
        <View className="z-10">
          <Text className="text-3xl font-bold text-foreground">
            {data?.approvedThisMonth}
          </Text>
          <Text className="text-xs text-muted-foreground mt-1">
            approved this month
          </Text>
        </View>
      </View>

      {/* Approvals Card */}
      <View className="flex-1 min-w-[45%] bg-card p-4 rounded-2xl border border-border shadow-sm justify-between h-32 relative overflow-hidden">
        <View className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/10 blur-xl" />
        <View className="flex-row items-center gap-2 z-10">
          <View className="h-8 w-8 rounded-lg bg-primary/20 items-center justify-center">
            <Icon name="ClipboardCheck" className="text-primary" size={18} />
          </View>
          <Text className="text-xs font-semibold text-muted-foreground">
            Approvals
          </Text>
        </View>
        <View className="z-10">
          <Text className="text-3xl font-bold text-foreground">
            {data?.jobsPendingApproval}
          </Text>
          <Text className="text-xs text-muted-foreground mt-1">
            Pending Approval
          </Text>
        </View>
      </View>

      {/* Active Jobs Summary */}
      <View className="w-full bg-primary rounded-2xl p-5 shadow-sm flex-row items-center justify-between relative overflow-hidden">
        <View className="absolute -right-6 -bottom-6 h-32 w-32 rounded-full bg-background/10 blur-2xl" />
        <View className="z-10 gap-1">
          <View className="flex-row items-center gap-2 mb-2">
            <Icon
              name="HardHat"
              className="text-primary-foreground/80"
              size={20}
            />
            <Text className="text-sm font-medium text-primary-foreground/90">
              Active Jobs Summary
            </Text>
          </View>
          <Text className="text-4xl font-bold text-primary-foreground">
            {data?.jobsInProgress}
          </Text>
          <Text className="text-xs text-primary-foreground/60">
            Jobs currently in progress
          </Text>
        </View>
        {/* Simple Bar Chart Visual */}
        <View className="flex-row gap-1 items-end h-12 z-10">
          <View className="w-1.5 bg-primary-foreground/20 h-[40%] rounded-t-sm" />
          <View className="w-1.5 bg-primary-foreground/40 h-[70%] rounded-t-sm" />
          <View className="w-1.5 bg-primary-foreground/30 h-[50%] rounded-t-sm" />
          <View className="w-1.5 bg-primary-foreground/60 h-[85%] rounded-t-sm" />
          <View className="w-1.5 bg-primary-foreground h-full rounded-t-sm shadow-sm" />
        </View>
      </View>

      {/* Assign New Job Button */}

      <AssignButton />
    </View>
  );
}
function AssignButton() {
  return (
    <PressableLink
      href={"/assign"}
      className="w-full relative overflow-hidden rounded-2xl bg-secondary active:bg-secondary/90 border border-border p-5 shadow-sm flex-row items-center justify-between"
    >
      <View className="absolute right-0 top-0 h-32 w-32 bg-primary/5 rounded-full -mr-10 -mt-10 blur-2xl" />
      <View className="z-10">
        <Text className="text-lg font-bold text-secondary-foreground leading-tight">
          Assign New Job
        </Text>
        <Text className="text-muted-foreground text-xs mt-1">
          Dispatch contractors to a new site
        </Text>
      </View>
      <View className="z-10 h-10 w-10 rounded-full bg-background/50 items-center justify-center">
        <Icon name="Plus" className="text-foreground" size={24} />
      </View>
    </PressableLink>
  );
}
function Header() {
  return (
    <HeaderContainer>
      <View className="relative">
        <View className="h-11 w-11 rounded-full bg-muted items-center justify-center border-2 border-card shadow-sm overflow-hidden">
          <Text className="text-lg font-bold text-muted-foreground">AO</Text>
        </View>
        <View className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-primary border-2 border-background" />
      </View>
      <Titles.HeaderTitle headline="Dashboard" title="Admin Overview" />

      <View className="flex-1" />
      <PressableLink href={"/settings"}>
        <Icon name="Settings" className="size-20" />
      </PressableLink>
    </HeaderContainer>
  );
}

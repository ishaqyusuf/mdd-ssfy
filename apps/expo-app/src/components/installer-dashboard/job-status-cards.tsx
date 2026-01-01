import { ScrollView, View, Text } from "react-native";
import { Icon, IconProps } from "../ui/icon";
import { useQuery } from "@tanstack/react-query";
import { _trpc } from "../static-trpc";

export function JobStatusCards() {
  const { data } = useQuery(_trpc.jobs.getJobAnalytics.queryOptions({}));
  // if(isPending || )
  const { completed, inProgress, paid, pendingPayments } = data || {};

  return (
    <>
      <View className="flex-row items-center justify-between px-5 mb-4">
        <Text className="text-lg font-bold text-foreground">Job Status</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-5 pb-4 gap-3"
      >
        <StatusCard
          icon="Clock"
          count={String(pendingPayments)}
          label="Pending"
          colorClass="bg-primary/10"
          iconColorClass="text-destructive"
        />
        <StatusCard
          icon="Wrench"
          count={String(inProgress)}
          label="In Progress"
          colorClass="bg-primary/10"
          iconColorClass="text-primary"
        />
        <StatusCard
          icon="CircleCheck"
          count={String(completed)}
          label="Completed"
          colorClass="bg-primary/10"
          iconColorClass="text-primary"
        />
        <StatusCard
          icon="CircleCheck"
          count={String(paid)}
          label="Paid"
          colorClass="bg-primary/10"
          iconColorClass="text-primary"
        />
      </ScrollView>
    </>
  );
}

const StatusCard = ({
  icon,
  count,
  label,
  colorClass,
  iconColorClass,
}: {
  icon: IconProps["name"];
  count: string;
  label: string;
  colorClass: string;
  iconColorClass: string;
}) => (
  <View className="snap-start min-w-40 bg-card p-4 rounded-3xl border border-border flex flex-col gap-3">
    <View
      className={`size-10 rounded-full ${colorClass} flex items-center justify-center`}
    >
      <Icon name={icon} className={iconColorClass} />
    </View>
    <View>
      <Text className="text-2xl font-bold text-foreground">{count}</Text>
      <Text className="text-sm text-muted-foreground font-medium">{label}</Text>
    </View>
  </View>
);

import { BackBtn } from "@/components/back-btn";
import { JobActivityHistory } from "@/components/job-activity-history";
import { JobOverviewActions } from "@/components/job-overview-actions";
import { SafeArea } from "@/components/safe-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useJobTaskList } from "@/hooks/use-job-task-list";
import {
  JobOverviewProps,
  JobProvider,
  useCreateJobContext,
  useJobContext,
} from "@/hooks/use-job";
import { formatMoney } from "@gnd/utils";
import { formatDate } from "@gnd/utils/dayjs";
import { ScrollView, Text, View } from "react-native";

function Header() {
  const { job } = useJobContext();
  return (
    <View className="px-4 pb-2 pt-1">
      <View className="rounded-[28px] border border-border bg-white/95 p-4">
        <View className="mb-3 flex-row items-center gap-3">
          <BackBtn />
          <View className="flex-1">
            <Text className="text-[11px] uppercase tracking-[1.2px] text-muted-foreground">
              Job Overview V2
            </Text>
            <Text className="text-xl font-black text-foreground">{job?.title || "Job"}</Text>
            <Text className="text-xs text-muted-foreground">Created {formatDate(job?.createdAt)}</Text>
          </View>
          <View className="rounded-full bg-black px-3 py-1">
            <Text className="text-[10px] uppercase text-white">{job?.status}</Text>
          </View>
        </View>
        <Text className="text-xs font-mono text-muted-foreground">#{job?.jobId || job?.id}</Text>
      </View>
    </View>
  );
}

function InfoGrid() {
  const { job } = useJobContext();
  return (
    <View className="gap-3">
      <View className="rounded-3xl border border-border bg-white/95 p-4">
        <Text className="text-[11px] uppercase tracking-[1px] text-muted-foreground">Project & Builder</Text>
        <Text className="text-base font-black text-foreground">{job?.project?.title || job?.title}</Text>
        <Text className="text-sm text-muted-foreground">{job?.project?.builder?.name || "Unknown builder"}</Text>
      </View>

      <View className="rounded-3xl border border-border bg-white/95 p-4">
        <Text className="text-[11px] uppercase tracking-[1px] text-muted-foreground">Location</Text>
        <Text className="text-base font-black text-foreground">{job?.home?.modelName || "Custom"}</Text>
        <Text className="text-sm text-muted-foreground">{job?.home?.lotBlock || job?.subtitle}</Text>
      </View>

      <View className="rounded-3xl border border-border bg-white/95 p-4">
        <Text className="text-[11px] uppercase tracking-[1px] text-muted-foreground">Assigned Contractor</Text>
        <Text className="text-base font-black text-foreground">{job?.user?.name || "Unassigned"}</Text>
      </View>
    </View>
  );
}

function JobScopeCard() {
  const { job } = useJobContext();
  const { tasks } = useJobTaskList(job?.meta?.costData || {});

  return (
    <View className="rounded-3xl border border-border bg-white/95 p-4">
      <Text className="mb-3 text-[11px] uppercase tracking-[1px] text-muted-foreground">Job Scope</Text>
      {tasks?.length ? (
        tasks.map((task, index) => (
          <View key={index} className="mb-2 flex-row items-start justify-between rounded-2xl bg-background p-3">
            <View className="flex-1 pr-3">
              <Text className="text-sm font-bold text-foreground">{task.title}</Text>
              <Text className="text-xs text-muted-foreground">{task.qty} x ${task.cost}</Text>
            </View>
            <Text className="text-sm font-bold text-foreground">${formatMoney(task.totalCost)}</Text>
          </View>
        ))
      ) : (
        <Text className="text-sm text-muted-foreground">No task breakdown available.</Text>
      )}

      {!job?.meta?.additional_cost ? null : (
        <View className="mt-2 flex-row items-center justify-between rounded-2xl border border-dashed border-border p-3">
          <Text className="text-sm text-foreground">Additional Cost</Text>
          <Text className="text-sm font-bold text-foreground">${formatMoney(job.meta.additional_cost)}</Text>
        </View>
      )}
    </View>
  );
}

function FinancialCard() {
  const { job } = useJobContext();

  return (
    <View className="rounded-3xl border border-border bg-black p-5">
      <Text className="text-[11px] uppercase tracking-[1px] text-white/70">Financial Summary</Text>
      <Text className="mt-1 text-3xl font-black text-white">${formatMoney(job?.amount || 0)}</Text>
      <Text className="mt-2 text-xs text-white/70">
        Payment Batch: {job?.payment?.id ? `#${job.payment.id}` : "Not batched"}
      </Text>
    </View>
  );
}

function Content() {
  const { isPending, job } = useJobContext();

  if (isPending || !job) {
    return (
      <View className="gap-3 px-4 pt-2">
        <Skeleton className="h-28 rounded-3xl" />
        <Skeleton className="h-40 rounded-3xl" />
        <Skeleton className="h-56 rounded-3xl" />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerClassName="gap-3 px-4 pb-32"
      showsVerticalScrollIndicator={false}
    >
      <InfoGrid />
      <JobScopeCard />
      <FinancialCard />
      <View className="rounded-3xl border border-border bg-white/95 p-4">
        <Text className="mb-2 text-[11px] uppercase tracking-[1px] text-muted-foreground">Description</Text>
        <Text className="text-sm text-foreground">{job?.description || "No description"}</Text>
      </View>
      <JobActivityHistory jobId={job.id} />
      <JobOverviewActions />
    </ScrollView>
  );
}

export default function JobOverviewV2Screen(props: JobOverviewProps) {
  return (
    <JobProvider value={useCreateJobContext(props)}>
      <SafeArea>
        <View className="flex-1 bg-background">
          <Header />
          <Content />
        </View>
      </SafeArea>
    </JobProvider>
  );
}

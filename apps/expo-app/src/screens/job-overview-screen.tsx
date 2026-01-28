import { AdminJobReviewCard } from "@/components/admin-job-review-card";
import { BackBtn } from "@/components/back-btn";
import { JobFooterContractor } from "@/components/job-footer-contractor";
import { SafeArea } from "@/components/safe-area";
import { Status } from "@/components/status";
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
import { formatDate } from "@gnd/utils/dayjs";
import { Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

// All components are in this file as per the instructions.

function Header() {
  // const { isPending, job } = useJobContext();
  return (
    <View className="sticky top-0 z-30  px-5 py-4 flex-row items-center gap-4">
      <BackBtn />
      <Text className="text-lg font-bold flex-1 text-center text-foreground pr-11">
        Job Overview
      </Text>
    </View>
  );
}

function StatusBadge() {
  const { job } = useJobContext();
  return (
    <View className="flex-row items-center gap-2 mb-2">
      <Status value={job?.status} />
      {/* <View
        style={{
          backgroundColor: getColorFromName(job?.status!),
          borderRadius: 999,
        }}
      >
        <View className="flex-row items-center gap-1 px-3 py-1 rounded-full border border-accent">
          <View className="h-1.5 w-1.5 rounded-full bg-accent" />
          <Text className="text-xs font-bold uppercase tracking-wide">
            {job?.status}
          </Text>
        </View>
      </View> */}
      <Text className="text-xs text-muted-foreground font-medium">
        #JB-{job!.id}
      </Text>
      <View className="flex-1" />
      {job?.isCustom && <Status value={"Custom"} />}
    </View>
  );
}

function InfoCard() {
  const { job } = useJobContext();
  return (
    <View className="bg-card p-5 rounded-4xl border border-border relative overflow-hidden">
      <View className="relative z-10 flex flex-col gap-5">
        <View className="flex-row items-start gap-4">
          <View className="h-12 w-12 rounded-2xl bg-background flex items-center justify-center shrink-0 border border-border">
            <Icon name="Building2" className="text-muted-foreground" />
          </View>
          <View>
            <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
              Project
            </Text>
            <Text className="text-lg font-bold text-foreground leading-tight">
              {job?.title}
            </Text>
            <Text className="text-sm text-muted-foreground">
              {job?.project?.builder?.name}
            </Text>
          </View>
        </View>
        <View className="w-full h-px bg-border" />
        <View className="flex-row items-start gap-4">
          <View className="h-12 w-12 rounded-2xl bg-background flex items-center justify-center shrink-0 border border-border">
            <Icon name="DoorOpen" className="text-muted-foreground" />
          </View>
          <View>
            <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
              Unit
            </Text>
            <Text className="text-lg uppercase font-bold text-foreground leading-tight">
              {job?.subtitle}
            </Text>
            <Text className="text-sm uppercase text-muted-foreground">
              {/* Standard 2BR Layout */}
              {job?.home?.modelName}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function TasksAndChargesCard() {
  const { job } = useJobContext();
  const { costData } = job?.meta || {};
  const { tasks } = useJobTaskList(costData);
  return (
    <View className="bg-card rounded-4xl overflow-hidden border border-border">
      <View className="p-6 pb-2 border-b border-border flex-row justify-between items-center bg-background/50">
        <Text className="text-lg font-bold text-foreground">
          Tasks & Charges
        </Text>
        <Icon name="ReceiptText" className="text-muted-foreground" />
      </View>
      <View className="p-6 flex flex-col gap-6">
        {[
          ...(tasks || []),
          !job?.meta?.additional_cost || {
            title: "Additional Cost",
            reason: job?.meta?.additionalCostReason || "-",
            cost: job?.meta?.additional_cost,
            uid: "extra",
          },
        ]
          ?.filter(Boolean)
          ?.filter((a) => a?.qty)
          .map((task, tId) => (
            <View
              key={tId}
              className="flex-row justify-between items-start gap-4"
            >
              <View className="flex-1">
                <Text
                  className={cn(
                    "font-bold text-foreground text-sm",
                    !task.reason || "text-warn",
                  )}
                >
                  {task.title}
                </Text>
                <Text className="text-xs text-muted-foreground mt-1">
                  {task.reason || `${task.qty} units × $${task?.unitCost}`}
                </Text>
              </View>
              <Text
                className={cn(
                  "font-bold text-foreground",
                  !task.reason || "text-warn",
                )}
              >
                ${formatMoney(task?.cost)}
              </Text>
            </View>
          ))}

        {/* This section uses 'destructive' tokens to represent the warning state */}

        <View className="h-px bg-border my-1" />
        <View className="flex-row justify-between items-end">
          <Text className="text-muted-foreground font-medium pb-2 text-sm">
            Total Amount
          </Text>
          <Text className="text-[32px] font-bold text-foreground tracking-tight leading-none">
            ${formatMoney(job?.amount)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const TeamMember = ({
  name,
  role,
  isLead,
}: {
  name: string;
  role: string;
  isLead?: boolean;
}) => {
  if (!name) return null;
  return (
    <View className="flex-row items-center gap-3 bg-card p-2 pr-5 rounded-full border border-border shrink-0">
      <View className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
        <Text className="text-muted-foreground font-bold text-sm">
          {name.charAt(0)}
        </Text>
      </View>
      <View>
        <Text className="text-sm font-bold leading-none text-foreground">
          {name}
        </Text>
        <Text
          className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${
            isLead ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {role}
        </Text>
      </View>
    </View>
  );
};

const NotesCard = () => {
  const { job } = useJobContext();
  return (
    // Using 'secondary' for the notes card to differentiate it semantically.
    <View className="bg-secondary p-5 rounded-4xl border border-border mb-8 relative">
      <View className="absolute top-5 right-5 text-foreground -rotate-12">
        <Icon name="Pin" className="size-20" size={20} />
      </View>
      <Text className="text-sm font-bold text-secondary-foreground flex-row items-center gap-2 mb-2">
        <Icon
          name="StickyNote"
          size={20}
          className="text-secondary-foreground"
        />
        Notes
      </Text>
      <Text className="text-sm text-secondary-foreground italic leading-relaxed pr-6">
        {job?.note || "No Note"}
      </Text>
    </View>
  );
};

export default function JobOverviewScreen(props: JobOverviewProps) {
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
      {/* <View className="flex-1 bg-background"> */}
      <Header />
      <ScrollView contentContainerClassName="p-5 pt-4 gap-6 pb-32">
        <View>
          <StatusBadge />
          <Text className="text-3xl font-bold leading-tight mb-1 text-foreground">
            {job?.title}
          </Text>
          <Text className="text-muted-foreground font-medium text-sm uppercase">
            Created on {formatDate(job?.createdAt)}
          </Text>
        </View>

        <InfoCard />

        <View>
          <Text className="text-lg font-bold mb-3 text-foreground">
            Description
          </Text>
          <Text className="text-muted-foreground leading-relaxed text-sm">
            {job?.description || `${[job?.title, job?.subtitle]?.join("\n")}`}
          </Text>
        </View>

        <TasksAndChargesCard />
        <View>
          <Text className="text-lg font-bold mb-3 text-foreground">
            Assigned Team
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-row -mx-5 px-5"
            contentContainerClassName="gap-3 pb-2"
          >
            <TeamMember name={job?.user?.name!} role="Lead" isLead />
            {!job?.coWorker || (
              <TeamMember name={job?.coWorker?.name!} role="Co-Worker" />
            )}
          </ScrollView>
        </View>
        <NotesCard />
        <AdminJobReviewCard />
      </ScrollView>
      <JobFooterContractor />
      {/* <Debug>
        <ActionBar />
      </Debug> */}
      {/* </View> */}
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

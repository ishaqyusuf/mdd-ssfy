import { BlurView } from "@/components/blur-view";
import { SafeArea } from "@/components/safe-area";
import { _trpc } from "@/components/static-trpc";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useJobTaskList } from "@/hooks/use-job-task-list";
import { formatMoney } from "@gnd/utils";
import { formatDate } from "@gnd/utils/dayjs";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { createContext, useContext } from "react";
import { ScrollView, Text, View } from "react-native";

// All components are in this file as per the instructions.

function Header() {
  const { isPending, job } = useJobContext();
  return (
    <View className="sticky top-0 z-30 bg-background px-5 py-4 flex-row items-center gap-4">
      <View className="h-11 w-11 rounded-full bg-card border border-border flex items-center justify-center">
        <Icon name="ArrowLeft" className="text-foreground" />
      </View>
      <Text className="text-lg font-bold flex-1 text-center text-foreground pr-11">
        Job Overview
      </Text>
    </View>
  );
}

function StatusBadge() {
  const { isPending, job } = useJobContext();
  return (
    <View className="flex-row items-center gap-2 mb-2">
      <View className="flex-row items-center gap-1 px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
        <View className="h-1.5 w-1.5 rounded-full bg-accent" />
        <Text className="text-accent text-xs font-bold uppercase tracking-wide">
          {job?.status}
        </Text>
      </View>
      <Text className="text-xs text-muted-foreground font-medium">
        #JB-{job.id}
      </Text>
    </View>
  );
}

function InfoCard() {
  const { isPending, job } = useJobContext();
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
            <Text className="text-lg font-bold text-foreground leading-tight">
              {job?.subtitle}
            </Text>
            <Text className="text-sm text-muted-foreground">
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
  const { taskCost, addon, costData } = job?.meta || {};
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
        {tasks?.map((task) => (
          <View
            key={task.uid}
            className="flex-row justify-between items-start gap-4"
          >
            <View className="flex-1">
              <Text className="font-bold text-foreground text-sm">
                {task.title}
              </Text>
              <Text className="text-xs text-muted-foreground mt-1">
                5 units × $120.00
              </Text>
            </View>
            <Text className="font-bold text-foreground">
              ${formatMoney(task?.totalCost)}
            </Text>
          </View>
        ))}

        {/* This section uses 'destructive' tokens to represent the warning state */}
        <View className="bg-destructive -mx-2 p-3 rounded-xl border border-destructive/20">
          <View className="flex-row justify-between items-start gap-4">
            <View className="flex-1">
              <View className="flex-row items-center gap-1.5 mb-1">
                <Icon
                  name="TriangleAlert"
                  className="text-destructive text-[18px]"
                />
                <Text className="font-bold text-destructive text-sm">
                  Extra: Wall Reinforcement
                </Text>
              </View>
              <Text className="text-xs text-destructive/70 leading-snug">
                Found dry rot behind sink area, required extra backing.
              </Text>
            </View>
            <Text className="font-bold text-destructive">$150.00</Text>
          </View>
        </View>
        <View className="h-px bg-border my-1" />
        <View className="flex-row justify-between items-end">
          <Text className="text-muted-foreground font-medium pb-2 text-sm">
            Total Amount
          </Text>
          <Text className="text-[32px] font-bold text-foreground tracking-tight leading-none">
            $1,240.00
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
}) => (
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

const NotesCard = () => (
  // Using 'secondary' for the notes card to differentiate it semantically.
  <View className="bg-secondary p-5 rounded-4xl border border-border mb-8 relative">
    <View className="absolute top-5 right-5 text-foreground -rotate-12">
      <Icon name="Pin" className="size-20" size={20} />
    </View>
    <Text className="text-sm font-bold text-secondary-foreground flex-row items-center gap-2 mb-2">
      <Icon name="StickyNote" size={20} className="text-secondary-foreground" />
      Notes
    </Text>
    <Text className="text-sm text-secondary-foreground italic leading-relaxed pr-6">
      Please make sure to cover the floors in the hallway before bringing in
      tools. The client is very particular about scratches.
    </Text>
  </View>
);

const ActionBar = () => (
  <View className="absolute bottom-0 left-0 w-full bg-card/90 border-t border-border z-40">
    <BlurView className="">
      <View className="px-5 pb-8 pt-4">
        <View className="flex-row gap-4">
          <View className="flex-1 h-14 rounded-full border border-border flex items-center justify-center flex-row gap-2">
            <Icon name="FilePenLine" className="text-foreground text-[20px]" />
            <Text className="font-bold text-foreground">Edit Job</Text>
          </View>
          <View className="flex-[1.5] h-14 rounded-full bg-primary flex items-center justify-center flex-row gap-2">
            <Icon
              name="CircleCheck"
              className="text-primary-foreground text-[20px]"
            />
            <Text className="font-bold text-primary-foreground">
              Mark Complete
            </Text>
          </View>
        </View>
      </View>
    </BlurView>
  </View>
);

export default function JobOverviewScreen() {
  return (
    <JobProvider value={useCreateJobContext()}>
      <Content />
    </JobProvider>
  );
}
function Content() {
  const { isPending, job } = useJobContext();
  if (isPending || !job) return <SkeletonView />;
  return (
    <SafeArea>
      <View className="flex-1 bg-background">
        <Header />
        <ScrollView contentContainerClassName="p-5 pt-4 gap-6 pb-32">
          <View>
            <StatusBadge />
            <Text className="text-3xl font-bold leading-tight mb-1 text-foreground">
              {job?.title}
            </Text>
            <Text className="text-muted-foreground font-medium text-sm">
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
              <TeamMember name="Admin" role="Lead" isLead />
              <TeamMember name="Admin" role="Apprentice" />
            </ScrollView>
          </View>

          <NotesCard />
        </ScrollView>
        <ActionBar />
      </View>
    </SafeArea>
  );
}

function SkeletonView() {
  return (
    <SafeArea>
      <View className="flex-1 bg-background">
        {/* Header */}
        <View className="px-5 pt-4 pb-3">
          <Skeleton className="h-6 w-24 rounded-md" />
        </View>

        <ScrollView contentContainerClassName="p-5 pt-4 gap-6 pb-32">
          {/* Title block */}
          <View className="gap-2">
            <Skeleton className="h-6 w-20 rounded-full" /> {/* StatusBadge */}
            <Skeleton className="h-9 w-3/4 rounded-md" /> {/* Title */}
            <Skeleton className="h-4 w-40 rounded-md" /> {/* Date */}
          </View>

          {/* jobId text */}
          <Skeleton className="h-4 w-32 rounded-md" />

          {/* InfoCard */}
          <Skeleton className="h-24 w-full rounded-xl" />

          {/* Description */}
          <View className="gap-3">
            <Skeleton className="h-5 w-32 rounded-md" />
            <View className="gap-2">
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-4/5 rounded-md" />
            </View>
          </View>

          {/* TasksAndChargesCard */}
          <Skeleton className="h-40 w-full rounded-xl" />

          {/* Assigned Team */}
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

          {/* NotesCard */}
          <Skeleton className="h-32 w-full rounded-xl" />
        </ScrollView>

        {/* ActionBar */}
        <View className="absolute bottom-0 left-0 right-0 p-5 bg-background">
          <Skeleton className="h-12 w-full rounded-xl" />
        </View>
      </View>
    </SafeArea>
  );
}

type JobContextProps = ReturnType<typeof useCreateJobContext>;
export const JobContext = createContext<JobContextProps>(undefined as any);
export const JobProvider = JobContext.Provider;
export const useCreateJobContext = () => {
  const { jobId } = useLocalSearchParams();
  const { data, isPending } = useQuery(
    _trpc.jobs.getJobs.queryOptions({
      jobId: Number(jobId),
    })
  );
  const job = data?.data?.[0];
  return {
    isPending,
    job,
  };
};
export const useJobContext = () => {
  const context = useContext(JobContext);
  if (context === undefined) {
    throw new Error("useJobContext must be used within a JobProvider");
  }
  return context;
};

import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import React, { useEffect, useMemo } from "react";
import { TouchableOpacity, View } from "react-native";

import { _trpc } from "@/components/static-trpc";
import { Modal, useModal } from "@/components/ui/modal";
import { Text } from "@/components/ui/text";
import { useJobOverviewStore } from "@/stores/use-job-overview-store";
import { MaterialIcons } from "@expo/vector-icons";

export function JobOverviewModal() {
  const { job } = useJobOverviewStore();
  const { closeModal } = useJobOverviewStore((s) => s.actions);
  const { ref, present, dismiss } = useModal();

  useEffect(() => {
    if (job) {
      present();
    } else {
      dismiss();
    }
  }, [job, present, dismiss]);

  const snapPoints = useMemo(() => ["90%"], []);
  const { data: costData } = useQuery(
    _trpc.jobs.getInstallCosts.queryOptions({}),
  );

  if (!job) {
    return null;
  }

  return (
    <Modal
      ref={ref}
      snapPoints={snapPoints}
      title={job.title}
      onDismiss={closeModal}
    >
      <Content costData={costData} />
    </Modal>
  );
}

const StatusBadge = ({ status }: { status: string }) => {
  const statusStyles = useMemo(() => {
    const s = status.toLowerCase();
    if (s === "paid" || s === "completed") {
      return {
        container: "bg-[--color-success]/10",
        text: "text-[--color-success]",
      };
    }
    if (s === "unpaid" || s === "pending submission") {
      return {
        container: "bg-[--color-warning]/10",
        text: "text-[--color-warning-dark]",
      };
    }
    if (s === "cancelled" || s === "declined") {
      return {
        container: "bg-[--color-danger]/10",
        text: "text-[--color-danger-dark]",
      };
    }
    return {
      container: "bg-muted",
      text: "text-muted-foreground",
    };
  }, [status]);

  return (
    <View
      className={`self-start rounded-full px-3 py-1 ${statusStyles.container}`}
    >
      <Text className={`text-xs font-bold ${statusStyles.text}`}>{status}</Text>
    </View>
  );
};

const InfoBlock = ({
  icon,
  label,
  value,
  children,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  label: string;
  value?: string | null;
  children?: React.ReactNode;
}) => {
  if (!value && !children) return null;
  return (
    <View className="flex-row items-start py-3">
      <MaterialIcons
        name={icon}
        size={22}
        className="text-muted-foreground mt-0.5"
      />
      <View className="ml-4 flex-1">
        <Text className="text-sm text-muted-foreground">{label}</Text>
        {value && (
          <Text className="text-base text-foreground font-medium mt-0.5">
            {value}
          </Text>
        )}
        {children}
      </View>
    </View>
  );
};

const TaskItem = ({
  title,
  qty,
  totalCost,
}: {
  title: string;
  qty: number;
  totalCost: number;
}) => {
  return (
    <View className="flex-row items-center bg-background p-3 rounded-lg mb-2">
      <View className="p-3 bg-muted rounded-lg">
        <MaterialIcons
          name="construction"
          size={20}
          className="text-muted-foreground"
        />
      </View>
      <View className="flex-1 mx-4">
        <Text className="text-base font-medium text-foreground">{title}</Text>
        <Text className="text-sm text-muted-foreground mt-0.5">
          Quantity: {qty}
        </Text>
      </View>
      <Text className="text-base font-bold text-foreground">
        ${totalCost.toFixed(2)}
      </Text>
    </View>
  );
};

function Content({ costData }: { costData: any }) {
  const { job } = useJobOverviewStore();

  const tasks = useMemo(() => {
    if (!costData?.data || !job?.meta?.costData) return [];
    return (
      costData.data?.list
        ?.filter((c: any) => (job.meta?.costData?.[c.uid]?.qty || 0) > 0)
        .map((c: any) => {
          const qty = job.meta.costData?.[c.uid]?.qty || 0;
          const cost = job.meta.costData?.[c.uid]?.cost || 0;
          return {
            uid: c.uid,
            title: c.title,
            qty,
            totalCost: qty * cost,
          };
        }) || []
    );
  }, [costData, job?.meta]);

  if (!job) return null;

  const paymentStatus = job.payment?.length > 0 ? "Paid" : "Unpaid";
  const totalCost =
    job.amount != null ? `${job.amount.toFixed(2)}` : "N/A";
  const additionalCost =
    job.meta?.additionalCost != null
      ? `${job.meta.additionalCost.toFixed(2)}`
      : "N/A";
  const addonCost =
    job.meta?.addonCost != null ? `${job.meta.addonCost.toFixed(2)}` : "N/A";

  return (
    <>
      <BottomSheetScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
      >
        {/* Header */}
        <View className="pt-4 pb-6">
          <Text className="text-2xl font-extrabold text-foreground">
            {job.title}
          </Text>
          <View className="flex-row items-center mt-2 space-x-2">
            <StatusBadge status={job.status} />
            {job.createdAt && (
              <Text className="text-sm text-muted-foreground">
                Created on {format(new Date(job.createdAt), "MMM d, yyyy")}
              </Text>
            )}
          </View>
        </View>

        {/* Details */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-foreground mb-2">
            Details
          </Text>
          <View className="bg-card rounded-2xl px-4 divide-y divide-border">
            <InfoBlock
              icon="person-outline"
              label="Installer"
              value={job.user?.name}
            />
            <InfoBlock
              icon="business"
              label="Project"
              value={job.project?.title}
            />
            <InfoBlock
              icon="home-work"
              label="Unit"
              value={
                job.home?.lotBlock && job.home?.modelName
                  ? `${job.home.lotBlock} / ${job.home.modelName}`
                  : job.home?.lotBlock || job.home?.modelName
              }
            />
            <InfoBlock
              icon="construction"
              label="Job Type"
              value={job.meta?.jobType}
            />
          </View>
        </View>

        {/* Financials */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-foreground mb-2">
            Financials
          </Text>
          <View className="bg-card rounded-2xl p-4">
            <InfoBlock icon="payment" label="Payment Status">
              <View className="mt-1">
                <StatusBadge status={paymentStatus} />
              </View>
            </InfoBlock>
            <View className="border-t border-border my-3" />
            <View className="space-y-2">
              <View className="flex-row justify-between">
                <Text className="text-muted-foreground">Addon Cost</Text>
                <Text className="font-medium text-foreground">{addonCost}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-muted-foreground">Additional Cost</Text>
                <Text className="font-medium text-foreground">
                  {additionalCost}
                </Text>
              </View>
            </View>
            <View className="mt-4 bg-[--color-primary-medium-blue]/10 dark:bg-sky-900/50 p-4 rounded-xl">
              <View className="flex-row justify-between items-center">
                <Text className="text-lg font-bold text-[--color-primary-medium-blue] dark:text-sky-400">
                  Total Cost
                </Text>
                <Text className="text-2xl font-extrabold text-[--color-primary-medium-blue] dark:text-sky-400">
                  {totalCost}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Tasks */}
        {tasks.length > 0 && (
          <View className="mb-6">
            <Text className="text-lg font-bold text-foreground mb-2">
              Tasks
            </Text>
            <View>
              {tasks.map((task) => (
                <TaskItem key={task.uid} {...task} />
              ))}
            </View>
          </View>
        )}

        {/* Comments */}
        {(job.adminNote || job.description) && (
          <View className="mb-6">
            <Text className="text-lg font-bold text-foreground mb-2">
              Comments
            </Text>
            <View className="bg-card rounded-2xl p-4">
              <Text className="text-foreground/80 italic">
                {job.adminNote || job.description}
              </Text>
            </View>
          </View>
        )}
      </BottomSheetScrollView>

      {/* Footer Actions */}
      <View className="absolute bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-sm border-t border-border">
        <View className="flex-row space-x-3">
          <TouchableOpacity className="flex-1 bg-muted p-4 rounded-xl items-center justify-center flex-row">
            <MaterialIcons
              name="edit"
              size={20}
              className="text-[--color-primary-light-blue]"
            />
            <Text className="text-[--color-primary-light-blue] font-bold text-base ml-2">
              Edit
            </Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 bg-destructive/20 p-4 rounded-xl items-center justify-center flex-row">
            <MaterialIcons
              name="delete-outline"
              size={20}
              className="text-destructive"
            />
            <Text className="text-destructive font-bold text-base ml-2">
              Delete
            </Text>
          </TouchableOpacity>
        </View>
        {job.status === "Pending Submission" && (
          <TouchableOpacity className="bg-[--color-primary-medium-blue] p-4 rounded-xl items-center shadow-sm mt-3 flex-row justify-center">
            <MaterialIcons
              name="check-circle-outline"
              size={22}
              color="white"
            />
            <Text className="text-white font-bold text-base ml-2">
              Submit Job
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );
}

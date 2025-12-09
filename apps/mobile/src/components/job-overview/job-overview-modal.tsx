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
import { useColorScheme } from "nativewind";

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

const InfoBlock = ({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  label: string;
  value?: string | null;
}) => {
  const { colorScheme } = useColorScheme();
  if (!value) return null;
  return (
    <View className="flex-row items-start">
      <MaterialIcons
        name={icon}
        size={20}
        color={colorScheme === "dark" ? "#9CA3AF" : "#6B7280"}
        className="mt-0.5"
      />
      <View className="ml-4 flex-1">
        <Text className="text-sm text-gray-500 dark:text-gray-400">
          {label}
        </Text>
        <Text className="text-base text-gray-800 dark:text-gray-200 font-medium mt-0.5">
          {value}
        </Text>
      </View>
    </View>
  );
};

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <View className="bg-white dark:bg-gray-800/50 p-4 rounded-2xl mb-4">
    <Text className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
      {title}
    </Text>
    {children}
  </View>
);

const TaskItem = ({
  title,
  qty,
  totalCost,
}: {
  title: string;
  qty: number;
  totalCost: number;
}) => {
  const { colorScheme } = useColorScheme();
  return (
    <View className="flex-row items-center bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl mb-2 border border-gray-200 dark:border-gray-700/60">
      <View className="p-2 bg-gray-200 dark:bg-gray-700 rounded-full">
        <MaterialIcons
          name="construction"
          size={20}
          color={colorScheme === "dark" ? "#9CA3AF" : "#6B7280"}
        />
      </View>
      <View className="flex-1 mx-3">
        <Text className="text-base font-medium text-gray-800 dark:text-gray-200">
          {title}
        </Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Quantity: {qty}
        </Text>
      </View>
      <Text className="text-base font-bold text-gray-900 dark:text-gray-100">
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
  const totalCost = job.amount != null ? `${job.amount.toFixed(2)}` : "N/A";
  const additionalCost =
    job.meta?.additionalCost != null
      ? `${job.meta.additionalCost.toFixed(2)}`
      : "N/A";
  const addonCost =
    job.meta?.addonCost != null ? `${job.meta.addonCost.toFixed(2)}` : "N/A";

  return (
    <BottomSheetScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
    >
      <Section title="Details">
        <View className="space-y-4">
          <InfoBlock icon="person-outline" label="Installer" value={job.user?.name} />
          <InfoBlock icon="business" label="Project" value={job.project?.title} />
          <InfoBlock
            icon="home-work"
            label="Unit"
            value={
              job.home?.lotBlock && job.home?.modelName
                ? `${job.home.lotBlock} / ${job.home.modelName}`
                : job.home?.lotBlock || job.home?.modelName
            }
          />
          <InfoBlock icon="construction" label="Job Type" value={job.meta?.jobType} />
        </View>
      </Section>

      <Section title="Status">
        <View className="space-y-4">
          <InfoBlock icon="sync" label="Job Status" value={job.status} />
          <InfoBlock
            icon="payment"
            label="Payment Status"
            value={paymentStatus}
          />
          {job.createdAt && (
            <InfoBlock
              icon="date-range"
              label="Created On"
              value={format(new Date(job.createdAt), "MMM d, yyyy")}
            />
          )}
        </View>
      </Section>

      {tasks.length > 0 && (
        <Section title="Tasks">
          <View className="space-y-2">
            {tasks.map((task) => (
              <TaskItem
                key={task.uid}
                title={task.title}
                qty={task.qty}
                totalCost={task.totalCost}
              />
            ))}
          </View>
        </Section>
      )}

      <Section title="Costs">
        <View className="space-y-3">
          <View className="flex-row justify-between">
            <Text className="text-gray-500 dark:text-gray-400">Addon Cost</Text>
            <Text className="font-medium text-gray-800 dark:text-gray-200">
              {addonCost}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-gray-500 dark:text-gray-400">
              Additional Cost
            </Text>
            <Text className="font-medium text-gray-800 dark:text-gray-200">
              {additionalCost}
            </Text>
          </View>
          <View className="border-t border-gray-200 dark:border-gray-700 my-2" />
          <View className="flex-row justify-between items-center">
            <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Total Cost
            </Text>
            <Text className="text-xl font-bold text-primary-medium-blue dark:text-sky-400">
              {totalCost}
            </Text>
          </View>
        </View>
      </Section>

      {(job.adminNote || job.description) && (
        <Section title="Comments">
          <Text className="text-gray-700 dark:text-gray-300 italic">
            {job.adminNote || job.description}
          </Text>
        </Section>
      )}

      <View className="mt-6 flex-row space-x-3">
        <TouchableOpacity className="flex-1 bg-gray-200 dark:bg-gray-700 p-4 rounded-xl items-center justify-center flex-row">
          <MaterialIcons name="edit" size={20} color="#3B82F6" />
          <Text className="text-blue-500 font-bold text-base ml-2">Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-1 bg-red-100 dark:bg-red-900/40 p-4 rounded-xl items-center justify-center flex-row">
          <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
          <Text className="text-red-500 font-bold text-base ml-2">Delete</Text>
        </TouchableOpacity>
      </View>
      {job.status === "Pending Submission" && (
        <TouchableOpacity className="bg-primary-medium-blue p-4 rounded-xl items-center shadow-sm mt-3 flex-row justify-center">
          <MaterialIcons name="check-circle-outline" size={22} color="white" />
          <Text className="text-white font-bold text-base ml-2">
            Submit Job
          </Text>
        </TouchableOpacity>
      )}
    </BottomSheetScrollView>
  );
}

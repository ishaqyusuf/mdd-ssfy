import React, { useEffect, useMemo } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { useJobOverviewStore } from "../../../stores/use-job-overview-store";
import { Text } from "@/components/ui/text";
import { Modal, useModal } from "@/components/ui/modal";
import { _trpc } from "@/components/static-trpc";
import { useQuery } from "@tanstack/react-query";

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

  const snapPoints = useMemo(() => ["85%"], []);

  if (!job) {
    return null;
  }

  return (
    <Modal
      ref={ref}
      snapPoints={snapPoints}
      title="Job Overview"
      onDismiss={closeModal}
    >
      <Content />
    </Modal>
  );
}
function Content() {
  const { job } = useJobOverviewStore();
  const { data: costData } = useQuery(
    _trpc.jobs.getInstallCosts.queryOptions({})
  );
  if (!job) return null;
  const tasks = costData?.data
    ?.filter((c) => job.meta?.costData?.[c.uid]?.qty || 0 > 0)
    ?.map((c) => ({
      uid: c.uid,
      title: c.title,
      qty: job.meta?.costData?.[c.uid]?.qty || 0,
      cost: job.meta?.costData?.[c.uid]?.cost || 0,
    }));
  const renderJobDetail = (label: string, value: string | undefined) => (
    <View className="flex-row mb-3">
      <Text className="w-1/3 text-gray-500 dark:text-gray-400 text-sm">
        {label}
      </Text>
      <Text className="w-2/3 text-gray-800 dark:text-gray-200 font-medium">
        {value}
      </Text>
    </View>
  );
  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <View className="bg-white dark:bg-gray-800/50 p-4 rounded-lg mb-4">
        {renderJobDetail("Project", job.project.name)}
        {renderJobDetail("Unit", job.unit.name)}
        {job.model && renderJobDetail("Model", job.model)}
      </View>

      <View className="bg-white dark:bg-gray-800/50 p-4 rounded-lg mb-4">
        {renderJobDetail("Job Status", job.jobStatus)}
        {renderJobDetail("Payment Status", job.paymentStatus)}
        {job.submissionDate &&
          renderJobDetail(
            "Submitted On",
            job.submissionDate.toLocaleDateString()
          )}
      </View>

      <View className="bg-white dark:bg-gray-800/50 p-4 rounded-lg">
        <Text className="text-lg font-bold mb-3 text-gray-900 dark:text-gray-100">
          Tasks
        </Text>
        {job.tasks.map((taskItem, index) => (
          <View key={index} className="flex-row justify-between mb-2">
            <Text className="text-gray-700 dark:text-gray-300 flex-1 pr-2">
              {taskItem.task.name} (x{taskItem.quantity})
            </Text>
            <Text className="text-gray-700 dark:text-gray-300">
              ${(taskItem.task.ratePerUnit * taskItem.quantity).toFixed(2)}
            </Text>
          </View>
        ))}
        <View className="border-t border-gray-200 dark:border-gray-700 my-3" />
        <View className="flex-row justify-between">
          <Text className="text-base font-bold text-gray-900 dark:text-gray-100">
            Total Install Cost
          </Text>
          <Text className="text-base font-bold text-gray-900 dark:text-gray-100">
            ${job.totalInstallCost.toFixed(2)}
          </Text>
        </View>
      </View>

      <View className="mt-8 space-y-3">
        {job.jobStatus === "Pending Submission" && (
          <TouchableOpacity className="bg-primary-medium-blue p-4 rounded-lg items-center shadow-sm">
            <Text className="text-white font-bold text-base">Submit Job</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity className="bg-red-600 p-4 rounded-lg items-center shadow-sm">
          <Text className="text-white font-bold text-base">Delete Job</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

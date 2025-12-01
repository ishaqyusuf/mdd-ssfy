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
  const { data: costData } = useQuery(
    _trpc.jobs.getInstallCosts.queryOptions({})
  );
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
      <Content costData={costData} />
    </Modal>
  );
}
function Content({ costData }) {
  const { job } = useJobOverviewStore();
  // const costData = null;

  const tasks = useMemo(() => {
    if (!costData?.data || !job?.meta?.costData) return [];
    console.log("COST DATA", costData);
    return costData.data?.list
      ?.filter((c) => (job.meta?.costData?.[c.uid]?.qty || 0) > 0)
      .map((c) => {
        const qty = job.meta.costData?.[c.uid]?.qty || 0;
        const cost = job.meta.costData?.[c.uid]?.cost || 0;
        return {
          uid: c.uid,
          title: c.title,
          qty,
          cost,
          totalCost: qty * cost,
        };
      });
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

  const renderJobDetail = (label: string, value: string | undefined | null) => (
    <View className="flex-row mb-3">
      <Text className="w-1/3 text-gray-500 dark:text-gray-400 text-sm">
        {label}
      </Text>
      <Text className="w-2/3 text-gray-800 dark:text-gray-200 font-medium">
        {value || "N/A"}
      </Text>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      {/* Basic Info */}
      <View className="bg-white dark:bg-gray-800/50 p-4 rounded-lg mb-4">
        {renderJobDetail("Installer", job.user?.name)}
        {renderJobDetail("Project", job.project?.title)}
        {renderJobDetail(
          "Unit",
          job.home?.lotBlock && job.home?.modelName
            ? `${job.home.lotBlock} / ${job.home.modelName}`
            : job.home?.lotBlock || job.home?.modelName
        )}
        {renderJobDetail("Job Type", job.meta?.jobType)}
      </View>

      {/* Status Info */}
      <View className="bg-white dark:bg-gray-800/50 p-4 rounded-lg mb-4">
        {renderJobDetail("Job Status", job.status)}
        {renderJobDetail("Payment Status", paymentStatus)}
        {job.createdAt &&
          renderJobDetail(
            "Created On",
            new Date(job.createdAt).toLocaleDateString()
          )}
      </View>

      {/* Task List */}
      <View className="bg-white dark:bg-gray-800/50 p-4 rounded-lg mb-4">
        <Text className="text-lg font-bold mb-3 text-gray-900 dark:text-gray-100">
          Tasks
        </Text>
        {tasks.length > 0 ? (
          tasks.map((taskItem) => (
            <View key={taskItem.uid} className="flex-row justify-between mb-2">
              <Text className="text-gray-700 dark:text-gray-300 flex-1 pr-2">
                {taskItem.title} (x{taskItem.qty})
              </Text>
              <Text className="text-gray-700 dark:text-gray-300">
                ${taskItem.totalCost.toFixed(2)}
              </Text>
            </View>
          ))
        ) : (
          <Text className="text-gray-500 dark:text-gray-400">
            No tasks for this job.
          </Text>
        )}
      </View>

      {/* Costs */}
      <View className="bg-white dark:bg-gray-800/50 p-4 rounded-lg mb-4">
        <Text className="text-lg font-bold mb-3 text-gray-900 dark:text-gray-100">
          Costs
        </Text>
        {renderJobDetail("Addon Cost", addonCost)}
        {renderJobDetail("Additional Cost", additionalCost)}
        <View className="border-t border-gray-200 dark:border-gray-700 my-3" />
        <View className="flex-row justify-between">
          <Text className="text-base font-bold text-gray-900 dark:text-gray-100">
            Total Cost
          </Text>
          <Text className="text-base font-bold text-gray-900 dark:text-gray-100">
            {totalCost}
          </Text>
        </View>
      </View>

      {/* Comment */}
      {(job.adminNote || job.description) && (
        <View className="bg-white dark:bg-gray-800/50 p-4 rounded-lg mb-4">
          <Text className="text-lg font-bold mb-2 text-gray-900 dark:text-gray-100">
            Comment
          </Text>
          <Text className="text-gray-700 dark:text-gray-300">
            {job.adminNote || job.description}
          </Text>
        </View>
      )}

      {/* Actions */}
      <View className="mt-8 flex-row space-x-3">
        <TouchableOpacity className="flex-1 bg-gray-200 dark:bg-gray-700 p-4 rounded-lg items-center shadow-sm">
          <Text className="text-gray-800 dark:text-gray-100 font-bold text-base">
            Edit
          </Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-1 bg-red-600 p-4 rounded-lg items-center shadow-sm">
          <Text className="text-white font-bold text-base">Delete</Text>
        </TouchableOpacity>
      </View>
      {job.status === "Pending Submission" && (
        <TouchableOpacity className="bg-primary-medium-blue p-4 rounded-lg items-center shadow-sm mt-3">
          <Text className="text-white font-bold text-base">Submit Job</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

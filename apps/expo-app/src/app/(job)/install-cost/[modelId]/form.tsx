import { BackBtn } from "@/components/back-btn";
import { SafeArea } from "@/components/safe-area";
import { InstallCostForm } from "@/components/forms/job-v2/install-cost-form";
import { _trpc } from "@/components/static-trpc";
import { Toast } from "@/components/ui/toast";
import { useNotificationTrigger } from "@/hooks/use-notification-trigger";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

function parseNumberParam(value: string | string[] | undefined) {
  if (!value) return null;
  const normalized = Array.isArray(value) ? value[0] : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function InstallCostFormRoute() {
  const params = useLocalSearchParams<{
    modelId?: string;
    builderTaskId?: string;
    requestBuilderTaskId?: string;
    contractorId?: string;
    jobId?: string;
  }>();
  const notification = useNotificationTrigger();

  const modelId = parseNumberParam(params.modelId);
  const builderTaskId = parseNumberParam(params.builderTaskId);
  const requestBuilderTaskId = parseNumberParam(params.requestBuilderTaskId);
  const contractorId = parseNumberParam(params.contractorId);
  const jobId = parseNumberParam(params.jobId);
  const { data: builderTaskData } = useQuery(
    _trpc.community.getModelBuilderTasks.queryOptions(
      {
        modelId: modelId || -1,
      },
      {
        enabled: !!modelId,
      },
    ),
  );

  const headerTitle = builderTaskData?.modelName?.trim() || "Model";
  const builderName = builderTaskData?.builderName?.trim() || "";
  const headerSubtitle = builderName ? `Builder: ${builderName}` : "Builder";

  const notifyContractor = async () => {
    if (!contractorId || !jobId) {
      Toast.show("Contractor and job are required to notify.", {
        type: "error",
      });
      return;
    }

    try {
      await notification.jobTaskConfigured({
        contractorId,
        jobId,
      });
      Toast.show("Contractor notified: job task is ready.", {
        type: "success",
      });
    } catch {
      Toast.show("Unable to notify contractor right now.", {
        type: "error",
      });
    }
  };

  if (!modelId) {
    return (
      <SafeArea>
        <View className="flex-1 bg-background">
          <View className="flex-row items-center border-b border-border px-4 py-3">
            <BackBtn />
            <View className="ml-3 flex-1">
              <Text className="text-base font-bold text-foreground">Model</Text>
              <Text className="mt-0.5 text-xs text-muted-foreground">
                Builder
              </Text>
            </View>
          </View>
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-center text-sm text-muted-foreground">
              Model ID is missing. Reopen this notification and try again.
            </Text>
          </View>
        </View>
      </SafeArea>
    );
  }

  return (
    <SafeArea>
      <View className="flex-1 bg-background">
        <View className="flex-row items-center border-b border-border px-4 py-3">
          <BackBtn />
          <View className="ml-3 flex-1">
            <Text numberOfLines={1} className="text-base font-bold text-foreground">
              {headerTitle}
            </Text>
            <Text numberOfLines={1} className="mt-0.5 text-xs text-muted-foreground">
              {headerSubtitle}
            </Text>
          </View>
        </View>
        <InstallCostForm
          modelId={modelId}
          initialBuilderTaskId={builderTaskId}
          requestBuilderTaskId={requestBuilderTaskId}
          jobId={jobId}
          contractorId={contractorId}
          onNotifyContractor={notifyContractor}
          isNotifyingContractor={notification.isPending}
        />
      </View>
    </SafeArea>
  );
}

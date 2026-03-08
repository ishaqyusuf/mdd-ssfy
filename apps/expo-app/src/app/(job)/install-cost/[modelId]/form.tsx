import { BackBtn } from "@/components/back-btn";
import { SafeArea } from "@/components/safe-area";
import { InstallCostForm } from "@/components/forms/job-v2/install-cost-form";
import { Toast } from "@/components/ui/toast";
import { useNotificationTrigger } from "@/hooks/use-notification-trigger";
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
    } catch (_error) {
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
            <Text className="ml-3 text-base font-bold text-foreground">
              Install Cost
            </Text>
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
          <Text className="ml-3 text-base font-bold text-foreground">
            Install Cost
          </Text>
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

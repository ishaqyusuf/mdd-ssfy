import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useJobFormV2Context } from "@/hooks/use-job-form-v2";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { NeoCard } from "../ui/neo-card";

export function ConfigRequestSuccessStep() {
  const {
    admin,
    requestTaskConfigurationData,
    reset,
    clearRequestTaskConfigurationState,
  } = useJobFormV2Context();
  const router = useRouter();

  return (
    <View className="flex-1 justify-center gap-3 pb-4">
      <NeoCard className="items-center border-primary/30 bg-primary/10 py-10">
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-primary/20">
          <Icon name="CheckCircle2" className="text-primary" size={28} />
        </View>
        <Text className="text-center text-xs uppercase tracking-[1.2px] text-primary">
          Configuration Submitted
        </Text>
        <Text className="mt-1 text-center text-2xl font-black text-foreground">
          Request Sent Successfully
        </Text>
        <Text className="mt-2 px-4 text-center text-sm leading-5 text-muted-foreground">
          Job saved and configuration request submitted. You will be notified
          via email and app. You can finish job form and submit once notified.
        </Text>
        {requestTaskConfigurationData?.id ? (
          <View className="mt-4 rounded-full border border-border bg-card px-4 py-2">
            <Text className="text-xs font-semibold text-foreground">
              Draft Job #{requestTaskConfigurationData.id}
            </Text>
          </View>
        ) : null}
      </NeoCard>

      <Button
        onPress={() => {
          clearRequestTaskConfigurationState();
          reset();
        }}
        className="h-12 rounded-2xl bg-primary"
      >
        <Icon name="PlusCircle" className="text-primary-foreground" size={16} />
        <Text className="text-primary-foreground">Submit New Job</Text>
      </Button>

      <Button
        variant="outline"
        onPress={() => {
          clearRequestTaskConfigurationState();
          router.replace("/");
        }}
        className="h-12 rounded-2xl border-border bg-background"
      >
        <Icon name="House" className="text-foreground" size={16} />
        <Text className="text-foreground">Go Back Home</Text>
      </Button>
    </View>
  );
}

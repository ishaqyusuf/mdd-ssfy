import { Icon } from "@/components/ui/icon";
import { DispatchCompleteForm } from "../../dispatch-complete-form";
import { Pressable, ScrollView, Text, View } from "react-native";

type Props = {
  insetsTop: number;
  defaultReceivedBy: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (input: any) => Promise<void> | void;
};

export function CompleteDispatchScreen({
  insetsTop,
  defaultReceivedBy,
  isSubmitting,
  onClose,
  onSubmit,
}: Props) {
  return (
    <View className="absolute inset-0 z-80 bg-background">
      <View>
        <View className="border-b border-border bg-card px-4 pb-3">
          <View className="flex-row items-center">
            <Pressable
              onPress={onClose}
              className="h-10 w-10 items-center justify-center rounded-full active:bg-muted"
            >
              <Icon name="ArrowLeft" className="text-foreground" size={20} />
            </Pressable>
            <Text className="flex-1 text-center text-lg font-bold tracking-tight text-foreground">
              Complete Dispatch
            </Text>
            <View className="h-10 w-10" />
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-4 pb-8 pt-5">
        <DispatchCompleteForm
          defaultReceivedBy={defaultReceivedBy}
          isSubmitting={isSubmitting}
          onCancel={onClose}
          onSubmit={onSubmit}
        />
      </ScrollView>
    </View>
  );
}

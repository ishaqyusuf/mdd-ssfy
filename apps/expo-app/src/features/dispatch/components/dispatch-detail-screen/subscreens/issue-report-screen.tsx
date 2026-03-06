import { Icon } from "@/components/ui/icon";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

type IssueReason = {
  key: string;
  title: string;
  subtitle: string;
  icon: string;
};

type Props = {
  insetsTop: number;
  insetsBottom: number;
  pageTitle: string;
  orderId?: string | null;
  issueReasons: IssueReason[];
  selectedIssueReason: string | null;
  issueDetails: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSelectReason: (reasonKey: string) => void;
  onChangeDetails: (value: string) => void;
  onSubmit: () => void;
};

export function IssueReportScreen({
  insetsTop,
  insetsBottom,
  pageTitle,
  orderId,
  issueReasons,
  selectedIssueReason,
  issueDetails,
  isSubmitting,
  onClose,
  onSelectReason,
  onChangeDetails,
  onSubmit,
}: Props) {
  return (
    <View className="absolute inset-0 z-[70] bg-background">
      <View style={{ paddingTop: insetsTop + 6 }}>
        <View className="sticky top-0 z-10 border-b border-border bg-background/95">
          <View className="flex-row items-center gap-3 px-4 py-4">
            <Pressable
              onPress={onClose}
              className="h-10 w-10 items-center justify-center rounded-full active:bg-muted"
            >
              <Icon name="ArrowLeft" className="text-foreground" size={21} />
            </Pressable>
            <Text className="text-xl font-bold text-foreground">
              Report a Problem
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 24,
          paddingBottom: 112,
        }}
      >
        <View className="mb-6">
          <Text className="text-sm text-muted-foreground">
            Order ID:{" "}
            <Text className="font-semibold text-foreground">
              {orderId ? `#${orderId}` : pageTitle}
            </Text>
          </Text>
          <Text className="mt-1 text-lg font-semibold text-foreground">
            What is the issue?
          </Text>
          <Text className="text-sm text-muted-foreground">
            Please select the most accurate reason for being unable to complete
            the delivery.
          </Text>
        </View>

        <View className="gap-3">
          {issueReasons.map((reason) => {
            const selected = selectedIssueReason === reason.key;
            return (
              <Pressable
                key={reason.key}
                onPress={() => onSelectReason(reason.key)}
                className={`w-full flex-row items-center justify-between rounded-xl border p-4 ${
                  selected ? "border-primary bg-primary/5" : "border-border bg-card"
                }`}
              >
                <View className="flex-row items-center gap-4">
                  <View
                    className={`h-12 w-12 items-center justify-center rounded-xl ${
                      selected ? "bg-primary text-primary-foreground" : "bg-primary/10"
                    }`}
                  >
                    <Icon
                      name={reason.icon as any}
                      className={selected ? "text-primary-foreground" : "text-primary"}
                      size={19}
                    />
                  </View>
                  <View>
                    <Text className="font-semibold text-foreground">{reason.title}</Text>
                    <Text className="text-xs text-muted-foreground">{reason.subtitle}</Text>
                  </View>
                </View>
                <Icon name="ChevronRight" className="text-muted-foreground" size={18} />
              </Pressable>
            );
          })}
        </View>

        <View className="mt-8">
          <Text className="mb-2 text-sm font-medium text-foreground">
            Additional Details (Optional)
          </Text>
          <TextInput
            value={issueDetails}
            onChangeText={onChangeDetails}
            multiline
            numberOfLines={4}
            placeholder="Describe the situation here..."
            className="rounded-xl border border-border bg-card p-4 text-foreground"
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      <View
        style={{
          paddingBottom: Math.max(12, insetsBottom + 6),
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
        }}
      >
        <View className="border-t border-border bg-background px-4 pt-4">
          <Pressable
            disabled={isSubmitting}
            onPress={onSubmit}
            className="h-14 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/25 disabled:opacity-50"
          >
            <Text className="text-base font-bold text-primary-foreground">
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </Text>
          </Pressable>
          <Text className="pb-2 text-center text-xs text-muted-foreground">
            Reporting a problem will notify support and may affect your delivery
            route.
          </Text>
        </View>
      </View>
    </View>
  );
}

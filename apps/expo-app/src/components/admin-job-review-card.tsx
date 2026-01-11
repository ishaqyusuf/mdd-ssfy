import { useJobContext } from "@/hooks/use-job";
import { Pressable, Text, TextInput, View } from "react-native";
import { Icon } from "./ui/icon";

export function AdminJobReviewCard() {
  const ctx = useJobContext();
  if (!ctx.adminMode) return null;
  // if(ctx.job?.status === )
  return (
    <View className="bg-card rounded-2xl p-6 border border-border mb-6 shadow-sm">
      <View className="flex-row items-center gap-3 mb-6">
        <View className="p-2 rounded-lg bg-accent/10">
          <Icon name="ShieldCheck" className="text-accent-foreground size-20" />
        </View>
        <Text className="text-lg font-bold text-foreground">Admin Review</Text>
      </View>

      <View className="mb-6">
        <Text className="text-xs font-semibold text-muted-foreground uppercase mb-3">
          Internal Notes
        </Text>
        <TextInput
          className="w-full bg-background border border-border rounded-xl text-sm p-4 text-foreground min-h-25"
          placeholder="Enter notes regarding approval or rejection..."
          placeholderTextColor="hsl(var(--muted-foreground))"
          multiline
          textAlignVertical="top"
        />
      </View>

      <View className="gap-3">
        <Pressable className="w-full py-4 px-4 bg-secondary rounded-xl flex-row items-center justify-center gap-2 border border-border">
          <Icon name="UserPlus" className="text-secondary-foreground size-16" />
          <Text className="text-secondary-foreground font-semibold">
            Re-Assign Job
          </Text>
        </Pressable>

        <View className="flex-row gap-3">
          <Pressable className="flex-1 py-4 px-4 bg-destructive rounded-xl flex-row items-center justify-center gap-2">
            <Icon name="X" className="text-destructive-foreground size-16" />
            <Text className="text-destructive-foreground font-semibold">
              Reject
            </Text>
          </Pressable>

          <Pressable className="flex-1 py-4 px-4 bg-accent rounded-xl flex-row items-center justify-center gap-2">
            <Icon name="Check" className="text-accent-foreground size-16" />
            <Text className="text-accent-foreground font-semibold">
              Approve
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

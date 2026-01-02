// apps/expo-app/src/components/forms/job/job-form-extras.tsx
import { View, Text, Pressable } from "react-native";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { useJobFormContext } from "@/hooks/use-job-form-2";
import { useColors } from "@/hooks/use-color";
import { Input } from "@/components/ui/input-2";

export function JobFormExtras() {
  const ctx = useJobFormContext();
  const coWorker = ctx?.formData?.coWorker;
  const coWorkers = ctx?.users;
  const color = useColors();
  return (
    <>
      <View className="gap-4  pt-4 border-t">
        <Text className="text-lg font-bold text-foreground px-2">
          Additional Charges
        </Text>
        <View className="gap-4">
          <View className="flex-col gap-2">
            <Text className="text-sm font-semibold text-muted-foreground ml-2">
              Extra Charge
            </Text>
            <View className="relative justify-center">
              <Text className="absolute z-10 left-5 text-muted-foreground font-bold">
                USD
              </Text>
              <Input
                {...ctx.form.register("additionalCost")}
                className="flex w-full rounded-xl border border-muted-foreground h-14 pl-15 pr-5 text-base text-foreground"
                placeholder="0.00"
                inputMode="decimal"
              />
            </View>
          </View>
          <View className="flex-col gap-2">
            <Text className="text-sm font-semibold text-muted-foreground ml-2">
              Reason
            </Text>
            <Input
              {...ctx.form.register("additionalReason")}
              className="flex w-full rounded-xl border border-muted-foreground bg-card h-14 px-5 text-base text-foreground"
              placeholder="e.g. Rush fee, Materials..."
            />
          </View>
        </View>
      </View>
      <View className="gap-8 pt-4">
        <View className="flex-col gap-2">
          <Text className="text-sm font-semibold text-muted-foreground ml-2">
            Note to Admin
          </Text>
          <Input
            // className="flex w-full rounded-xl border border-muted-foreground h-14 px-5 text-base text-foreground"
            {...ctx.form.register("note")}
            className="h-14"
            placeholder="Add a note..."
            // placeholderTextColor={color.mutedForeground}
          />
        </View>
        <View className="flex-col gap-3">
          <Text className="text-sm font-semibold text-muted-foreground ml-2">
            Select Co-Worker
          </Text>
          <Pressable
            className={cn(
              "shrink-0 flex items-center gap-2 w-full flex-row border border-muted-foreground rounded-xl p-2"
            )}
            onPress={(e) => {
              ctx.setTab("coworker");
            }}
          >
            <View className="size-14 rounded-full bg-card border-2 border-dashed border-border flex items-center justify-center">
              <Icon
                size={16}
                name={coWorker?.id ? "User" : "UserPlus"}
                className="text-muted-foreground"
              />
            </View>
            <View className="gap-1">
              <Text
                className={cn(
                  "text-lg font-medium text-muted-foreground",
                  coWorker?.id && "text-primary"
                )}
              >
                {coWorker?.name || "Select Co-Worker"}
              </Text>
              {!coWorker?.id || (
                <Text className="text-muted-foreground">
                  Assigned. Click to change
                </Text>
              )}
            </View>
          </Pressable>
        </View>
      </View>
    </>
  );
}

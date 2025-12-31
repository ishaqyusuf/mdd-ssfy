// apps/expo-app/src/components/forms/job/job-form-extras.tsx
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Image,
} from "react-native";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { useJobFormContext } from "@/hooks/use-job-form-2";

const coworkers = [
  {
    id: 1,
    name: "You",
    avatarUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCnsohTZeOi0VC8yrVw1_sxjrZrOp8HtrtmOzyhothcqgTEOnJzK-U6304C5-PV7M6ZsxOE9iDWa9aPOX5NFhQM1iGHVJKHjuOOSTyYEWYGCRmY4Mu7QILrQ9wS8AQIHxTU7zbnnKNlGHb487zuEVnW4cf1yug788SSnEkKfT-tbKM-ZJfzMirBRc909wJnFPGLNoKV6_4NWtPM4QugS_Q08vYJLQ8LsJy2HerPVlsmq7uB-K-pxCJ199MfbMW5KCcYaBkVQJgSCps",
    selected: true,
  },
  {
    id: 2,
    name: "Mike",
    avatarUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBoXWjTvJISVLs9SMiqxa4OE57gpYaAZgCk7T6jIil8WXqief6q0pCfAmCS-S0ruoAZbF6TkIyRhDF4ol63vTvx9OgaxZxCCR94sljvGZ1YFjQrEQYJK6IGi2WSjzUvoD1l3vFQJ6sNqRKALc9I-fxPBz3WTHcb5D43g2i6RAdjhXoBrriSnaIOdYATeyZL1_sJgVshH2SAd-48oxPY-YNCorK_G1Xk3N7ep89-VTfMmAGLcPY1BzQf_Q0Y2IUZW1QPhGmFa3smvBo",
    selected: false,
  },
  {
    id: 3,
    name: "Sarah",
    avatarUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAXv7kRd5MYLyBkKbhtA6zpCYAhmf0tjbfXzz_96G0Jq2yGQyNW0aZcHcV8lHQ70_uzy4_8Vo9FpIGyLUQq6gR7iXgLQmq8rDmL5I5BIPntayFK6GukqdPmRo6kNLTHn0qIKZXMIIJnjAZWWlF_21RpV6u2g_jqfA4ErGsgpjfSHsQ6lS9QQH0EwmzUmtRJddGci6BRe0f5s2_we9HgNJ9X-6PTvNiTZt-rf1oqFn9rplTmRO8NVPSk5hwkDZ2MQqo2q6vKQial108",
    selected: false,
  },
];

const CoworkerItem = ({ coworker }) => (
  <Pressable
    className={cn(
      "shrink-0 flex flex-col items-center gap-2",
      !coworker.selected && "opacity-60"
    )}
  >
    <View className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
      <Text className="font-bold text-muted-foreground">
        {coworker?.initials}
      </Text>
    </View>
    {/* <View
      className={cn(
        "size-14 rounded-full border-2 p-0.5",
        coworker.selected ? "border-primary" : "border-transparent"
      )}
    >
      <Image
        source={{ uri: coworker.avatarUrl }}
        className="size-full rounded-full bg-muted"
      />
    </View> */}
    <Text
      className={cn(
        "text-xs",
        coworker.selected
          ? "font-bold text-foreground"
          : "font-medium text-muted-foreground"
      )}
    >
      {coworker.name}
    </Text>
    {coworker.selected && (
      <View className="absolute -top-1 -right-1 bg-primary rounded-full size-5 flex items-center justify-center">
        <Icon
          name="Check"
          size={12}
          className="text-primary-foreground font-bold"
        />
      </View>
    )}
  </Pressable>
);

export function JobFormExtras() {
  const ctx = useJobFormContext();
  const coWorker = ctx?.formData?.coWorker;
  const coWorkers = ctx?.users;
  return (
    <>
      <View className="gap-4 pt-4 border-t border-border/50">
        <Text className="text-lg font-bold text-foreground px-2">
          Additional Charges
        </Text>
        <View className="gap-4">
          <View className="flex-col gap-2">
            <Text className="text-sm font-semibold text-muted-foreground ml-2">
              Extra Charge
            </Text>
            <View className="relative justify-center">
              <Text className="absolute left-5 text-muted-foreground font-bold">
                $
              </Text>
              <TextInput
                className="flex w-full rounded-xl border border-muted-foreground h-14 pl-9 pr-5 text-base text-foreground"
                placeholder="0.00"
                inputMode="decimal"
              />
            </View>
          </View>
          <View className="flex-col gap-2">
            <Text className="text-sm font-semibold text-muted-foreground ml-2">
              Reason
            </Text>
            <TextInput
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
          <TextInput
            className="flex w-full rounded-xl border border-muted-foreground h-14 px-5 text-base text-foreground"
            placeholder="Add a note..."
          />
        </View>
        <View className="flex-col gap-3">
          <Text className="text-sm font-semibold text-muted-foreground ml-2">
            Select Co-Worker
          </Text>
          <Pressable
            className={cn(
              "shrink-0 flex items-center gap-2 w-full flex-row border border-muted-foreground rounded-xl"
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
            <View>
              <Text className="text-xs font-medium text-muted-foreground">
                {coWorker?.name || "Select Co-Worker"}
              </Text>
              {!coWorker?.id || <Text>Assigned. Click to change</Text>}
            </View>
          </Pressable>
          <View className="flex-row gap-4 pb-2">
            {!coWorker?.id ? (
              <>
                <Pressable className="shrink-0 flex flex-col items-center gap-2">
                  <View className="size-14 rounded-full bg-card border-2 border-dashed border-border flex items-center justify-center">
                    <Icon name="UserPlus" className="text-muted-foreground" />
                  </View>
                  <Text className="text-xs font-medium text-muted-foreground">
                    {coWorker?.name}
                  </Text>
                </Pressable>
              </>
            ) : (
              <Pressable className="shrink-0 flex flex-col items-center gap-2">
                <View className="size-14 rounded-full bg-card border-2 border-dashed border-border flex items-center justify-center">
                  <Icon name="UserPlus" className="text-muted-foreground" />
                </View>
                <Text className="text-xs font-medium text-muted-foreground">
                  {coWorker?.name}
                </Text>
              </Pressable>
            )}
            {/* {coWorkers?.data?.map((c) => {
              const isSelected = c.id === coWorker?.id;
              const initials = c?.name
                ?.split(" ")
                .map((n) => n[0])
                ?.filter((a, i) => i < 2)
                .join("");
              return (
                <CoworkerItem
                  key={c.id}
                  coworker={{
                    ...c,
                    initials,
                    selected: isSelected,
                  }}
                />
              );
            })} */}
          </View>
        </View>
      </View>
    </>
  );
}

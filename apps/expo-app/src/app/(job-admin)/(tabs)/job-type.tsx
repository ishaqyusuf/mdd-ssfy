// import JobsExampleScreen from "@/components/examples/screen-example-jobs";

import { PressableLink } from "@/components/pressable-link";
import { _goBack, _push } from "@/components/static-router";
import { Icon, IconKeys } from "@/components/ui/icon";
import { Pressable, Text, View } from "react-native";

export default function Screen({}) {
  return (
    <View className="bg-popover rounded-t-4xl shadow-2xl border-t border-border pb-10">
      {/* Handle */}
      <View className="w-full items-center pt-3 pb-2">
        <View className="w-10 h-1.5 bg-muted rounded-full" />
      </View>

      <View className="px-6 pt-2">
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-xl font-extrabold text-foreground">
            Select Job Type
          </Text>
          {/* <Pressable className="w-8 h-8 rounded-full bg-muted items-center justify-center active:opacity-70">
            <Icon name="X" className="size-sm text-muted-foreground" />
          </Pressable> */}
        </View>

        <View className="gap-3">
          <JobTypeOption
            icon="Wrench"
            title="Installation"
            subtitle="Setup and deployment of new units"
            colorClass="bg-primary/10"
            iconColorClass="text-primary"
          />
          <JobTypeOption
            icon="ClipboardList"
            title="Punchout"
            subtitle="Final fixes and inspection list"
            colorClass="bg-secondary"
            iconColorClass="text-secondary-foreground"
          />
          <JobTypeOption
            icon="AppWindow"
            title="Deco-Shutter"
            subtitle="Decorative finishing and shutter install"
            colorClass="bg-accent/20"
            iconColorClass="text-accent-foreground"
          />
        </View>

        <View className="mt-8 items-center">
          <Text className="text-xs text-muted-foreground font-medium">
            Swipe down or tap outside to dismiss
          </Text>
        </View>
      </View>
    </View>
  );
}
const JobTypeOption = ({
  icon,
  title,
  subtitle,
  colorClass,
  iconColorClass,
}: {
  icon: IconKeys;
  title: string;
  subtitle: string;
  colorClass: string;
  iconColorClass: string;
}) => (
  <Pressable
    // href={`/assign?jobType=${encodeURIComponent(title)}`}
    onPress={(e) => {
      _goBack();
      _push(`/assign?jobType=${title}`);
    }}
    className="group flex-row items-center gap-4 p-4 rounded-2xl bg-card border border-border active:border-primary active:scale-[0.98]"
  >
    <View
      className={`w-12 h-12 rounded-xl items-center justify-center ${colorClass}`}
    >
      <Icon name={icon} className={`size-lg ${iconColorClass}`} />
    </View>
    <View className="flex-1">
      <Text className="text-base font-bold text-foreground">{title}</Text>
      <Text className="text-sm text-muted-foreground">{subtitle}</Text>
    </View>
    <Icon name="ChevronRight" className="size-md text-primary opacity-50" />
  </Pressable>
);

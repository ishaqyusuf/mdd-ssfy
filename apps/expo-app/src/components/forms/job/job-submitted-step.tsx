// apps/expo-app/src/components/forms/job/job-submitted-step.tsx
import { View, Text, Pressable, Image } from "react-native";
import { Icon } from "@/components/ui/icon";
import { useColors } from "@/hooks/use-color";
import { useRouter } from "expo-router";
import { useJobFormContext } from "@/hooks/use-job-form-2";
import { _push, _replace } from "@/components/static-router";
import { PressableLink } from "@/components/pressable-link";
import { formatDate } from "@gnd/utils/dayjs";

// --- Mock Data ---
const jobDetails = {
  id: "#8493-AB",
  date: "Oct 24, 2023",
  title: "Renovation at 123 Maple",
  location: "Seattle, WA",
  thumbnailUrl:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuC_tQp9MWh8PMG0yECTwihHX058NDWPQcIhZCO-3wf2s5ZZXmGzusYWXkjodXih6HioHrts60jIVx5X6tC62P0AcX-rih3qmcfXRyKqHyKFo6qfKh0c6Vpjs5OiDQ_Mr2ar1hKyebLUa2z1kBiUl-2d_5w-nNhc44z7rYWTU1LmfKh_bxnvjO-pRtjKIZ5uZnmMPwTFZMpolKgkoSN0gKRTyjh1W7rYJzQ7QzxEghf-TeN_4VsiuRnFTmhLuISLQ572s3b_nv_vpk4",
};

/**
 * Placeholder for a radial gradient component used to create the glow effect.
 * In a real app, this would be implemented with a library like 'react-native-radial-gradient'.
 * @param {object} props - Component props.
 * @param {string[]} props.colors - Array of colors for the gradient.
 * @param {number[]} props.stops - Array of stop positions for the colors.
 * @param {number} props.radius - The radius of the gradient.
 * @param {string} props.className - Tailwind classes.
 */
const RadialGradient = ({
  colors,
  stops,
  radius,
  className,
}: {
  colors: string[];
  stops: number[];
  radius: number;
  className: string;
}) => (
  <View
    className={className}
    style={{
      // This is a visual stand-in. A real implementation would draw a gradient.
      backgroundColor: colors[0] || "transparent",
      width: radius * 2,
      height: radius * 2,
      borderRadius: radius,
    }}
  />
);

export function JobSubmittedStep() {
  const colors = useColors();
  const router = useRouter();
  const ctx = useJobFormContext();
  return (
    <View className="flex-1 bg-background">
      <View className="flex-1">
        {/* Top Close Button */}
        <View className="flex-row items-center p-4 pb-2 justify-between">
          <Pressable
            onPress={(e) => {
              _replace("/");
            }}
            className="flex size-12 items-center justify-center rounded-full"
          >
            <Icon name="X" size={24} className="text-foreground" />
          </Pressable>
          <View className="size-12" />
        </View>

        {/* Main Centered Content */}
        <View className="flex-1 items-center justify-center w-full max-w-md mx-auto px-6 -mt-10">
          {/* Success Indicator */}
          <View className="mb-6 items-center justify-center">
            {/* <RadialGradient
              colors={[`${colors.primary}33`, `${colors.primary}00`]}
              stops={[0, 1]}
              radius={96}
              className="absolute scale-150"
            /> */}
            <View
              // style={{
              //   shadowColor: colors.primary,
              //   shadowOffset: { width: 0, height: 0 },
              //   shadowOpacity: 0.6,
              //   shadowRadius: 20,
              //   elevation: 10, // for Android
              // }}
              className="relative flex items-center justify-center w-24 h-24 rounded-full bg-primary"
            >
              <Icon
                name="Check"
                size={48}
                className="text-primary-foreground font-bold"
              />
            </View>
          </View>

          {/* Headline & Body Text */}
          <Text className="text-foreground tracking-tight text-[32px] font-bold leading-tight text-center pb-3">
            {/* Job {ctx?.admin ? "Assigned" : "Submitted"}! */}
            {ctx?.formData?.isCustom
              ? "Submitted for review!"
              : ctx?.formData?.id
              ? "Job Submitted"
              : "Job Assigned!"}
          </Text>
          <Text className="text-muted-foreground text-base font-normal leading-relaxed text-center pb-8 max-w-70">
            The job details have been uploaded successfully.
          </Text>

          {/* Job Reference Card */}
          <View className="w-full bg-card rounded-xl p-4 border border-border">
            <View className="flex-row justify-between items-center mb-4 pb-4 border-b border-border">
              <View className="flex-col">
                <Text className="text-xs font-semibold uppercase tracking-wider text-primary/80">
                  Job ID
                </Text>
                <Text className="text-lg font-bold text-foreground">
                  #{ctx?.savedData?.id}
                </Text>
              </View>
              <View className="flex-col text-right">
                <Text className="text-xs font-semibold uppercase tracking-wider text-primary/80">
                  Date
                </Text>
                <Text className="text-sm font-medium text-muted-foreground">
                  {formatDate(ctx?.savedData?.date)}
                </Text>
              </View>
            </View>
            <View className="flex-row gap-4 items-center">
              <Image
                source={{ uri: jobDetails.thumbnailUrl }}
                className="w-16 h-16 shrink-0 rounded-lg bg-muted"
              />
              <View className="flex-col gap-1">
                <Text className="text-sm font-medium text-foreground">
                  {ctx?.savedData?.title || "custom"}
                </Text>
                <View className="flex-row items-center gap-1">
                  <Icon
                    name="MapPin"
                    size={14}
                    className="text-muted-foreground"
                  />
                  <Text className="text-xs text-muted-foreground">
                    {ctx?.savedData?.subtitle || "custom"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Action Footer */}
        <View className="w-full max-w-md mx-auto p-6 pb-8 flex flex-col gap-3">
          <Pressable
            onPress={(e) => {
              ctx.reset();
            }}
            className="w-full bg-primary h-14 rounded-full flex-row items-center justify-center gap-2"
          >
            <Icon name="Plus" className="text-primary-foreground" />
            <Text className="text-primary-foreground font-bold text-lg">
              Add Another Job
            </Text>
          </Pressable>
          <Pressable
            onPress={(e) => {
              _replace(`/job/${ctx.savedData?.id}`);
            }}
            className="w-full bg-transparent border border-border dark:border-primary/30 h-14 rounded-full flex items-center justify-center"
          >
            <Text className="text-foreground dark:text-primary font-semibold text-lg">
              View Job
            </Text>
          </Pressable>
          <Pressable
            onPress={(e) => {
              _replace("/");
            }}
            className="w-full mt-2 py-2"
          >
            <Text className="text-muted-foreground font-medium text-sm text-center">
              Return to Dashboard
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

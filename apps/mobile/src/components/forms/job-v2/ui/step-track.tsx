import { cn } from "@/lib/utils";
import { View } from "react-native";

export function StepTrack({
  count,
  current,
  className,
}: {
  count: number;
  current: number;
  className?: string;
}) {
  return (
    <View className={cn("flex-row items-center gap-2", className)}>
      {Array.from({ length: count }).map((_, index) => {
        const active = index + 1 <= current;
        return (
          <View
            key={index}
            className={cn(
              "h-2 flex-1 rounded-full",
              active ? "bg-foreground" : "bg-foreground/20",
            )}
          />
        );
      })}
    </View>
  );
}

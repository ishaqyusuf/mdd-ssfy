import { cn } from "@/lib/utils";
import { PropsWithChildren } from "react";
import { View } from "react-native";

export function NeoCard({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <View
      className={cn(
        "rounded-3xl border border-border/70 bg-card/95 p-4 shadow-sm",
        className,
      )}
    >
      {children}
    </View>
  );
}

import { cn } from "@/lib/utils";
import type * as React from "react";
import { View } from "react-native";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <View className={cn("animate-pulse bg-muted", className)} {...props} />
  );
}

export { Skeleton };

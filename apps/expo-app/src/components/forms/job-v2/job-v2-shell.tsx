import { PropsWithChildren } from "react";
import { View } from "react-native";

export function JobV2Shell({
  header,
  footer,
  children,
}: PropsWithChildren<{
  header: React.ReactNode;
  footer: React.ReactNode;
}>) {
  return (
    <View className="flex-1 bg-background">
      <View className="absolute inset-0 bg-background" />
      <View className="absolute -top-16 -right-12 h-48 w-48 rounded-full bg-primary/10" />
      <View className="absolute top-1/3 -left-16 h-40 w-40 rounded-full bg-muted" />

      <View className="flex-1">
        {header}
        <View className="flex-1 px-4 pt-3">{children}</View>
        {footer}
      </View>
    </View>
  );
}

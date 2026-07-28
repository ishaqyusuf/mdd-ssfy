import { ReactNode } from "react";
import { View } from "react-native";

export function PreviewTabContent({
  activeTab,
  tab,
  children,
}: {
  activeTab: string;
  tab: string;
  children: ReactNode;
}) {
  if (activeTab !== tab) return null;
  return <View style={{ flex: 1, gap: 16 }}>{children}</View>;
}

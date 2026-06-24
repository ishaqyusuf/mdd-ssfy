import { Pressable } from "@/components/ui/pressable";
import { ScrollView, Text, View } from "react-native";
import type { ResolvedPreviewDesignSystem } from "../design-systems/types";

export function PreviewDetailTabs({
  tabs,
  activeTab,
  onTabSelect,
  system,
}: {
  tabs: string[];
  activeTab: string;
  onTabSelect: (tab: string) => void;
  system: ResolvedPreviewDesignSystem;
}) {
  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: system.colors.border, marginBottom: 16, marginHorizontal: -16 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 24 }}>
        {tabs.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <Pressable
              key={tab}
              onPress={() => onTabSelect(tab)}
              style={{
                paddingVertical: 12,
                borderBottomWidth: 2,
                borderBottomColor: isActive ? system.colors.primary : "transparent",
              }}
            >
              <Text
                style={{
                  color: isActive ? system.colors.primary : system.colors.muted,
                  fontWeight: isActive ? "800" : "600",
                  fontSize: 14,
                }}
              >
                {tab}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

import type { CurrentSectionKey } from "@/lib/session-store";
import { View, Text } from "react-native";
import { Pressable } from "@/components/ui/pressable";
import { Icon, type IconKeys } from "@/components/ui/icon";

type SettingsSectionKey = CurrentSectionKey | "hrm";

type SettingsSectionOption = {
  key: SettingsSectionKey;
  label: string;
};

const sectionIconMap: Record<SettingsSectionKey, IconKeys> = {
  jobs: "Briefcase",
  dispatch: "Route",
  installer: "Wrench",
  driver: "Truck",
  sales: "LayoutDashboard",
  hrm: "Users",
};

export function SettingsSections({
  sections,
  currentSectionKey,
  onSelectSection,
  visible,
}: {
  sections: SettingsSectionOption[];
  currentSectionKey?: CurrentSectionKey | null;
  onSelectSection: (section: SettingsSectionKey) => void;
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <View className="gap-2">
      <Text className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Sections
      </Text>
      <View className="overflow-hidden rounded-xl border border-border bg-card">
        {sections.map((section, index) => {
          const isActive = section.key === currentSectionKey;
          const isSales = section.key === "sales";
          const isHrm = section.key === "hrm";

          return (
            <Pressable
              key={section.key}
              onPress={() => onSelectSection(section.key)}
              className={`flex-row items-center justify-between p-4 active:bg-muted/10 ${
                index !== sections.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <View className="flex-1 flex-row items-center gap-4">
                <View className="h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <Icon
                    name={sectionIconMap[section.key]}
                    className="text-foreground"
                    size={20}
                  />
                </View>
                <View>
                  <Text className="text-base font-medium text-foreground">
                    {section.label}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {isHrm
                      ? "Open HRM dashboard"
                      : isSales
                      ? "Open sales dashboard"
                      : isActive
                        ? "Current active section"
                        : "Switch to this section"}
                  </Text>
                </View>
              </View>
              <View className="shrink-0 pl-2">
                {isActive && !isHrm ? (
                  <Icon name="CircleCheck" className="text-primary" size={20} />
                ) : (
                  <Icon
                    name="ChevronRight"
                    className="text-muted-foreground"
                    size={20}
                  />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

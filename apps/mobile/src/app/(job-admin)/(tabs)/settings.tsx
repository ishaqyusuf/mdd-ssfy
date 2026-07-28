import {
  type SettingsSectionKey,
  type SettingsSectionOption,
} from "@/components/settings-sections";
import SettingsExampleScreen from "@/screens/screen-settings";
import { useAuthContext } from "@/hooks/use-auth";
import { useRouter } from "expo-router";

const sectionRouteMap = {
  jobs: "/(job)/dashboard",
  dispatch: "/(drivers)/dispatch",
  installer: "/(job)/dashboard",
  driver: "/(drivers)",
  sales: "/(sales)",
  hrm: "/hrm",
} as const;

export default function SettingsScreen({}) {
  const auth = useAuthContext();
  const router = useRouter();
  const sections: SettingsSectionOption[] = [
    ...auth.sections.map((section) => ({
      key: section.key,
      label: section.label,
    })),
    ...(auth.isAdmin
      ? [
          {
            key: "sales" as const,
            label: "Sales Dashboard",
          },
          {
            key: "hrm" as const,
            label: "HRM",
          },
        ]
      : []),
  ];

  const onSelectSection = (sectionKey: SettingsSectionKey) => {
    if (sectionKey === "hrm") {
      router.push(sectionRouteMap.hrm as any);
      return;
    }
    auth.setCurrentSectionByKey(sectionKey);
    router.replace(sectionRouteMap[sectionKey] as any);
  };

  return <SettingsExampleScreen sections={sections} onSelectSection={onSelectSection} />;
}

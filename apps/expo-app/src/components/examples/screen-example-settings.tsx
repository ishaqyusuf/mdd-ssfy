import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, Platform } from "react-native";
import { Icon, IconKeys } from "../ui/icon";
import { useRouter } from "expo-router";
import { useAuthContext } from "@/hooks/use-auth";
import { padStart } from "@gnd/utils";
import { Debug } from "../debug";
import { BackBtn } from "../back-btn";
import config from "@root/app.config";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useColorScheme } from "@/hooks/use-color";
import {
  getThemeOverride,
  setThemeOverride,
  type ThemeOverride,
} from "@/lib/theme-preference";
export default function SettingsExampleScreen() {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [themeOverride, setThemeOverrideState] = useState<ThemeOverride>("system");
  const router = useRouter();
  const auth = useAuthContext();
  const { setColorScheme } = useColorScheme();
  const { data: setting, refetch } = useQuery(
    useTRPC().settings.getJobSettings.queryOptions(),
  );
  const { mutate: updateSetting } = useMutation(
    useTRPC().settings.updateSetting.mutationOptions({
      onSuccess: () => {
        refetch();
      },
      onError: (error) => {
        console.error("Error updating job setting:", error);
      },
    }),
  );
  async function updateJobSetting(key, value) {
    updateSetting({
      type: setting?.type!,
      meta: {
        [key]: value,
      },
    });
  }
  React.useEffect(() => {
    (async () => {
      const override = await getThemeOverride();
      setThemeOverrideState(override);
    })();
  }, []);

  const onChangeThemeOverride = async (nextOverride: ThemeOverride) => {
    setThemeOverrideState(nextOverride);
    await setThemeOverride(nextOverride);
    setColorScheme(nextOverride);
  };
  // get expo build version
  const expoVersion = config.version;
  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-14 pb-4 border-b border-border bg-background">
        <BackBtn />

        <Text className="text-lg font-bold text-foreground">Settings</Text>
        <View className="h-10 w-10" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View className="p-4 gap-6">
          {/* Profile Card */}
          <View className="flex-row items-center justify-between p-4 rounded-xl bg-card border border-border">
            <View className="flex-row items-center gap-4">
              <View className="h-14 w-14 rounded-full bg-muted items-center justify-center border-2 border-primary/20">
                <Text className="text-lg font-bold text-foreground">AM</Text>
              </View>
              <View>
                <Text className="text-base font-bold text-foreground">
                  {auth?.profile?.user?.name}
                </Text>
                <Text className="text-sm text-muted-foreground">
                  Contractor ID: #{padStart(auth?.profile?.user?.id, 4, "0")}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={(e) => {
                router.push("/edit-profile");
              }}
              className="h-9 w-9 items-center justify-center rounded-full bg-primary/10 active:bg-primary/20"
            >
              <Icon name="Pencil" className="text-primary" size={18} />
            </Pressable>
          </View>
          {!auth.isAdmin || (
            <Section title="Job Configuration">
              <SettingsItem
                icon="ListChecks"
                label="Task Qty visible"
                subLabel="Show maximum task qty to workers"
                isLast={false}
                rightElement={
                  <Toggle
                    value={setting?.meta?.showTaskQty || false}
                    onValueChange={() =>
                      updateJobSetting(
                        "showTaskQty",
                        !setting?.meta?.showTaskQty,
                      )
                    }
                  />
                }
              />
              <SettingsItem
                icon="FolderPlus"
                label="Custom jobs"
                subLabel="Allow workers to create custom jobs"
                isLast={false}
                rightElement={
                  <Toggle
                    value={setting?.meta?.allowCustomJobs || false}
                    onValueChange={() =>
                      updateJobSetting(
                        "allowCustomJobs",
                        !setting?.meta?.allowCustomJobs,
                      )
                    }
                  />
                }
              />
            </Section>
          )}
          <Section title="Appearance">
            <SettingsItem
              icon="Settings"
              label="Theme Preference"
              subLabel="Override system with Light or Dark, or follow System."
              isLast
              rightElement={
                <ThemePreferenceSelector
                  value={themeOverride}
                  onChange={onChangeThemeOverride}
                />
              }
            />
          </Section>
          <Debug>
            {/* Preferences Section */}
            <Section title="PREFERENCES">
              <SettingsItem
                icon="Bell"
                label="Push Notifications"
                isLast={false}
                rightElement={
                  <Toggle
                    value={pushEnabled}
                    onValueChange={() => setPushEnabled(!pushEnabled)}
                  />
                }
              />
              <SettingsItem
                icon="Mail"
                label="Email Notifications"
                isLast={false}
                rightElement={
                  <Toggle
                    value={emailEnabled}
                    onValueChange={() => setEmailEnabled(!emailEnabled)}
                  />
                }
              />
              <SettingsItem
                icon="Globe"
                label="Language"
                isLast={true}
                rightElement={
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm text-muted-foreground">
                      English
                    </Text>
                    <Icon
                      name="ChevronRight"
                      className="text-muted-foreground"
                      size={20}
                    />
                  </View>
                }
              />
            </Section>

            {/* Privacy & Data Section */}
            <Section title="PRIVACY & DATA">
              <SettingsItem
                icon="MapPin"
                label="Location Access"
                subLabel="For job tracking accuracy"
                isLast={false}
                rightElement={
                  <Toggle
                    value={locationEnabled}
                    onValueChange={() => setLocationEnabled(!locationEnabled)}
                  />
                }
              />
              <SettingsItem
                icon="Lock"
                label="Privacy Settings"
                isLast={false}
                rightElement={
                  <Icon
                    name="ChevronRight"
                    className="text-muted-foreground"
                    size={20}
                  />
                }
              />
              <SettingsItem
                icon="PieChart"
                label="Data Usage"
                isLast={true}
                rightElement={
                  <Icon
                    name="ChevronRight"
                    className="text-muted-foreground"
                    size={20}
                  />
                }
              />
            </Section>

            {/* Support Section */}
            <Section title="SUPPORT">
              <SettingsItem
                icon="HelpCircle"
                label="Help & Support"
                isLast={false}
                rightElement={
                  <Icon
                    name="ChevronRight"
                    className="text-muted-foreground"
                    size={20}
                  />
                }
              />
              <SettingsItem
                icon="Info"
                label="About App"
                isLast={true}
                rightElement={
                  <Icon
                    name="ChevronRight"
                    className="text-muted-foreground"
                    size={20}
                  />
                }
              />
            </Section>
          </Debug>

          {/* Logout & Version */}
          <View className="items-center gap-4 pt-2 pb-6">
            <Pressable
              onPress={(e) => {
                auth.onLogout();
              }}
              className="w-full flex-row items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-card/50 p-3.5 active:bg-destructive/10"
            >
              <Icon name="LogOut" className="text-destructive" size={20} />
              <Text className="text-base font-bold text-destructive">
                Log Out
              </Text>
            </Pressable>
            <Text className="text-xs font-medium text-muted-foreground">
              Version {expoVersion} (Build{" "}
              {Platform.select({
                android: config.android?.version || 1,
                ios: config.ios?.buildNumber || "1",
              })}
              )
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Tab Bar */}
      {/* <View className="flex-row justify-around border-t border-border bg-background/95 py-3 pb-8">
        <TabItem icon="Home" label="Home" />
        <TabItem icon="ClipboardList" label="Jobs" />
        <TabItem icon="Wallet" label="Payments" />
        <TabItem icon="Settings" label="Settings" active />
      </View> */}
    </View>
  );
}

function ThemePreferenceSelector({
  value,
  onChange,
}: {
  value: ThemeOverride;
  onChange: (next: ThemeOverride) => void;
}) {
  const options: Array<{ label: string; value: ThemeOverride }> = [
    { label: "System", value: "system" },
    { label: "Light", value: "light" },
    { label: "Dark", value: "dark" },
  ];

  return (
    <View className="flex-row items-center rounded-lg border border-border bg-muted/40 p-1">
      {options.map((option) => {
        const active = value === option.value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            className={`rounded-md px-2.5 py-1.5 ${active ? "bg-card" : ""}`}
          >
            <Text
              className={`text-xs font-semibold ${
                active ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Sub-Components                               */
/* -------------------------------------------------------------------------- */

function Section({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <View className="gap-2">
      <Text className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </Text>
      <View className="overflow-hidden rounded-xl border border-border bg-card">
        {children}
      </View>
    </View>
  );
}

function SettingsItem({
  icon,
  label,
  subLabel,
  rightElement,
  isLast,
}: {
  icon: IconKeys;
  label: string;
  subLabel?: string;
  rightElement?: React.ReactNode;
  isLast: boolean;
}) {
  return (
    <Pressable
      className={`flex-row items-center justify-between p-4 active:bg-muted/10 ${
        !isLast ? "border-b border-border" : ""
      }`}
    >
      <View className="flex-1 flex-row items-center gap-4">
        <View className="h-9 w-9 items-center justify-center rounded-lg bg-muted">
          <Icon name={icon} className="text-foreground" size={20} />
        </View>
        <View>
          <Text className="text-base font-medium text-foreground">{label}</Text>
          {subLabel && (
            <Text className="text-xs text-muted-foreground">{subLabel}</Text>
          )}
        </View>
      </View>
      <View className="shrink-0 pl-2">{rightElement}</View>
    </Pressable>
  );
}

function Toggle({
  value,
  onValueChange,
}: {
  value: boolean;
  onValueChange: () => void;
}) {
  return (
    <Pressable onPress={onValueChange} className="relative justify-center">
      <View
        className={`h-6 w-11 rounded-full border border-transparent transition-colors ${
          value ? "bg-primary" : "bg-muted"
        }`}
      />
      <View
        className={`absolute h-5 w-5 rounded-full bg-foreground shadow-sm transition-all ${
          value ? "right-0.5" : "left-0.5"
        }`}
      />
    </Pressable>
  );
}

function TabItem({
  icon,
  label,
  active = false,
}: {
  icon: any;
  label: string;
  active?: boolean;
}) {
  return (
    <View className={`items-center gap-1 ${active ? "" : "opacity-50"}`}>
      <Icon
        name={icon}
        className={active ? "text-primary" : "text-foreground"}
        size={24}
      />
      <Text
        className={`text-[10px] font-medium ${
          active ? "text-primary" : "text-foreground"
        }`}
      >
        {label}
      </Text>
    </View>
  );
}

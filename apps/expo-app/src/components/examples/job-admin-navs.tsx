import React from "react";
import { View, Text, Pressable } from "react-native";

import { Icon, IconProps } from "../ui/icon";

import { usePathname, useRouter } from "expo-router";
export function JobAdminNavs() {
  return (
    <View className="absolute bottom-0 w-full bg-card border-t border-border pb-6 pt-2 z-50">
      <View className="flex-row justify-around items-center h-14">
        <NavItem icon={"home"} path="/" label="Home" />
        <NavItem icon={"jobs"} label="Jobs" path="jobs" />
        <NavItem
          icon={"analytics"}
          path="/analytics"
          label="Analytics"
          active
        />
        <NavItem icon={"settings"} path="/settings" label="Settings" />
      </View>
    </View>
  );
}

function NavItem({
  icon,
  label,
  //   active = false,
  path,
}: {
  icon: IconProps["name"];
  label: string;
  active?: boolean;
  path?;
}) {
  const router = useRouter();
  const _path = usePathname();
  const active = _path === path;

  return (
    <Pressable
      onPress={(e) => {
        if (!path) return;
        router.push(path);
      }}
      className="items-center justify-center w-16 h-full"
    >
      <Icon
        name={icon}
        size={24}
        className={
          active ? "text-primary fill-primary" : "text-muted-foreground"
        }
        strokeWidth={active ? 2.5 : 2}
      />
      <Text
        className={`text-[10px] mt-1 font-medium ${
          active ? "text-primary" : "text-muted-foreground"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

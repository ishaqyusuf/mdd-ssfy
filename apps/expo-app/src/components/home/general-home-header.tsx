import { useAuthContext } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import { Pressable } from "../ui/pressable";
import { Icon } from "../ui/icon";

type Props = {
  showNotificationDot?: boolean;
  onRightPress?: () => void;
  className?: string;
  contentClassName?: string;
  nameMode?: "full" | "first_uppercase";
};

export function GeneralHomeHeader({
  showNotificationDot = true,
  onRightPress,
  className,
  contentClassName,
  nameMode = "full",
}: Props) {
  const router = useRouter();
  const auth = useAuthContext();

  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? "Good morning,"
      : hour < 18
        ? "Good afternoon,"
        : "Good evening,";

  const rawName = String(auth?.profile?.user?.name || "Driver").trim();
  const displayName =
    nameMode === "first_uppercase"
      ? (rawName.split(" ")[0] || "Driver").toUpperCase()
      : `${rawName}!`;
  const avatarLetter = (rawName[0] || "D").toUpperCase();

  return (
    <View className={cn("border-b border-border bg-card p-4", className)}>
      <View className={cn("flex-row items-center gap-2", contentClassName)}>
        <View className="flex-row items-center gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-full border-2 border-border bg-muted">
            <Text className="text-xl font-bold text-muted-foreground">
              {avatarLetter}
            </Text>
          </View>
          <View>
            <Text className="mb-1 text-xs font-medium text-muted-foreground uppercase">
              {greeting}
            </Text>
            <Text className="text-base font-bold text-foreground uppercase">
              {displayName}
            </Text>
          </View>
        </View>
        <View className="flex-1" />
        <Pressable
          onPress={() => {
            if (onRightPress) {
              onRightPress();
              return;
            }
            router.push("/notifications");
          }}
          className="relative rounded-full p-2 active:bg-muted"
        >
          <Icon name="Bell" className="text-foreground" size={22} />
          {showNotificationDot ? (
            <View className="absolute right-2 top-2 h-2 w-2 rounded-full border border-card bg-destructive" />
          ) : null}
        </Pressable>

        <Pressable
          href="/settings"
          className="rounded-full p-2 active:bg-muted"
        >
          <Icon name="Settings" className="" size={20} />
        </Pressable>

        {/* <View className="h-10 w-10" /> */}
      </View>
    </View>
  );
}

import { useAuthContext } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { LinkProps, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { PressableLink } from "../pressable-link";
import { Icon } from "../ui/icon";

type Props = {
  showNotificationDot?: boolean;
  onRightPress?: () => void;
  notificationHref?: LinkProps["href"];
  className?: string;
  contentClassName?: string;
  nameMode?: "full" | "first_uppercase";
};

export function GeneralHomeHeader({
  showNotificationDot = true,
  onRightPress,
  notificationHref,
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
    <View
      className={cn("border-b border-border bg-card p-4", className)}
      // style={{
      //   paddingTop: Platform.select({
      //     android: insets.top + 8,
      //     default: insets.top + 8,
      //   }),
      // }}
    >
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

            if (notificationHref) {
              router.push(notificationHref);
            }
          }}
          className="relative rounded-full p-2 active:bg-muted"
        >
          <Icon name="Bell" className="text-foreground" size={22} />
          {showNotificationDot ? (
            <View className="absolute right-2 top-2 h-2 w-2 rounded-full border border-card bg-destructive" />
          ) : null}
        </Pressable>

        <PressableLink
          href="/settings"
          className="rounded-full p-2 active:bg-muted"
        >
          <Icon name="Settings" className="" size={20} />
        </PressableLink>

        {/* <View className="h-10 w-10" /> */}
      </View>
    </View>
  );
}

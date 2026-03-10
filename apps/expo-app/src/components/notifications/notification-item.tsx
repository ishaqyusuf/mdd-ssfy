import { Icon } from "@/components/ui/icon";
import type { TransformedNotification } from "@notifications/notification-center";
import { Pressable, Text, View } from "react-native";

interface NotificationItemProps {
  activity: TransformedNotification;
  onAction?: (notification: TransformedNotification) => void;
}

export function NotificationItem({
  activity,
  onAction,
}: NotificationItemProps) {
  const isUnread = activity.status === "unread";

  return (
    <Pressable
      className="px-4 py-3 active:opacity-85"
      accessibilityRole="button"
      onPress={() => {
        if (!activity.isClickable) return;
        onAction?.(activity);
      }}
      disabled={!activity.isClickable}
    >
      <View className="flex-row items-start gap-3">
        <View className="mt-0.5 h-9 w-9 items-center justify-center rounded-full">
          <Icon name="Bell" className="text-foreground" size={14} />
        </View>
        <View className="flex-1">
          <View className="flex-row items-start justify-between gap-2">
            <Text className="flex-1 text-sm font-semibold text-foreground">
              {activity.title}
            </Text>
            {isUnread ? (
              <View className="mt-1 h-2 w-2 rounded-full bg-primary" />
            ) : null}
          </View>

          <Text className="mt-1 text-xs leading-5 text-muted-foreground">
            {activity.description}
          </Text>

          <View className="mt-2 flex-row items-center justify-between gap-3">
            <Text className="text-[11px] font-medium text-muted-foreground">
              {activity.notificationDate || "No date"}
            </Text>
            {activity.action ? (
              <Pressable
                onPress={() => onAction?.(activity)}
                className="h-11 w-11 items-center justify-center rounded-full"
                accessibilityRole="button"
                accessibilityLabel={activity.action.label}
              >
                <Icon name="ArrowUpRight" className="text-foreground" size={16} />
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

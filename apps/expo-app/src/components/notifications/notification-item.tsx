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
  return (
    <Pressable
      className="px-4 py-3  active:bg-muted"
      accessibilityRole="button"
      onPress={() => {
        if (!activity.isClickable) return;
        onAction?.(activity);
      }}
      disabled={!activity.isClickable}
    >
      <View className="mb-1 flex-row items-center justify-between gap-3">
        <Text className="flex-1 text-sm font-semibold text-foreground">
          {activity.title}
        </Text>
        {activity.action ? (
          <Pressable
            onPress={() => onAction?.(activity)}
            className="rounded-full bg-primary px-3 py-1.5"
            accessibilityRole="button"
          >
            <Text className="text-xs font-semibold text-primary-foreground">
              {activity.action.label}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <Text className="text-xs text-muted-foreground">
        {activity.description}
      </Text>
      {activity.notificationDate ? (
        <Text className="mt-1 text-[11px] text-muted-foreground">
          {activity.notificationDate}
        </Text>
      ) : null}
      {activity.status === "unread" ? (
        <View className="mt-2 h-1.5 w-1.5 rounded-full bg-destructive" />
      ) : null}
    </Pressable>
  );
}

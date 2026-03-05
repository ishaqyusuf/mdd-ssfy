import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Pressable, Text, View } from "react-native";

export type NotificationActivity =
	RouterOutputs["notes"]["list"]["data"][number];

interface NotificationItemProps {
	activity: NotificationActivity;
	onPress?: (id: number) => void;
}

export function NotificationItem({ activity, onPress }: NotificationItemProps) {
	return (
		<Pressable
			className="px-4 py-3 active:bg-muted"
			accessibilityRole="button"
			onPress={() => onPress?.(activity.id)}
		>
			<View className="mb-1 flex-row items-center justify-between gap-3">
				<Text className="flex-1 text-sm font-semibold text-foreground">
					{activity.subject || "Notification Subject"}
				</Text>
			</View>
			<Text className="text-xs text-muted-foreground">
				{activity.headline || "Notification headline or preview text"}
			</Text>
			{activity.receipt?.status === "unread" ? (
				<View className="mt-2 h-1.5 w-1.5 rounded-full bg-destructive" />
			) : null}
		</Pressable>
	);
}

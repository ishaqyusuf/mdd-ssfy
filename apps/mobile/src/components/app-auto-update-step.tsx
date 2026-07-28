import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { ActivityIndicator, View } from "react-native";

export function AppAutoUpdateStep({
	active,
	done,
	label,
}: {
	active: boolean;
	done: boolean;
	label: string;
}) {
	return (
		<View className="flex-row items-center gap-3">
			<View
				className={
					done
						? "size-8 items-center justify-center rounded-full bg-primary"
						: active
							? "size-8 items-center justify-center rounded-full bg-secondary"
							: "size-8 items-center justify-center rounded-full border border-border bg-background"
				}
			>
				{active ? (
					<ActivityIndicator size="small" />
				) : done ? (
					<Icon name="Check" className="size-sm text-primary-foreground" />
				) : (
					<View className="size-2 rounded-full bg-muted-foreground/60" />
				)}
			</View>
			<Text className="text-base font-semibold text-foreground">{label}</Text>
		</View>
	);
}

import { Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";

export function InventoryFulfillmentHeader({
	title,
	subtitle,
	activeFilterCount,
	onOpenFilters,
}: {
	title: string;
	subtitle: string;
	activeFilterCount: number;
	onOpenFilters: () => void;
}) {
	const router = useRouter();
	return (
		<View className="px-4 pb-3 pt-3">
			<View className="flex-row items-center gap-3">
				<Pressable
					haptic
					onPress={() => router.back()}
					className="h-11 w-11 items-center justify-center rounded-full active:bg-muted"
				>
					<Icon name="ArrowLeft" className="text-foreground" size={20} />
				</Pressable>
				<View className="min-w-0 flex-1">
					<Text className="text-2xl font-bold text-foreground">{title}</Text>
					<Text className="text-sm text-muted-foreground">{subtitle}</Text>
				</View>
				<Pressable
					haptic
					onPress={onOpenFilters}
					className="relative h-11 w-11 items-center justify-center rounded-full border border-border bg-card active:opacity-80"
				>
					<Icon
						name="SlidersHorizontal"
						className="text-foreground"
						size={19}
					/>
					{activeFilterCount > 0 ? (
						<View className="absolute -right-1 -top-1 min-h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1">
							<Text className="text-[10px] font-bold text-primary-foreground">
								{activeFilterCount}
							</Text>
						</View>
					) : null}
				</Pressable>
			</View>
		</View>
	);
}

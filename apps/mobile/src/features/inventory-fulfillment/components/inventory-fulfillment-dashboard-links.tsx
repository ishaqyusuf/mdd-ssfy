import { Icon, type IconKeys } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { useAuthContext } from "@/hooks/use-auth";
import { type Href, useRouter } from "expo-router";
import { Text, View } from "react-native";
import { useInventoryFulfillmentDashboardSummary } from "../api/use-inventory-fulfillment-dashboard-summary";
import { canViewInventoryFulfillment } from "../lib/inventory-fulfillment-policy";

export function InventoryFulfillmentDashboardLinks() {
	const router = useRouter();
	const auth = useAuthContext();
	const canView = canViewInventoryFulfillment(auth.profile?.can);
	const summary = useInventoryFulfillmentDashboardSummary(canView);
	if (!canView) return null;

	return (
		<View className="mt-3 gap-3">
			<DashboardLink
				icon="Clock"
				title="Backorders"
				description="Review shortages and inbound coverage"
				count={summary.backorderCount}
				onPress={() => router.push("/(sales)/inventory/backorders" as Href)}
			/>
			<DashboardLink
				icon="Warehouse"
				title="Partial shipments"
				description="Ship available lines or manage holds"
				count={summary.partialCount}
				onPress={() =>
					router.push("/(sales)/inventory/partial-shipments" as Href)
				}
			/>
		</View>
	);
}

function DashboardLink({
	icon,
	title,
	description,
	count,
	onPress,
}: {
	icon: IconKeys;
	title: string;
	description: string;
	count?: number;
	onPress: () => void;
}) {
	return (
		<Pressable
			haptic
			onPress={onPress}
			className="min-h-[76px] rounded-2xl border border-border bg-card p-4 active:opacity-80"
		>
			<View className="flex-row items-center gap-3">
				<View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
					<Icon name={icon} className="text-primary" size={18} />
				</View>
				<View className="min-w-0 flex-1">
					<View className="flex-row items-center gap-2">
						<Text className="text-base font-semibold text-foreground">
							{title}
						</Text>
						{count != null ? (
							<View className="rounded-full bg-muted px-2 py-0.5">
								<Text className="text-[11px] font-bold text-foreground">
									{count}
								</Text>
							</View>
						) : null}
					</View>
					<Text
						numberOfLines={1}
						className="mt-0.5 text-xs text-muted-foreground"
					>
						{description}
					</Text>
				</View>
				<Icon name="ChevronRight" className="text-muted-foreground" size={19} />
			</View>
		</Pressable>
	);
}

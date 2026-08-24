import { Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { Text, View } from "react-native";
import type { DispatchListItem } from "../types/dispatch.types";

function getCustomer(item: DispatchListItem) {
	return (
		item.order?.shippingAddress?.name ||
		item.order?.customer?.businessName ||
		item.order?.customer?.name ||
		"Unknown customer"
	);
}

function getAddress(item: DispatchListItem) {
	const address = item.order?.shippingAddress as Record<string, unknown> | null;
	return [address?.address1, address?.address2, address?.city, address?.state]
		.map((value) => String(value || "").trim())
		.filter(Boolean)
		.join(", ");
}

function actionLabel(item: DispatchListItem) {
	if (item.workspace?.canComplete) return "Complete delivery";
	if (item.workspace?.canStartTrip) return "Start trip";
	return "View stop";
}

type Props = {
	item: DispatchListItem;
	index?: number;
	featured?: boolean;
	onOpen: () => void;
	onComplete: () => void;
};

export function DriverDashboardDispatchItem({
	item,
	featured,
	onOpen,
	onComplete,
}: Props) {
	const address = getAddress(item);
	const complete = Boolean(item.workspace?.canComplete);
	return (
		<Pressable
			onPress={onOpen}
			className={
				featured
					? "mx-4 overflow-hidden rounded-2xl border border-primary/30 bg-card"
					: "mx-4 mb-3 overflow-hidden rounded-xl border border-border bg-card"
			}
		>
			{({ pressed }) => (
				<View className={featured ? "gap-4 p-5" : "gap-3 p-4"}>
					<View className="flex-row items-start justify-between gap-3">
						<View className="min-w-0 flex-1">
							<Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
								{featured
									? "Next stop"
									: `Order #${item.order?.orderId || item.id}`}
							</Text>
							<Text
								className={
									featured
										? "mt-1 text-xl font-bold text-foreground"
										: "mt-1 text-base font-bold text-foreground"
								}
							>
								{getCustomer(item)}
							</Text>
							{featured ? (
								<Text className="mt-1 text-xs font-semibold text-muted-foreground">
									Order #{item.order?.orderId || item.id}
								</Text>
							) : null}
						</View>
						<View className="rounded-full bg-secondary px-2.5 py-1">
							<Text className="text-[10px] font-bold uppercase text-secondary-foreground">
								{item.workspace?.label || String(item.status || "queued")}
							</Text>
						</View>
					</View>
					<View className="gap-2">
						<View className="flex-row items-start gap-2">
							<Icon
								name="MapPin"
								className="mt-0.5 text-muted-foreground"
								size={16}
							/>
							<Text className="flex-1 text-sm text-muted-foreground">
								{address || "Address required"}
							</Text>
						</View>
						<View className="flex-row items-center gap-2">
							<Icon
								name="CalendarCheck"
								className="text-muted-foreground"
								size={16}
							/>
							<Text
								className={
									item.dueBucket === "overdue"
										? "text-sm font-semibold text-destructive"
										: "text-sm text-muted-foreground"
								}
							>
								{item.dueStatusLabel || "Schedule required"}
							</Text>
						</View>
					</View>
					<Pressable
						onPress={complete ? onComplete : onOpen}
						className={
							complete
								? "h-12 items-center justify-center rounded-xl bg-success active:opacity-85"
								: "h-12 items-center justify-center rounded-xl bg-primary active:opacity-85"
						}
					>
						<Text
							className={
								complete
									? "font-bold text-success-foreground"
									: "font-bold text-primary-foreground"
							}
						>
							{actionLabel(item)}
						</Text>
					</Pressable>
					{pressed ? (
						<View
							pointerEvents="none"
							className="absolute inset-0 bg-foreground/5"
						/>
					) : null}
				</View>
			)}
		</Pressable>
	);
}

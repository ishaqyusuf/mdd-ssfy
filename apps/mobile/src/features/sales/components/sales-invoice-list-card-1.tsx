import { Icon, type IconKeys } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { Text, View } from "react-native";
import {
	type SalesInvoiceListCardProps,
	getInvoiceListCard1Tone,
	getInvoiceListCardState,
	getInvoiceListInitials,
	toInvoiceListMoney,
} from "./sales-invoice-list-card-utils";
export function SalesInvoiceListCard1({
	type,
	item,
	onPress,
	disabled,
}: SalesInvoiceListCardProps) {
	const state = getInvoiceListCardState(type, item);
	const tone = getInvoiceListCard1Tone(type, state.statusLabel);
	return (
		<Pressable
			haptic
			disabled={disabled}
			onPress={onPress}
			className={`mb-3 overflow-hidden rounded-3xl border border-border bg-card active:opacity-90 ${
				disabled ? "opacity-60" : ""
			}`}
		>
			<View className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/10" />
			<View className="border-b border-border/70 px-4 pb-3 pt-4">
				<View className="flex-row items-center justify-between">
					<View className="flex-row items-center gap-3">
						<View className="h-11 w-11 items-center justify-center rounded-2xl border border-border bg-background">
							<Text className="text-xs font-bold tracking-wide text-foreground">
								{getInvoiceListInitials(item?.displayName)}
							</Text>
						</View>
						<View>
							<Text className="text-sm font-bold text-foreground">
								{state.referenceLabel}
							</Text>
							<Text className="mt-0.5 text-xs font-medium text-muted-foreground">
								{item?.displayName || "Unknown Customer"}
							</Text>
						</View>
					</View>
					<View
						className={`flex-row items-center gap-1 rounded-full border px-2.5 py-1 ${tone.chip}`}
					>
						<View className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
						<Text className={`text-[10px] font-bold uppercase ${tone.text}`}>
							{state.statusLabel}
						</Text>
					</View>
				</View>
			</View>

			<View className="px-4 py-3">
				<View className="mb-3 flex-row gap-2">
					<MetricChip
						label="Total"
						value={toInvoiceListMoney(state.total)}
						icon="ReceiptText"
					/>
					<MetricChip
						label="Paid"
						value={toInvoiceListMoney(state.paid)}
						icon="CircleDollarSign"
					/>
					<MetricChip
						label="Due"
						value={toInvoiceListMoney(state.due)}
						icon="Wallet"
					/>
				</View>
				<View className="mb-3">
					<View className="mb-1.5 flex-row items-center justify-between">
						<Text className="text-[11px] font-medium text-muted-foreground">
							{state.progressLabel}
						</Text>
						<Text className="text-[11px] font-semibold text-foreground">
							{state.paidPct.toFixed(0)}%
						</Text>
					</View>
					<View className="h-1.5 overflow-hidden rounded-full bg-muted">
						<View style={{ width: `${state.paidPct}%`, height: "100%" }}>
							<View className="h-full rounded-full bg-primary" />
						</View>
					</View>
				</View>
				<View className="flex-row items-center justify-between">
					<View className="flex-row items-center gap-2">
						<Icon name="Phone" className="text-muted-foreground" size={14} />
						<Text className="text-xs text-muted-foreground">
							{item?.customerPhone || "No phone"}
						</Text>
					</View>
					<View className="flex-row items-center gap-3">
						{type === "order" ? (
							<View className="flex-row items-center gap-1">
								<Icon
									name="Truck"
									className="text-muted-foreground"
									size={14}
								/>
								<Text className="text-xs text-muted-foreground">
									{item?.deliveryOption || "-"}
								</Text>
							</View>
						) : null}
						<View className="flex-row items-center gap-1">
							<Icon name="Clock" className="text-muted-foreground" size={14} />
							<Text className="text-xs text-muted-foreground">
								{disabled ? "Unavailable" : item?.salesDate || "-"}
							</Text>
						</View>
						<Icon
							name="ChevronRight"
							className="text-muted-foreground"
							size={16}
						/>
					</View>
				</View>
			</View>
		</Pressable>
	);
}
function MetricChip({
	label,
	value,
	icon,
}: {
	label: string;
	value: string;
	icon: IconKeys;
}) {
	return (
		<View className="flex-1 rounded-xl border border-border bg-background px-2.5 py-2">
			<View className="mb-1 flex-row items-center gap-1.5">
				<Icon name={icon} className="text-muted-foreground" size={12} />
				<Text className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
					{label}
				</Text>
			</View>
			<Text className="text-xs font-bold text-foreground">{value}</Text>
		</View>
	);
}

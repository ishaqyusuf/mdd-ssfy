import { Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { Text, View } from "react-native";
import {
	type SalesInvoiceListCardProps,
	getInvoiceListCardState,
	getInvoiceListDeliveryIcon,
	getInvoiceListInitials,
	getInvoiceListLedgerTone,
	toInvoiceListMoney,
} from "./sales-invoice-list-card-utils";

export function SalesInvoiceListCard2({
	type,
	item,
	onPress,
	disabled,
}: SalesInvoiceListCardProps) {
	const state = getInvoiceListCardState(type, item);
	const tone = getInvoiceListLedgerTone(state.statusLabel, state.due);
	const dueLabel = state.due > 0 ? "Remaining Due" : "Balance";
	const deliveryIcon = getInvoiceListDeliveryIcon(item?.deliveryOption);

	return (
		<Pressable
			haptic
			disabled={disabled}
			onPress={onPress}
			className={`mb-3 gap-4 rounded border border-border bg-card p-4 active:opacity-90 ${
				disabled ? "opacity-60" : ""
			}`}
		>
			<View className="flex-row items-start justify-between gap-3">
				<View className="min-w-0 flex-1 flex-row items-center gap-3">
					<View className="h-8 w-8 items-center justify-center rounded-full bg-primary">
						<Text className="text-[11px] font-bold text-primary-foreground">
							{getInvoiceListInitials(item?.displayName)}
						</Text>
					</View>
					<View className="min-w-0 flex-1">
						<Text
							numberOfLines={1}
							className="text-sm font-bold text-foreground"
						>
							{item?.displayName || "Unknown Customer"}
						</Text>
						<Text
							numberOfLines={1}
							className="mt-0.5 text-[10px] font-bold uppercase text-muted-foreground"
						>
							{state.referenceLabel} -{" "}
							{disabled ? "Unavailable" : item?.salesDate || "-"}
						</Text>
					</View>
				</View>

				<View className="flex-row items-center gap-1">
					<View className={`rounded-sm border px-2 py-0.5 ${tone.chip}`}>
						<Text
							className={`text-[10px] font-bold uppercase ${tone.chipText}`}
						>
							{state.statusLabel}
						</Text>
					</View>
					<View className="h-11 w-11 items-center justify-center">
						<Icon name="more" className="text-muted-foreground" size={20} />
					</View>
				</View>
			</View>

			<View className="flex-row gap-4">
				<LedgerAmount
					accentClassName="border-primary"
					label="Total Amount"
					value={toInvoiceListMoney(state.total)}
					valueClassName="text-foreground"
				/>
				<LedgerAmount
					accentClassName={tone.dueAccent}
					label={dueLabel}
					value={toInvoiceListMoney(state.due)}
					valueClassName={tone.dueText}
				/>
			</View>

			<View className="flex-row flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3">
				{type === "order" ? (
					<View className="flex-row items-center gap-1.5">
						<Icon
							name={deliveryIcon}
							className="text-muted-foreground"
							size={16}
						/>
						<Text className="text-[11px] font-medium text-muted-foreground">
							{item?.deliveryOption || "Standard"}
						</Text>
					</View>
				) : null}
				<View className="flex-row items-center gap-1.5">
					<Icon
						name="CircleDollarSign"
						className="text-muted-foreground"
						size={16}
					/>
					<Text className="text-[11px] font-medium text-muted-foreground">
						{state.due <= 0 ? "Full Paid" : `${state.paidPct.toFixed(0)}% Paid`}
					</Text>
				</View>
			</View>
		</Pressable>
	);
}

function LedgerAmount({
	accentClassName,
	label,
	value,
	valueClassName,
}: {
	accentClassName: string;
	label: string;
	value: string;
	valueClassName: string;
}) {
	return (
		<View className={`flex-1 border-l-2 py-1 pl-3 ${accentClassName}`}>
			<Text className="mb-0.5 text-[10px] font-bold uppercase text-muted-foreground">
				{label}
			</Text>
			<Text
				numberOfLines={1}
				adjustsFontSizeToFit
				className={`text-xl font-extrabold ${valueClassName}`}
			>
				{value}
			</Text>
		</View>
	);
}

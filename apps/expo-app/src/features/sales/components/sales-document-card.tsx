import { Icon, type IconKeys } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { Text, View } from "react-native";
import {
	type SalesDocumentListItem,
	type SalesDocumentListType,
	getQuoteInvoiceStatus,
} from "./sales-document-list";

type Props = {
	type: SalesDocumentListType;
	item: SalesDocumentListItem;
	onPress: () => void;
	disabled?: boolean;
};

function toMoney(value?: number | null) {
	return `$${Number(value || 0).toFixed(2)}`;
}

function initials(name?: string | null) {
	const raw = String(name || "-").trim();
	if (!raw || raw === "-") return "--";
	const parts = raw.split(/\s+/).filter(Boolean);
	if (parts.length === 1) return (parts[0] || "").slice(0, 2).toUpperCase();
	return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.toUpperCase();
}

function orderStatusTone(status?: string | null) {
	const value = String(status || "").toLowerCase();
	if (value.includes("completed")) {
		return {
			chip: "border-emerald-300 bg-emerald-500/10",
			text: "text-emerald-700 dark:text-emerald-300",
			dot: "bg-emerald-500",
		};
	}
	if (value.includes("progress")) {
		return {
			chip: "border-amber-300 bg-amber-500/10",
			text: "text-amber-700 dark:text-amber-300",
			dot: "bg-amber-500",
		};
	}
	return {
		chip: "border-border bg-muted",
		text: "text-muted-foreground",
		dot: "bg-muted-foreground",
	};
}

function quoteStatusTone(status: string) {
	if (status === "Paid") {
		return {
			chip: "border-emerald-300 bg-emerald-500/10",
			text: "text-emerald-700 dark:text-emerald-300",
			dot: "bg-emerald-500",
		};
	}
	if (status === "Part paid") {
		return {
			chip: "border-amber-300 bg-amber-500/10",
			text: "text-amber-700 dark:text-amber-300",
			dot: "bg-amber-500",
		};
	}
	return {
		chip: "border-border bg-muted",
		text: "text-muted-foreground",
		dot: "bg-muted-foreground",
	};
}

export function SalesDocumentCard({ type, item, onPress, disabled }: Props) {
	const total = Number(item?.invoice?.total || 0);
	const paid = Number(item?.invoice?.paid || 0);
	const due = Number(item?.invoice?.pending || 0);
	const paidPct =
		total > 0 ? Math.min(100, Math.max(0, (paid / total) * 100)) : 0;
	const quoteStatus = getQuoteInvoiceStatus(item);
	const statusLabel =
		type === "quote" ? quoteStatus : item?.deliveryStatus || "pending";
	const tone =
		type === "quote"
			? quoteStatusTone(quoteStatus)
			: orderStatusTone(statusLabel);
	const referenceLabel =
		type === "quote" ? `Quote #${item?.orderId || "-"}` : `#${item?.orderId}`;
	const progressLabel =
		type === "quote" ? "Quote Progress" : "Payment Progress";

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
								{initials(item?.displayName)}
							</Text>
						</View>
						<View>
							<Text className="text-sm font-bold text-foreground">
								{referenceLabel}
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
							{statusLabel}
						</Text>
					</View>
				</View>
			</View>

			<View className="px-4 py-3">
				<View className="mb-3 flex-row gap-2">
					<MetricChip label="Total" value={toMoney(total)} icon="ReceiptText" />
					<MetricChip
						label="Paid"
						value={toMoney(paid)}
						icon="CircleDollarSign"
					/>
					<MetricChip label="Due" value={toMoney(due)} icon="Wallet" />
				</View>

				<View className="mb-3">
					<View className="mb-1.5 flex-row items-center justify-between">
						<Text className="text-[11px] font-medium text-muted-foreground">
							{progressLabel}
						</Text>
						<Text className="text-[11px] font-semibold text-foreground">
							{paidPct.toFixed(0)}%
						</Text>
					</View>
					<View className="h-1.5 overflow-hidden rounded-full bg-muted">
						<View style={{ width: `${paidPct}%`, height: "100%" }}>
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

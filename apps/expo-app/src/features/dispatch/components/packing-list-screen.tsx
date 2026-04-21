import { SafeArea } from "@/components/safe-area";
import { Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { useAuthContext } from "@/hooks/use-auth";
import { formatDate } from "@gnd/utils/dayjs";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	RefreshControl,
	ScrollView,
	Text,
	View,
} from "react-native";
import { usePackingList } from "../api/use-packing-list";
import type { PackingListItem, PackingListTab } from "../types/dispatch.types";

type PackingListEntryMode = "packing" | "warehouse-packing";

function formatStatus(status?: string | null) {
	return String(status || "queue")
		.split("_")
		.join(" ")
		.replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDueDate(value?: Date | string | null) {
	return value ? formatDate(value) : "No due date";
}

function getStatusTone(status?: string | null) {
	switch (status) {
		case "completed":
			return "bg-success/10 text-success";
		case "in progress":
			return "bg-primary/10 text-primary";
		case "packed":
			return "bg-amber-100 text-amber-700";
		case "cancelled":
			return "bg-destructive/10 text-destructive";
		default:
			return "bg-secondary text-secondary-foreground";
	}
}

function buildAddress(item: PackingListItem) {
	return item.address || item.phone || "Address unavailable";
}

function openPackingDetail(
	router: ReturnType<typeof useRouter>,
	item: PackingListItem,
	entryMode: PackingListEntryMode,
) {
	const search = new URLSearchParams({
		salesNo: item.orderNo || "",
		openComplete: "0",
	}).toString();
	const pathname =
		entryMode === "warehouse-packing"
			? `/(drivers)/warehouse-packing/${item.dispatchId}`
			: `/(drivers)/dispatch/${item.dispatchId}`;
	router.push(`${pathname}?${search}`);
}

function PackingListCard({
	item,
	onOpen,
}: {
	item: PackingListItem;
	onOpen: () => void;
}) {
	return (
		<Pressable
			onPress={onOpen}
			className="mx-4 mb-4 rounded-2xl border border-border bg-card p-4 active:opacity-90"
		>
			<View className="flex-row items-start justify-between gap-3">
				<View className="flex-1">
					<View className="flex-row items-center gap-2">
						<Text className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
							Order #{item.orderNo || item.dispatchId}
						</Text>
						<View
							className={`rounded-full px-2 py-1 ${getStatusTone(item.status)}`}
						>
							<Text className="text-[10px] font-bold uppercase">
								{formatStatus(item.status)}
							</Text>
						</View>
					</View>
					<Text className="mt-2 text-lg font-bold text-foreground">
						{item.customerName || "Customer"}
					</Text>
					<Text className="mt-1 text-sm text-muted-foreground">
						{buildAddress(item)}
					</Text>
				</View>

				<View className="rounded-xl bg-muted px-3 py-2">
					<Text className="text-[10px] font-semibold uppercase tracking-[1px] text-muted-foreground">
						Due
					</Text>
					<Text className="mt-1 text-xs font-bold text-foreground">
						{formatDueDate(item.dueDate)}
					</Text>
				</View>
			</View>

			<View className="mt-4 flex-row items-center justify-between">
				<View className="flex-row items-center gap-2">
					<View className="rounded-full bg-primary/10 p-2">
						<Icon name="Package" className="text-primary" size={16} />
					</View>
					<View>
						<Text className="text-xs font-semibold uppercase tracking-[1px] text-muted-foreground">
							Packing Job
						</Text>
						<Text className="text-sm font-semibold text-foreground">
							Dispatch #{item.dispatchId}
						</Text>
					</View>
				</View>

				<View className="flex-row items-center gap-2">
					<Text className="text-sm font-semibold text-primary">Open</Text>
					<Icon name="ChevronRight" className="text-primary" size={16} />
				</View>
			</View>
		</Pressable>
	);
}

export function PackingListScreen({
	entryMode = "packing",
}: {
	entryMode?: PackingListEntryMode;
}) {
	const router = useRouter();
	const auth = useAuthContext();
	const [tab, setTab] = useState<PackingListTab>("current");
	const { items, isPending, isRefetching, refetch, error } = usePackingList({
		tab,
	});

	const visibleTabs = useMemo(
		() =>
			[
				{ key: "current", label: "Current" },
				{ key: "completed", label: "Completed" },
				...(auth.isAdmin ? [{ key: "cancelled", label: "Cancelled" }] : []),
			] as { key: PackingListTab; label: string }[],
		[auth.isAdmin],
	);

	const stats = useMemo(() => {
		const ready = items.filter((item) => item.status === "queue").length;
		const partiallyPacked = items.filter(
			(item) => item.status === "packed" || item.status === "in progress",
		).length;
		const completed = items.filter(
			(item) => item.status === "completed",
		).length;
		return {
			total: items.length,
			ready,
			partiallyPacked,
			completed,
		};
	}, [items]);

	return (
		<SafeArea>
			<View className="flex-1 bg-background">
				<View className="border-b border-border bg-card px-4 pb-4 pt-3">
					<View className="flex-row items-center gap-3">
						<Pressable
							onPress={() => router.back()}
							className="h-10 w-10 items-center justify-center rounded-full active:bg-muted"
						>
							<Icon name="ArrowLeft" className="text-foreground" size={20} />
						</Pressable>
						<View className="flex-1">
							<Text className="text-2xl font-bold text-foreground">
								{entryMode === "warehouse-packing"
									? "Warehouse Packing"
									: "Packing List"}
							</Text>
							<Text className="mt-1 text-sm text-muted-foreground">
								{entryMode === "warehouse-packing"
									? "Separate packing workspace for warehouse team operations."
									: "Warehouse and pickup jobs ready for mobile packing workflow."}
							</Text>
						</View>
					</View>

					<View className="mt-4 flex-row gap-3">
						<View className="flex-1 rounded-2xl bg-primary p-4">
							<Text className="text-xs font-semibold uppercase tracking-[1px] text-primary-foreground/80">
								Total Jobs
							</Text>
							<Text className="mt-2 text-3xl font-bold text-primary-foreground">
								{stats.total}
							</Text>
						</View>
						<View className="flex-1 rounded-2xl border border-border bg-background p-4">
							<Text className="text-xs font-semibold uppercase tracking-[1px] text-muted-foreground">
								Ready / Active
							</Text>
							<Text className="mt-2 text-3xl font-bold text-foreground">
								{stats.ready + stats.partiallyPacked}
							</Text>
						</View>
					</View>

					<View className="mt-3 flex-row gap-3">
						<View className="flex-1 rounded-2xl border border-border bg-background p-4">
							<Text className="text-xs font-semibold uppercase tracking-[1px] text-muted-foreground">
								Ready To Pack
							</Text>
							<Text className="mt-2 text-2xl font-bold text-foreground">
								{stats.ready}
							</Text>
						</View>
						<View className="flex-1 rounded-2xl border border-border bg-background p-4">
							<Text className="text-xs font-semibold uppercase tracking-[1px] text-muted-foreground">
								Partially Packed
							</Text>
							<Text className="mt-2 text-2xl font-bold text-foreground">
								{stats.partiallyPacked}
							</Text>
						</View>
					</View>

					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						contentContainerClassName="mt-4 gap-2 pr-2"
					>
						{visibleTabs.map((item) => {
							const active = tab === item.key;
							return (
								<Pressable
									key={item.key}
									onPress={() => setTab(item.key)}
									className={`rounded-full border px-4 py-2 ${
										active
											? "border-primary bg-primary/10"
											: "border-border bg-background"
									}`}
								>
									<Text
										className={`text-sm font-semibold ${
											active ? "text-primary" : "text-muted-foreground"
										}`}
									>
										{item.label}
									</Text>
								</Pressable>
							);
						})}
					</ScrollView>
				</View>

				{isPending ? (
					<View className="flex-1 items-center justify-center">
						<ActivityIndicator />
					</View>
				) : error ? (
					<View className="flex-1 items-center justify-center px-6">
						<Text className="text-center text-sm text-muted-foreground">
							Unable to load the packing list right now.
						</Text>
						<Pressable
							onPress={() => refetch()}
							className="mt-4 rounded-full bg-primary px-4 py-2"
						>
							<Text className="font-semibold text-primary-foreground">
								Retry
							</Text>
						</Pressable>
					</View>
				) : (
					<FlatList
						data={items}
						keyExtractor={(item) => String(item.dispatchId)}
						refreshControl={
							<RefreshControl
								refreshing={isRefetching}
								onRefresh={() => refetch()}
							/>
						}
						contentContainerClassName="py-4"
						renderItem={({ item }) => (
							<PackingListCard
								item={item}
								onOpen={() => openPackingDetail(router, item, entryMode)}
							/>
						)}
						ListEmptyComponent={
							<View className="mx-4 mt-8 items-center rounded-2xl border border-dashed border-border p-8">
								<Text className="text-lg font-semibold text-foreground">
									No packing jobs
								</Text>
								<Text className="mt-2 text-center text-sm text-muted-foreground">
									There are no jobs in the {tab} packing queue right now.
								</Text>
							</View>
						}
						ListFooterComponent={<View className="h-6" />}
					/>
				)}
			</View>
		</SafeArea>
	);
}

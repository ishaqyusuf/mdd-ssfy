import { Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { useDebounce } from "@/hooks/use-debounce";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
	ActivityIndicator,
	SectionList,
	Text,
	TextInput,
	View,
} from "react-native";
import { useDriverWorkQueue } from "../api/use-driver-work-queue";
import { useDispatchSyncState } from "../hooks/use-dispatch-sync-state";
import { buildDriverWorkQueueSections } from "../lib/driver-work-queue-model";
import type { DispatchListItem } from "../types/dispatch.types";
import { DriverDashboardDispatchItem } from "./driver-dashboard-dispatch-item";

type DriverView = "today" | "all" | "exceptions" | "completed";

function openDispatch(
	router: ReturnType<typeof useRouter>,
	item: DispatchListItem,
	options?: { openComplete?: boolean },
) {
	router.push({
		pathname: "/(drivers)/dispatch/[dispatchId]",
		params: {
			dispatchId: String(item.id),
			salesNo: item.order?.orderId || "",
			openComplete: options?.openComplete ? "1" : "0",
		},
	} as never);
}

export function DispatchListScreen() {
	const router = useRouter();
	const [view, setView] = useState<DriverView>("today");
	const [search, setSearch] = useState("");
	const debouncedSearch = useDebounce(search.trim(), 350);
	const filter = useMemo<RouterInputs["dispatch"]["driverManifest"]>(
		() =>
			view === "today"
				? { dueBuckets: ["overdue", "today"], q: debouncedSearch || undefined }
				: view === "exceptions"
					? { risks: ["open_exception"], q: debouncedSearch || undefined }
					: view === "completed"
						? { tab: "completed" as const, q: debouncedSearch || undefined }
						: { tab: "all" as const, q: debouncedSearch || undefined },
		[debouncedSearch, view],
	);
	const {
		items,
		summary,
		nextStop,
		refetch,
		isPending,
		isRefetching,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		error,
		dataUpdatedAt,
		isFetching,
	} = useDriverWorkQueue(filter);
	const sync = useDispatchSyncState({
		dataUpdatedAt,
		isFetching,
		isError: Boolean(error),
	});
	const canTriggerEndReached = useRef(true);
	const sections = useMemo(() => buildDriverWorkQueueSections(items), [items]);
	const tabs = [
		{ key: "today" as const, label: "Today" },
		{ key: "all" as const, label: "All stops" },
		{ key: "exceptions" as const, label: "Exceptions" },
		{ key: "completed" as const, label: "Completed" },
	];
	const syncCopy = {
		checking: ["Checking connection", "Confirming current network state."],
		offline: [
			"Offline",
			`${sync.lastSyncLabel}. Saved proof remains on this device.`,
		],
		syncing: ["Syncing dispatches", sync.lastSyncLabel],
		failed: [
			"Sync needs attention",
			`${sync.lastSyncLabel}. Pull down to retry.`,
		],
		synced: ["Dispatches synced", sync.lastSyncLabel],
	} as const;
	const [syncTitle, syncDescription] = syncCopy[sync.state];

	const header = (
		<View className="gap-4 pb-4">
			<View className="px-4 pt-12">
				<View className="flex-row items-center gap-3">
					<Pressable
						onPress={() => router.back()}
						className="size-10 items-center justify-center rounded-full active:bg-muted"
					>
						<Icon name="ArrowLeft" className="text-foreground" size={20} />
					</Pressable>
					<View className="flex-1">
						<Text className="text-2xl font-bold text-foreground">
							Driver Dispatch
						</Text>
						<Text className="mt-1 text-sm text-muted-foreground">
							Your assigned stops, route work, and delivery proof.
						</Text>
					</View>
					<Pressable
						onPress={() => router.push("/(drivers)/settings" as never)}
						className="size-10 items-center justify-center rounded-full border border-border"
					>
						<Icon name="Settings" className="text-foreground" size={19} />
					</Pressable>
				</View>
			</View>

			<View className="mx-4 flex-row items-center gap-3 rounded-xl border border-border bg-card p-3">
				<View className="size-9 items-center justify-center rounded-full bg-success/10">
					<Icon
						name={
							sync.state === "offline" || sync.state === "failed"
								? "TriangleAlert"
								: "CheckCircle2"
						}
						className={
							sync.state === "offline" || sync.state === "failed"
								? "text-destructive"
								: "text-success"
						}
						size={18}
					/>
				</View>
				<View className="flex-1">
					<Text className="text-sm font-semibold text-foreground">
						{syncTitle}
					</Text>
					<Text className="text-xs text-muted-foreground">
						{syncDescription}
					</Text>
				</View>
			</View>

			<View className="mx-4 flex-row gap-2">
				{tabs.map((tab) => (
					<Pressable
						key={tab.key}
						onPress={() => setView(tab.key)}
						className={
							view === tab.key
								? "flex-1 items-center rounded-lg bg-primary px-3 py-2.5"
								: "flex-1 items-center rounded-lg border border-border bg-background px-3 py-2.5"
						}
					>
						<Text
							className={
								view === tab.key
									? "text-xs font-bold text-primary-foreground"
									: "text-xs font-semibold text-muted-foreground"
							}
						>
							{tab.label}
						</Text>
					</Pressable>
				))}
			</View>

			<View className="mx-4 h-11 flex-row items-center rounded-xl border border-border bg-background px-3">
				<Icon name="Search" className="text-muted-foreground" size={17} />
				<TextInput
					value={search}
					onChangeText={setSearch}
					placeholder="Search order, customer, phone, or address"
					className="ml-2 flex-1 text-sm text-foreground"
					returnKeyType="search"
				/>
			</View>

			{view !== "exceptions" && nextStop ? (
				<DriverDashboardDispatchItem
					item={nextStop}
					featured
					onOpen={() => openDispatch(router, nextStop)}
					onComplete={() =>
						openDispatch(router, nextStop, { openComplete: true })
					}
				/>
			) : null}

			<View className="mx-4 grid-cols-3 flex-row gap-2">
				<View className="flex-1 rounded-xl border border-border bg-card p-3">
					<Text className="text-xs text-muted-foreground">Assigned</Text>
					<Text className="mt-1 text-xl font-bold text-foreground">
						{summary?.total || 0}
					</Text>
				</View>
				<View className="flex-1 rounded-xl border border-border bg-card p-3">
					<Text className="text-xs text-muted-foreground">In progress</Text>
					<Text className="mt-1 text-xl font-bold text-foreground">
						{summary?.inProgress || 0}
					</Text>
				</View>
				<View className="flex-1 rounded-xl border border-border bg-card p-3">
					<Text className="text-xs text-muted-foreground">Overdue</Text>
					<Text className="mt-1 text-xl font-bold text-foreground">
						{summary?.byDueBucket.overdue || 0}
					</Text>
				</View>
			</View>
		</View>
	);

	if (isPending) {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<ActivityIndicator />
			</View>
		);
	}

	return (
		<View className="flex-1 bg-background">
			<SectionList
				sections={sections}
				keyExtractor={(item) => String(item.id)}
				ListHeaderComponent={header}
				renderSectionHeader={({ section }) => (
					<View className="bg-background px-4 pb-2 pt-3">
						<Text className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
							{section.title}
						</Text>
					</View>
				)}
				renderItem={({ item, index }) => (
					<DriverDashboardDispatchItem
						item={item}
						index={index}
						onOpen={() => openDispatch(router, item)}
						onComplete={() =>
							openDispatch(router, item, { openComplete: true })
						}
					/>
				)}
				refreshing={isRefetching}
				onRefresh={() => refetch()}
				onMomentumScrollBegin={() => {
					canTriggerEndReached.current = true;
				}}
				onEndReachedThreshold={0.3}
				onEndReached={() => {
					if (!canTriggerEndReached.current) return;
					if (!hasNextPage || isFetchingNextPage) return;
					canTriggerEndReached.current = false;
					void fetchNextPage();
				}}
				ListEmptyComponent={
					<View className="mx-4 mt-8 items-center rounded-2xl border border-dashed border-border p-8">
						<Icon
							name="ClipboardCheck"
							className="text-muted-foreground"
							size={28}
						/>
						<Text className="mt-3 text-lg font-semibold text-foreground">
							No stops in this view
						</Text>
						<Text className="mt-1 text-center text-sm text-muted-foreground">
							Assigned work appears automatically when dispatch support updates
							your manifest.
						</Text>
					</View>
				}
				ListFooterComponent={
					isFetchingNextPage ? (
						<View className="py-4">
							<ActivityIndicator />
						</View>
					) : (
						<View className="h-8" />
					)
				}
			/>
		</View>
	);
}

import { Icon } from "@/components/ui/icon";
import { GeneralHomeHeader } from "@/components/home/general-home-header";
import { useNotifications } from "@/hooks/use-notifications";
import { useDriverWorkQueue } from "@/features/dispatch/api/use-driver-work-queue";
import { DriverDashboardDispatchItem } from "@/features/dispatch/components/driver-dashboard-dispatch-item";
import { buildDriverWorkQueueSections } from "@/features/dispatch/lib/driver-work-queue-model";
import type { DispatchListItem } from "@/features/dispatch/types/dispatch.types";
import { useRouter } from "expo-router";
import { useMemo, useRef } from "react";
import {
	ActivityIndicator,
	Pressable,
	SectionList,
	Text,
	View,
} from "react-native";
import { SafeArea } from "@/components/safe-area";

function openDispatch(
	router: ReturnType<typeof useRouter>,
	item: DispatchListItem,
) {
	openDispatchWithOptions(router, item, {});
}

function openDispatchWithOptions(
	router: ReturnType<typeof useRouter>,
	item: DispatchListItem,
	options: { openComplete?: boolean },
) {
	const search = new URLSearchParams({
		salesNo: item?.order?.orderId || "",
		openComplete: options.openComplete ? "1" : "0",
		source: "dispatch",
	}).toString();
	router.push(`/(drivers)/dispatch/${item.id}?${search}`);
}

export default function DriverDispatchListRoute() {
	const router = useRouter();
	const canTriggerEndReached = useRef(true);
	const { hasUnseenNotifications } = useNotifications();

	const {
		items,
		refetch,
		isPending,
		isRefetching,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		error,
		summary,
	} = useDriverWorkQueue({});

	const stats = useMemo(() => {
		return {
			assigned: summary?.total ?? items.length,
			inProgress:
				summary?.inProgress ??
				items.filter((item) => item?.status === "in progress").length,
		};
	}, [items, summary]);

	const sections = useMemo(() => buildDriverWorkQueueSections(items), [items]);

	return (
		<SafeArea>
			<View className="flex-1 bg-background">
				<GeneralHomeHeader
					showNotificationDot={hasUnseenNotifications}
					nameMode="first_uppercase"
					// className="px-4 pb-6"
				/>

				{isPending ? (
					<View className="flex-1 items-center justify-center">
						<ActivityIndicator />
					</View>
				) : error ? (
					<View className="flex-1 items-center justify-center px-6">
						<Text className="text-center text-sm text-muted-foreground">
							Unable to load dispatches right now.
						</Text>
						<Pressable
							onPress={() => refetch()}
							className="mt-4 rounded-full bg-primary px-4 py-2 active:opacity-80"
						>
							<Text className="font-semibold text-primary-foreground">
								Retry
							</Text>
						</Pressable>
					</View>
				) : (
					<SectionList
						sections={sections}
						keyExtractor={(item) => String(item.id)}
						initialNumToRender={10}
						windowSize={10}
						refreshing={isRefetching}
						onRefresh={() => refetch()}
						contentContainerClassName="pb-8"
						ListHeaderComponent={
							<View>
								<View className="px-4 pb-5 pt-5">
									<View className="flex-row gap-3.5">
										<View className="flex-1 rounded-xl bg-primary p-5">
											<View className="mb-1 flex-row items-center justify-between">
												<Icon
													name="ClipboardList"
													className="text-primary-foreground/90"
													size={18}
												/>
												<View className="rounded-full bg-primary-foreground/20 px-2 py-0.5">
													<Text className="text-[10px] font-bold uppercase tracking-[1px] text-primary-foreground">
														Active
													</Text>
												</View>
											</View>
											<Text className="text-xs font-medium uppercase tracking-[1px] text-primary-foreground/80">
												Assigned
											</Text>
											<Text className="text-3xl font-bold text-primary-foreground">
												{stats.assigned}
											</Text>
										</View>

										<View className="flex-1 rounded-xl border border-border bg-muted p-5">
											<View className="mb-1 flex-row items-center justify-between">
												<Icon name="Truck" className="text-primary" size={18} />
											</View>
											<Text className="text-xs font-medium uppercase tracking-[1px] text-muted-foreground">
												In Progress
											</Text>
											<Text className="text-3xl font-bold text-foreground">
												{stats.inProgress}
											</Text>
										</View>
									</View>
								</View>

								<View className="px-4 pb-3 pt-1">
									<View className="mb-2 flex-row items-center justify-between">
										<View className="flex-row items-center gap-2">
											<Icon
												name="Calendar"
												className="text-primary"
												size={18}
											/>
											<Text className="text-base font-bold text-foreground">
												Delivery Schedule
											</Text>
										</View>
										<Pressable
											onPress={() => router.push("/(drivers)/dispatch/all")}
										>
											<Text className="text-xs font-semibold text-primary">
												View All
											</Text>
										</Pressable>
									</View>
									<View className="flex-row gap-2">
										<View className="rounded-full bg-destructive/10 px-3 py-1.5">
											<Text className="text-xs font-bold text-destructive">
												{summary?.byDueBucket.overdue ?? 0} overdue
											</Text>
										</View>
										<View className="rounded-full bg-primary/10 px-3 py-1.5">
											<Text className="text-xs font-bold text-primary">
												{summary?.byDueBucket.today ?? 0} due today
											</Text>
										</View>
									</View>
								</View>
							</View>
						}
						renderSectionHeader={({ section }) => (
							<View className="bg-background px-4 pb-3 pt-4">
								<Text
									className={`text-sm font-black uppercase tracking-[1px] ${
										section.title === "Overdue"
											? "text-destructive"
											: "text-foreground"
									}`}
								>
									{section.title} ({section.data.length})
								</Text>
							</View>
						)}
						renderItem={({ item, index }) => {
							const onOpen = () => openDispatch(router, item);
							const onComplete = () =>
								openDispatchWithOptions(router, item, { openComplete: true });
							return (
								<DriverDashboardDispatchItem
									item={item}
									index={index}
									onOpen={onOpen}
									onComplete={onComplete}
								/>
							);
						}}
						ListEmptyComponent={
							<View className="mx-4 mt-4 items-center rounded-xl border border-dashed border-border p-8">
								<Text className="text-base font-semibold text-foreground">
									No active deliveries
								</Text>
								<Text className="mt-1 text-center text-sm text-muted-foreground">
									Pull to refresh or open View All for completed work.
								</Text>
							</View>
						}
						onMomentumScrollBegin={() => {
							canTriggerEndReached.current = true;
						}}
						onEndReachedThreshold={0.3}
						onEndReached={() => {
							if (!canTriggerEndReached.current) return;
							if (!hasNextPage || isFetchingNextPage) return;
							canTriggerEndReached.current = false;
							fetchNextPage();
						}}
						ListFooterComponent={
							isFetchingNextPage ? (
								<View className="py-4">
									<ActivityIndicator />
								</View>
							) : null
						}
					/>
				)}
			</View>
		</SafeArea>
	);
}

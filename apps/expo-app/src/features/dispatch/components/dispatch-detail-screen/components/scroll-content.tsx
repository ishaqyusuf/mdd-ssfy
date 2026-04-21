import { ActivityHistory } from "@/components/chat/activity-history";
import { Icon } from "@/components/ui/icon";
import { Image } from "expo-image";
import {
	Pressable,
	RefreshControl,
	ScrollView,
	Text,
	View,
} from "react-native";
import { useDispatchDetailScreen } from "./screen-context";

function formatDispatchStatusLabel(status?: string | null) {
	if (!status) return "Queue";
	return status
		.split("_")
		.join(" ")
		.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function DispatchDetailScrollContent() {
	const vm = useDispatchDetailScreen();

	return (
		<ScrollView
			className="flex-1"
			contentContainerStyle={{
				paddingHorizontal: 16,
				paddingTop: 16,
				paddingBottom: 24,
			}}
			refreshControl={
				<RefreshControl refreshing={vm.isRefetching} onRefresh={vm.onRefresh} />
			}
		>
			{vm.entryMode === "packing" || vm.entryMode === "warehouse-packing" ? (
				<View className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-5">
					<View className="flex-row items-center justify-between gap-3">
						<View className="flex-1">
							<Text className="text-xs font-semibold uppercase tracking-[1px] text-primary">
								{vm.entryMode === "warehouse-packing"
									? "Warehouse Workspace"
									: "Packing Workspace"}
							</Text>
							<Text className="mt-2 text-lg font-bold text-foreground">
								{vm.entryMode === "warehouse-packing"
									? "Review packable quantities and update slips without mixing driver trip actions."
									: "Review quantities, update the slip, and confirm the pickup handoff."}
							</Text>
						</View>
						<View className="rounded-full bg-primary/10 p-3">
							<Icon name="Package" className="text-primary" size={18} />
						</View>
					</View>

					<View className="mt-4 flex-row gap-3">
						<View className="flex-1 rounded-xl bg-card px-3 py-3">
							<Text className="text-[11px] font-semibold uppercase tracking-[1px] text-muted-foreground">
								Items
							</Text>
							<Text className="mt-1 text-2xl font-bold text-foreground">
								{vm.packingWorkspaceStats?.totalItems || 0}
							</Text>
						</View>
						<View className="flex-1 rounded-xl bg-card px-3 py-3">
							<Text className="text-[11px] font-semibold uppercase tracking-[1px] text-muted-foreground">
								Remaining Qty
							</Text>
							<Text className="mt-1 text-2xl font-bold text-foreground">
								{vm.packingWorkspaceStats?.remainingQty || 0}
							</Text>
						</View>
					</View>

					<View className="mt-3 flex-row gap-3">
						<View className="flex-1 rounded-xl bg-card px-3 py-3">
							<Text className="text-[11px] font-semibold uppercase tracking-[1px] text-muted-foreground">
								Packed Items
							</Text>
							<Text className="mt-1 text-xl font-bold text-foreground">
								{vm.packingWorkspaceStats?.packedItems || 0}
							</Text>
						</View>
						<View className="flex-1 rounded-xl bg-card px-3 py-3">
							<Text className="text-[11px] font-semibold uppercase tracking-[1px] text-muted-foreground">
								Remaining Items
							</Text>
							<Text className="mt-1 text-xl font-bold text-foreground">
								{vm.packingWorkspaceStats?.remainingItems || 0}
							</Text>
						</View>
					</View>
				</View>
			) : null}

			<View className="mb-6 rounded-xl border border-border bg-card p-5">
				<View className="flex-row items-center justify-between gap-3">
					<View className="flex-1">
						<Text className="text-xs font-semibold uppercase tracking-[1px] text-muted-foreground">
							Current Status
						</Text>
						<View className="mt-1 flex-row items-center gap-2">
							<View className="h-2.5 w-2.5 rounded-full bg-primary" />
							<Text className="text-base font-bold capitalize text-foreground">
								{vm.statusText}
							</Text>
						</View>
					</View>
					<Pressable
						disabled={vm.isPrimaryActionDisabled}
						onPress={vm.onPrimaryStatusAction}
						className="min-w-[100px] items-center justify-center rounded-lg bg-primary px-4 py-2.5 active:opacity-90 disabled:opacity-50"
					>
						<Text className="text-sm font-semibold text-primary-foreground">
							{vm.isPrimaryActionPending
								? "Updating..."
								: vm.primaryStatusActionLabel}
						</Text>
					</Pressable>
				</View>
			</View>

			{vm.showDriverDuplicateAlert ? (
				<View className="mb-6 rounded-xl border border-amber-400/50 bg-amber-50 px-4 py-4 dark:bg-amber-950/25">
					<View className="flex-row items-start gap-3">
						<View className="mt-0.5 h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
							<Icon
								name="AlertCircle"
								className="text-amber-700 dark:text-amber-300"
								size={16}
							/>
						</View>
						<View className="flex-1">
							<Text className="text-sm font-bold text-amber-900 dark:text-amber-100">
								Duplicate dispatch detected
							</Text>
							<Text className="mt-1 text-xs leading-5 text-amber-800 dark:text-amber-200">
								This dispatch order has duplicates and may cause malfunction.
							</Text>
							<Pressable
								onPress={vm.onNotifyDuplicateDispatchToAdmin}
								disabled={vm.isNotificationPending}
								className="mt-3 h-10 items-center justify-center rounded-lg bg-amber-600 px-3 disabled:opacity-60"
							>
								<Text className="text-sm font-semibold text-amber-50">
									{vm.isNotificationPending ? "Notifying..." : "Notify Admin"}
								</Text>
							</Pressable>
						</View>
					</View>
				</View>
			) : null}

			{vm.showAdminDuplicateCard ? (
				<View className="mb-6 rounded-xl border border-border bg-card p-4">
					<View className="flex-row items-center justify-between">
						<Text className="text-base font-bold text-foreground">
							Duplicate Dispatches
						</Text>
						<View
							className={`rounded-full px-2 py-1 ${
								vm.hasDuplicateDispatch
									? "bg-amber-100 dark:bg-amber-900/40"
									: "bg-success/10"
							}`}
						>
							<Text
								className={`text-[10px] font-bold uppercase ${
									vm.hasDuplicateDispatch
										? "text-amber-700 dark:text-amber-300"
										: "text-success"
								}`}
							>
								{vm.hasDuplicateDispatch ? "Detected" : "No Duplicate"}
							</Text>
						</View>
					</View>
					{vm.hasDuplicateDispatch ? (
						<View className="mt-3 gap-2">
							{vm.duplicateDispatches.map((item: any) => {
								const isRecommended =
									item.id === vm.duplicateInsight?.recommendedKeepDispatchId;
								const isCurrent =
									item.id === vm.duplicateInsight?.currentDispatchId;
								return (
									<View
										key={item.id}
										className="rounded-lg border border-border/80 bg-background px-3 py-2"
									>
										<View className="flex-row items-center justify-between gap-3">
											<Text className="text-sm font-semibold text-foreground">
												#DISP-{item.id}
											</Text>
											<Text className="text-xs font-medium capitalize text-muted-foreground">
												{formatDispatchStatusLabel(item.status)}
											</Text>
										</View>
										<View className="mt-1 flex-row flex-wrap items-center gap-2">
											{isCurrent ? (
												<View className="rounded-full bg-primary/10 px-2 py-0.5">
													<Text className="text-[10px] font-semibold uppercase text-primary">
														Current
													</Text>
												</View>
											) : null}
											{isRecommended ? (
												<View className="rounded-full bg-success/10 px-2 py-0.5">
													<Text className="text-[10px] font-semibold uppercase text-success">
														Recommended Keep
													</Text>
												</View>
											) : null}
											<Text className="text-[11px] text-muted-foreground">
												{item.packedItemCount}/{item.itemCount} items packed
											</Text>
										</View>
									</View>
								);
							})}
						</View>
					) : (
						<Text className="mt-2 text-xs text-muted-foreground">
							No duplicate dispatch found for this sales order.
						</Text>
					)}
				</View>
			) : null}

			{vm.showTripCancelCard ? (
				<View className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
					<View className="flex-row items-center justify-between gap-3">
						<View className="flex-1">
							<Text className="text-sm font-bold text-foreground">
								Trip in progress
							</Text>
							<Text className="mt-1 text-xs text-muted-foreground">
								Cancel this trip if delivery can no longer continue.
							</Text>
						</View>
						<Pressable
							onPress={vm.onCancelTrip}
							disabled={vm.isCancelTripPending}
							className="h-10 items-center justify-center rounded-lg bg-destructive px-4 disabled:opacity-50"
						>
							<Text className="text-xs font-bold uppercase text-destructive-foreground">
								{vm.isCancelTripPending ? "Cancelling..." : "Cancel Trip"}
							</Text>
						</Pressable>
					</View>
				</View>
			) : null}

			<View className="mb-6">
				<Text className="mb-3 text-xl font-bold text-foreground">
					Delivery Details
				</Text>
				<View className="gap-4">
					<View className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3">
						<View className="h-14 w-14 overflow-hidden rounded-full border-2 border-primary/20">
							<View className="h-full w-full bg-primary/10">
								<Icon name="User" className="m-auto text-primary" size={22} />
							</View>
						</View>
						<View className="flex-1">
							<Text className="text-base font-bold text-foreground">
								{vm.customerName}
							</Text>
							<Text className="text-sm font-medium text-muted-foreground">
								{vm.customerPhone || vm.customerEmail || "Customer"}
							</Text>
						</View>
						<View className="flex-row gap-2">
							<Pressable className="rounded-full bg-primary/10 p-2">
								<Icon name="Phone" className="text-primary" size={18} />
							</Pressable>
							<Pressable className="rounded-full bg-primary/10 p-2">
								<Icon name="Mail" className="text-primary" size={18} />
							</Pressable>
						</View>
					</View>

					<View className="flex-row items-start gap-3 rounded-xl border border-border bg-card p-3">
						<View className="h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
							<Icon name="MapPin" className="text-primary" size={20} />
						</View>
						<View className="flex-1 pt-1">
							<Text className="text-base font-bold leading-tight text-foreground">
								{vm.addressLine1 || "Address unavailable"}
							</Text>
							<Text className="mt-0.5 text-sm font-medium text-muted-foreground">
								{vm.addressLine2 || vm.customerPhone || vm.customerEmail || ""}
							</Text>
						</View>
						<Pressable className="mt-1 rounded-full bg-primary/10 p-2">
							<Icon name="LocateIcon" className="text-primary" size={18} />
						</Pressable>
					</View>
				</View>
			</View>

			<View className="mb-6">
				<View className="mb-3 flex-row items-center justify-between">
					<Text className="text-xl font-bold text-foreground">
						Packing List
					</Text>
					<View className="rounded-full bg-primary/10 px-2 py-1">
						<Text className="text-xs font-bold text-primary">
							{vm.itemsCount} Items
						</Text>
					</View>
				</View>
				<View className="overflow-hidden rounded-xl border border-border">
					{vm.topPackingItems.map((item: any, index: number) => {
						const itemImage = vm.resolveItemImage(item.img as string | null);
						const deliverableTotal = vm.totalQty(
							vm.resolvedAvailableQty(item) as any,
						);
						const packedTotal = vm.totalQty((item as any).listedQty as any);
						const unpackedTotal = Math.max(0, deliverableTotal - packedTotal);
						const isPacked = deliverableTotal > 0 && unpackedTotal <= 0;
						return (
							<Pressable
								key={item.uid}
								onPress={() => vm.onSelectPackingItem(item.uid)}
								className={`flex-row items-center justify-between bg-card p-4 ${
									index < vm.topPackingItems.length - 1
										? "border-b border-border"
										: ""
								}`}
							>
								<View className="flex-row items-center gap-3">
									{itemImage ? (
										<Pressable
											onPress={(event) => {
												event.stopPropagation();
												vm.onImagePress(itemImage);
											}}
										>
											<Image
												source={{ uri: itemImage }}
												style={{
													width: 40,
													height: 40,
													borderRadius: 8,
													backgroundColor: "#F4F4F5",
												}}
												contentFit="cover"
											/>
										</Pressable>
									) : (
										<View className="h-10 w-10 items-center justify-center rounded-lg bg-muted">
											<Icon
												name="HardHat"
												className="text-muted-foreground"
												size={18}
											/>
										</View>
									)}
									<View className="max-w-[220px]">
										<Text className="text-sm font-medium text-foreground">
											{item.title}
										</Text>
										<Text className="mt-0.5 text-xs uppercase text-muted-foreground">
											{item.subtitle ||
												item.sectionTitle ||
												"No size/type details"}
										</Text>
									</View>
								</View>
								<View className="items-end gap-1">
									<View
										className={`rounded-full px-2 py-1 ${
											isPacked ? "bg-success/10" : "bg-warn/10"
										}`}
									>
										<Text
											className={`text-[10px] font-bold uppercase ${
												isPacked ? "text-success" : "text-warn"
											}`}
										>
											{isPacked ? "Packed" : "Unpacked"}
										</Text>
									</View>
									<Text className="text-xs font-medium text-muted-foreground">
										{packedTotal}/{deliverableTotal}
									</Text>
								</View>
							</Pressable>
						);
					})}
				</View>

				{vm.showPackingButtons ? (
					<View className="mt-4 flex-row gap-3">
						<Pressable
							disabled={vm.isUpdatePackingDisabled}
							onPress={vm.onOpenUpdatePacking}
							className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3 disabled:opacity-50"
						>
							<Icon
								name="CheckSquare"
								className="text-primary-foreground"
								size={18}
							/>
							<Text className="text-sm font-bold text-primary-foreground">
								Update Packing
							</Text>
						</Pressable>
						<Pressable
							onPress={vm.onResetPacking}
							disabled={vm.isResetPackingDisabled}
							className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border-2 border-border py-3 disabled:opacity-50"
						>
							<Icon name="Loader2" className="text-foreground" size={18} />
							<Text className="text-sm font-bold text-foreground">
								Reset Packing
							</Text>
						</Pressable>
					</View>
				) : null}

				{vm.showUnpackableHint ? (
					<Pressable
						onPress={vm.onOpenSalesRequestModal}
						className="mt-3 h-11 flex-row items-center justify-center rounded-xl border border-amber-400/40 bg-amber-50 dark:bg-amber-950/30"
					>
						<Text className="text-xs font-semibold text-amber-700 dark:text-amber-300">
							Packing not available for {vm.unpackableCount} items
						</Text>
					</Pressable>
				) : null}
			</View>

			<View className="mb-4 pb-8">
				<Text className="mb-4 text-xl font-bold text-foreground">
					Activity History
				</Text>
				<ActivityHistory
					tags={[
						{ tagName: "dispatchId", tagValue: Number(vm.activeDispatchId) },
					]}
					emptyText="No activity history yet for this dispatch."
					refreshToken={vm.activityRefreshToken}
				/>
			</View>
		</ScrollView>
	);
}

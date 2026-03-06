import { BlurView } from "@/components/blur-view";
import { SafeArea } from "@/components/safe-area";
import { Icon } from "@/components/ui/icon";
import { useModal } from "@/components/ui/modal";
import { Toast } from "@/components/ui/toast";
import { useNotificationTrigger } from "@/hooks/use-notification-trigger";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	ActivityIndicator,
	Pressable,
	RefreshControl,
	ScrollView,
	Text,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatchActions } from "../../api/use-dispatch-actions";
import { useDispatchOverview } from "../../api/use-dispatch-overview";
import { useDispatchPacking } from "../../api/use-dispatch-packing";
import { formatDispatchDate, totalQty } from "../../lib/format-dispatch";
import { buildPackingPayload } from "../../lib/packing-payload";
import { useDispatchUiState } from "../../state/use-dispatch-ui-state";
import { DispatchDetailProvider, useDispatchDetailContext } from "./context";
import { useDispatchDetailUiState } from "./hooks/use-dispatch-detail-ui-state";
import { usePackingSlipDrafts } from "./hooks/use-packing-slip-drafts";
import { useSalesRequestPacking } from "./hooks/use-sales-request-packing";
import { resolveItemImage } from "./lib/resolve-item-image";
import { DispatchPackingDelayModal } from "./modals/dispatch-packing-delay-modal";
import { ImagePreviewModal } from "./modals/image-preview-modal";
import { PackAllModal } from "./modals/pack-all-modal";
import { PackingItemModal } from "./modals/packing-item-modal";
import { SalesRequestPackingModal } from "./modals/sales-request-packing-modal";
import { CompleteDispatchScreen } from "./subscreens/complete-dispatch-screen";
import { DispatchConfirmScreen } from "./subscreens/dispatch-confirm-screen";
import { IssueReportScreen } from "./subscreens/issue-report-screen";
import { PackingSlipScreen } from "./subscreens/packing-slip-screen";
import { StartTripConfirmScreen } from "./subscreens/start-trip-confirm-screen";

type Props = {
	dispatchId: number;
	salesNo?: string;
	openCompleteOnMount?: boolean;
};

export function DispatchDetailScreen({
	dispatchId,
	salesNo,
	openCompleteOnMount,
}: Props) {
	const detailUi = useDispatchDetailUiState();
	return (
		<DispatchDetailProvider value={detailUi}>
			<DispatchDetailScreenInner
				dispatchId={dispatchId}
				salesNo={salesNo}
				openCompleteOnMount={openCompleteOnMount}
			/>
		</DispatchDetailProvider>
	);
}

function DispatchDetailScreenInner({
	dispatchId,
	salesNo,
	openCompleteOnMount,
}: Props) {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const ui = useDispatchUiState();
	const detailUi = useDispatchDetailContext();
	const actions = useDispatchActions();
	const packing = useDispatchPacking();
	const notification = useNotificationTrigger();
	const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);

	const overview = useDispatchOverview(
		{
			dispatchId,
			salesNo,
		},
		{
			enabled: !!dispatchId,
		},
	);

	const data = overview.data!;
	const dispatch = data?.dispatch;
	const order = data?.order;
	const items = useMemo(
		() => (data?.dispatchItems || []).filter((item) => !!item.dispatchable),
		[data?.dispatchItems],
	);
	const canEditPacking = packing.canEditPacking(dispatch?.status as any);
	const {
		isPackingSlipOpen,
		setPackingSlipOpen,
		isDispatchConfirmOpen,
		setDispatchConfirmOpen,
		isStartTripConfirmOpen,
		setStartTripConfirmOpen,
		isIssueReportOpen,
		setIssueReportOpen,
		selectedIssueReason,
		setSelectedIssueReason,
		issueDetails,
		setIssueDetails,
		confirmPackAllChecked,
		setConfirmPackAllChecked,
		packOnlyAvailableChecked,
		setPackOnlyAvailableChecked,
	} = detailUi;
	const selectedItem = useMemo(
		() => items.find((it) => it.uid === ui.selectedItemUid) || null,
		[items, ui.selectedItemUid],
	);
	const {
		ref: packingModalRef,
		present: presentPackingModal,
		dismiss: dismissPackingModal,
	} = useModal();
	const {
		ref: packAllModalRef,
		present: presentPackAllModal,
		dismiss: dismissPackAllModal,
	} = useModal();
	const {
		ref: salesRequestModalRef,
		present: presentSalesRequestModal,
		dismiss: dismissSalesRequestModal,
	} = useModal();
	const {
		ref: packingDelayModalRef,
		present: presentPackingDelayModal,
		dismiss: dismissPackingDelayModal,
	} = useModal();
	const packingSnapPoints = useMemo(() => ["70%"], []);
	const packAllSnapPoints = useMemo(() => ["88%"], []);
	const salesRequestSnapPoints = useMemo(() => ["85%"], []);
	const packingDelaySnapPoints = useMemo(() => ["82%"], []);
	const hasAutoOpenedCompleteRef = useRef(false);
	const [readyLoadingUid, setReadyLoadingUid] = useState<string | null>(null);

	useEffect(() => {
		if (selectedItem) {
			presentPackingModal();
		} else {
			dismissPackingModal();
		}
	}, [selectedItem, presentPackingModal, dismissPackingModal]);

	useEffect(() => {
		if (!isPackingSlipOpen) {
			setDispatchConfirmOpen(false);
		}
	}, [isPackingSlipOpen]);

	useEffect(() => {
		if (!openCompleteOnMount || hasAutoOpenedCompleteRef.current) return;
		if (!dispatch?.id || !order?.id) return;
		hasAutoOpenedCompleteRef.current = true;
		ui.setCompleteSheetOpen(true);
	}, [openCompleteOnMount, dispatch?.id, order?.id, ui]);

	const pageTitle = useMemo(() => {
		return `#DISP-${dispatch?.id || dispatchId}`;
	}, [dispatch?.id, dispatchId]);

	const activityHistory = useMemo(() => {
		const history = items
			.flatMap((item) => item?.packingHistory || [])
			.slice()
			.sort((a, b) => +new Date(b.date as any) - +new Date(a.date as any))
			.slice(0, 4);
		return history;
	}, [items]);
	const statusText = dispatch?.status || "queue";
	const canStart = actions.canStart(dispatch?.status);
	const canCancel = actions.canCancel(dispatch?.status);
	const canComplete = actions.canComplete(dispatch?.status);
	const primaryStatusActionLabel = canStart
		? "Update Status"
		: canComplete
			? "Ready To Complete"
			: "In Progress";

	const addressLine1 = useMemo(() => {
		const a = (data?.address || {}) as any;
		return [a?.address1, a?.address2].filter(Boolean).join(", ");
	}, [data?.address]);
	const addressLine2 = useMemo(() => {
		const a = (data?.address || {}) as any;
		return [a?.city, a?.state, a?.country].filter(Boolean).join(", ");
	}, [data?.address]);

	const topPackingItems = useMemo(() => items.slice(0, 3), [items]);
	const packableItems = useMemo(
		() =>
			items.filter((item) => {
				const d = (item.deliverableQty || {}) as any;
				return d.qty > 0 || Number(d.lh || 0) > 0 || Number(d.rh || 0) > 0;
			}),
		[items],
	);
	const unpackableItems = useMemo(
		() =>
			items.filter((item) => {
				const unavailable = (item as any).nonDeliverableQty || {};
				return (
					Number(unavailable.qty || 0) > 0 ||
					Number(unavailable.lh || 0) > 0 ||
					Number(unavailable.rh || 0) > 0
				);
			}),
		[items],
	);
	const {
		getSelection: getSalesRequestSelection,
		setSelected: setSalesRequestSelected,
		setQty: setSalesRequestQty,
		markAll: markAllSalesRequestItems,
		selectedItems: selectedSalesRequestItems,
		reset: resetSalesRequestState,
		parseQtyInput: parseSalesRequestQtyInput,
		asNumber: asSalesRequestNumber,
		hasSingleQty: hasSingleSalesRequestQty,
	} = useSalesRequestPacking(unpackableItems);
	const pendingProductionItems = useMemo(
		() =>
			unpackableItems.map((item) => ({
				uid: String(item.uid),
				title: String(item.title || "Item"),
				img: (item as any).img || null,
				salesItemId: (item as any).salesItemId as number | undefined,
				pendingQty: {
					qty:
						Number(((item as any).nonDeliverableQty || {}).qty || 0) ||
						undefined,
					lh:
						Number(((item as any).nonDeliverableQty || {}).lh || 0) ||
						undefined,
					rh:
						Number(((item as any).nonDeliverableQty || {}).rh || 0) ||
						undefined,
				},
			})),
		[unpackableItems],
	);
	const {
		packingDrafts,
		setPackingDrafts,
		adjustSingle,
		setSingleValue,
		adjustSide,
		setSideValue,
		progressPacked,
		parseQtyInput,
		asNumber,
		itemHasSingleQty,
	} = usePackingSlipDrafts({
		isOpen: isPackingSlipOpen,
		packableItems,
	});

	const timelineItems = useMemo(() => {
		const dynamic = activityHistory.slice(0, 2).map((event, index) => ({
			id: String(event.id),
			title: index === 0 ? "In Transit" : "Started",
			subtitle: `${formatDispatchDate(event.date as any)}${event.packedBy ? ` - ${event.packedBy}` : ""}`,
			icon: index === 0 ? "Truck" : ("CircleCheck" as const),
			active: index === 0,
		}));
		return [
			...dynamic,
			{
				id: "assigned",
				title: "Assigned",
				subtitle: `${formatDispatchDate(order?.date as any)} - Dispatch Center`,
				icon: "UserCog" as const,
				active: false,
			},
		];
	}, [activityHistory, order?.date]);

	const issueReasons = useMemo(
		() => [
			{
				key: "wrong_address",
				title: "Wrong Address",
				subtitle: "The GPS location is incorrect",
				icon: "MapPin",
			},
			{
				key: "customer_not_home",
				title: "Customer Not Home",
				subtitle: "No answer at door or phone",
				icon: "User",
			},
			{
				key: "damaged_items",
				title: "Damaged Items",
				subtitle: "Package is broken or leaking",
				icon: "HardHat",
			},
			{
				key: "access_issue",
				title: "Access Issue",
				subtitle: "Gate code required or road closed",
				icon: "Lock",
			},
			{
				key: "other",
				title: "Other",
				subtitle: "Something else went wrong",
				icon: "more",
			},
		],
		[],
	);

	const onPrimaryStatusAction = async () => {
		if (!order?.id || !dispatch?.id) return;
		if (canStart) {
			try {
				await actions.onStartDispatch({
					salesId: order.id,
					dispatchId: dispatch.id,
				});
				Toast.show("Dispatch started", { type: "success" });
			} catch {
				Toast.show("Unable to start dispatch", { type: "error" });
			}
			return;
		}
		if (canComplete) {
			ui.setCompleteSheetOpen(true);
		}
	};

	const onMarkDelivered = () => {
		if (canComplete) {
			ui.setCompleteSheetOpen(true);
			return;
		}
		Toast.show("Dispatch is not ready for delivery completion yet.", {
			type: "warning",
		});
	};

	const onIssue = async () => {
		if (!order?.id || !dispatch?.id || !canCancel) {
			Toast.show("Issue reporting is unavailable at this dispatch stage.", {
				type: "warning",
			});
			return;
		}
		setIssueReportOpen(true);
	};

	const onSubmitSalesRequestPacking = async () => {
		if (!dispatch?.id) return;
		if (!selectedSalesRequestItems.length) {
			Toast.show("Select at least one item and quantity.", { type: "warning" });
			return;
		}

		const packingList = selectedSalesRequestItems.flatMap(({ item, qty }) => {
			const built = buildPackingPayload({
				salesItemId: item.salesItemId,
				enteredQty: qty,
				deliverables: (item.deliverables || []) as any,
				note: "Requested via sales_request_packing",
			});
			return built.packingList;
		});

		try {
			await notification.send("sales_request_packing", {
				payload: {
					orderNo: String(order?.orderId || pageTitle),
					dispatchId: dispatch.id,
					packItems: {
						dispatchId: dispatch.id,
						dispatchStatus: ((dispatch.status as any) || "queue") as any,
						packMode: "selection",
						packingList,
					},
				},
			} as any);

			dismissSalesRequestModal();
			resetSalesRequestState();
			Toast.show(
				"Admin has been notified and all items will be automatically packed.",
				{ type: "success" },
			);
		} catch {
			Toast.show("Unable to send packing request right now.", {
				type: "error",
			});
		}
	};

	const onMarkPendingProductionReady = async (item: {
		uid: string;
		title: string;
		salesItemId?: number;
		pendingQty: { qty?: number; lh?: number; rh?: number };
	}) => {
		if (!dispatch?.id) return;

		setReadyLoadingUid(item.uid);
		try {
			await notification.send("dispatch_packing_delay", {
				payload: {
					orderNo: String(order?.orderId || pageTitle),
					dispatchId: dispatch.id,
					salesItemId: item.salesItemId,
					itemUid: item.uid,
					itemName: item.title,
					pendingQty: item.pendingQty,
					note: "Driver marked item as ready from pending production popup.",
				},
			});
			Toast.show(`${item.title} marked ready and admin notified.`, {
				type: "success",
			});
		} catch {
			Toast.show("Unable to send ready notification right now.", {
				type: "error",
			});
		} finally {
			setReadyLoadingUid(null);
		}
	};

	const onSubmitIssueReport = async () => {
		if (!order?.id || !dispatch?.id || !canCancel) {
			Toast.show("Issue reporting is unavailable at this dispatch stage.", {
				type: "warning",
			});
			return;
		}
		if (!selectedIssueReason) {
			Toast.show("Select an issue reason to continue.", { type: "warning" });
			return;
		}
		try {
			await actions.onCancelDispatch({
				salesId: order.id,
				dispatchId: dispatch.id,
			});
			setIssueReportOpen(false);
			setSelectedIssueReason(null);
			setIssueDetails("");
			Toast.show("Dispatch marked with issue and cancelled", {
				type: "success",
			});
		} catch {
			Toast.show("Unable to submit issue", { type: "error" });
		}
	};

	const packingConfirmItems = useMemo(() => {
		return packableItems.map((item) => {
			const draft = packingDrafts[item.uid] || { qty: 0, lh: 0, rh: 0 };
			const hasSingle = itemHasSingleQty(item);
			const packedTotal = hasSingle ? draft.qty : draft.lh + draft.rh;
			const isVerified = packedTotal > 0;
			return {
				uid: item.uid,
				title: item.title,
				img: item.img,
				isVerified,
				icon: isVerified
					? hasSingle
						? "HardHat"
						: "ClipboardList"
					: "AlertCircle",
				subtitle: hasSingle
					? isVerified
						? `${draft.qty} units`
						: "Skipped from this shipment"
					: isVerified
						? `${draft.lh} LH, ${draft.rh} RH`
						: "Skipped from this shipment",
			};
		});
	}, [packableItems, packingDrafts]);

	const verifiedPackingCount = useMemo(
		() => packingConfirmItems.filter((item) => item.isVerified).length,
		[packingConfirmItems],
	);

	const verificationPercent = useMemo(() => {
		if (!packingConfirmItems.length) return 0;
		return Math.round(
			(verifiedPackingCount / packingConfirmItems.length) * 100,
		);
	}, [packingConfirmItems.length, verifiedPackingCount]);

	const productionPackAllItems = useMemo(() => {
		return packableItems
			.map((item) => {
				const d = packingDrafts[item.uid] || {
					qty: 0,
					lh: 0,
					rh: 0,
				};
				const deliverable = (item.deliverableQty || {}) as any;
				const pendingSource = (item.nonDeliverableQty || {}) as any;
				const hasSingle = itemHasSingleQty(item);
				const availableCompleted = hasSingle
					? asNumber(deliverable.qty)
					: asNumber(deliverable.lh) + asNumber(deliverable.rh);
				const pendingProduction = hasSingle
					? asNumber(pendingSource.qty)
					: asNumber(pendingSource.lh) + asNumber(pendingSource.rh);
				if (hasSingle) {
					const remaining = Math.max(
						0,
						asNumber(deliverable.qty) - asNumber(d.qty),
					);
					return {
						uid: item.uid,
						title: item.title,
						img: item.img,
						remaining,
						subtitle: `${remaining} units remaining`,
						availableCompleted,
						pendingProduction,
						hasPending: remaining > 0,
					};
				}
				const remainingLh = Math.max(
					0,
					asNumber(deliverable.lh) - asNumber(d.lh),
				);
				const remainingRh = Math.max(
					0,
					asNumber(deliverable.rh) - asNumber(d.rh),
				);
				const remaining = remainingLh + remainingRh;
				return {
					uid: item.uid,
					title: item.title,
					img: item.img,
					remaining,
					subtitle: `${remaining} units remaining`,
					availableCompleted,
					pendingProduction,
					hasPending: remaining > 0,
				};
			})
			.filter(
				(item) =>
					item.hasPending ||
					item.availableCompleted > 0 ||
					item.pendingProduction > 0,
			);
	}, [packableItems, packingDrafts]);

	const pendingPackAllItems = useMemo(
		() => productionPackAllItems.filter((item) => item.hasPending),
		[productionPackAllItems],
	);

	const onPackAllDraft = () => {
		const packOnlyAvailable = packOnlyAvailableChecked;
		setPackingDrafts(() =>
			Object.fromEntries(
				packableItems.map((item) => {
					const deliverable = (item.deliverableQty || {}) as any;
					const hasSingle = itemHasSingleQty(item);
					const next = hasSingle
						? {
								qty: asNumber(deliverable.qty),
								lh: 0,
								rh: 0,
							}
						: {
								qty: 0,
								lh: asNumber(deliverable.lh),
								rh: asNumber(deliverable.rh),
							};
					return [item.uid, next];
				}),
			),
		);
		setConfirmPackAllChecked(false);
		setPackOnlyAvailableChecked(true);
		dismissPackAllModal();
		Toast.show(
			packOnlyAvailable
				? "Available completed items are staged for packing."
				: "All production items are staged (available quantities packed now).",
			{
				type: "success",
			},
		);
	};

	const savePackingSlip = async (opts?: { closeSlip?: boolean }) => {
		const closeSlip = opts?.closeSlip ?? true;
		if (!order?.id || !dispatch?.id) return;
		try {
			const changes = packableItems.map((item) => {
				const draft = packingDrafts[item.uid] || {
					qty: 0,
					lh: 0,
					rh: 0,
				};
				const listed = (item.listedQty || {}) as any;
				const current = {
					qty: asNumber(listed.qty),
					lh: asNumber(listed.lh),
					rh: asNumber(listed.rh),
				};
				return {
					item,
					draft,
					delta: {
						qty: draft.qty - current.qty,
						lh: draft.lh - current.lh,
						rh: draft.rh - current.rh,
					},
					current,
				};
			});

			const hasDecrease = changes.some(
				(entry) =>
					entry.delta.qty < 0 || entry.delta.lh < 0 || entry.delta.rh < 0,
			);

			if (hasDecrease) {
				await packing.onClearPackings({
					salesId: order.id,
					dispatchId: dispatch.id,
				});
			}

			for (const entry of changes) {
				const { item, draft, delta } = entry;
				const hasSingle = itemHasSingleQty(item);
				const entered = hasDecrease
					? hasSingle
						? { qty: draft.qty }
						: { lh: draft.lh, rh: draft.rh }
					: hasSingle
						? { qty: Math.max(0, delta.qty) }
						: { lh: Math.max(0, delta.lh), rh: Math.max(0, delta.rh) };

				if (
					asNumber((entered as any).qty) <= 0 &&
					asNumber((entered as any).lh) <= 0 &&
					asNumber((entered as any).rh) <= 0
				) {
					continue;
				}

				await packing.onPackItem({
					salesId: order.id,
					dispatchId: dispatch.id,
					salesItemId: item.salesItemId,
					enteredQty: entered as any,
					dispatchStatus: (dispatch.status as any) || "queue",
					deliverables: (item.deliverables || []) as any,
					note: "Packed via packing slip",
				});
			}

			await overview.refetch();
			if (closeSlip) {
				setPackingSlipOpen(false);
			}
			Toast.show("Packing slip updated", { type: "success" });
			return true;
		} catch {
			Toast.show("Unable to update packing slip", { type: "error" });
			return false;
		}
	};

	const onSavePackingDraft = async () => {
		const saved = await savePackingSlip({ closeSlip: false });
		if (saved) setDispatchConfirmOpen(false);
	};

	const onConfirmDispatchAfterPacking = async () => {
		const saved = await savePackingSlip({ closeSlip: true });
		if (!saved) return;
		setDispatchConfirmOpen(false);
		setStartTripConfirmOpen(true);
		Toast.show("Dispatch confirmed.", { type: "success" });
	};

	const onStartTripFromConfirm = async () => {
		if (!order?.id || !dispatch?.id) return;
		if (!canStart) {
			setStartTripConfirmOpen(false);
			Toast.show("Trip already started.", { type: "success" });
			return;
		}
		try {
			await actions.onStartDispatch({
				salesId: order.id,
				dispatchId: dispatch.id,
			});
			setStartTripConfirmOpen(false);
			Toast.show("Trip started", { type: "success" });
		} catch {
			Toast.show("Unable to start trip", { type: "error" });
		}
	};
	const canStartTripFromConfirm = progressPacked > 0;

	if (overview.isPending) {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<ActivityIndicator />
			</View>
		);
	}

	if (overview.error || !data) {
		return (
			<View className="flex-1 items-center justify-center bg-background px-6">
				<Text className="text-center text-sm text-muted-foreground">
					Unable to load dispatch details.
				</Text>
				<Pressable
					onPress={() => overview.refetch()}
					className="mt-4 rounded-full bg-primary px-4 py-2 active:opacity-80"
				>
					<Text className="font-semibold text-primary-foreground">Retry</Text>
				</Pressable>
			</View>
		);
	}

	return (
		<SafeArea>
			<View className="flex-1 bg-background">
				<View className="border-b border-border bg-card px-4 pb-3">
					<View className="flex-row items-center justify-between">
						<Pressable
							onPress={() => router.back()}
							className="h-10 w-10 items-center justify-center active:opacity-80"
						>
							<Icon name="ArrowLeft" className="text-foreground" size={20} />
						</Pressable>
						<Text className="flex-1 px-2 text-lg font-bold tracking-tight text-foreground">
							{order?.orderId ? `Order #${order.orderId}` : pageTitle}
						</Text>
						<Pressable className="h-10 w-10 items-center justify-center rounded-lg active:opacity-80">
							<Icon name="more" className="text-foreground" size={20} />
						</Pressable>
					</View>
				</View>

				<ScrollView
					className="flex-1"
					contentContainerStyle={{
						paddingHorizontal: 16,
						paddingTop: 16,
						paddingBottom: 24,
					}}
					refreshControl={
						<RefreshControl
							refreshing={overview.isRefetching}
							onRefresh={() => {
								overview.refetch();
							}}
						/>
					}
				>
					<View className="mb-6 rounded-xl border border-border bg-card p-5">
						<View className="flex-row items-center justify-between gap-3">
							<View className="flex-1">
								<Text className="text-xs font-semibold uppercase tracking-[1px] text-muted-foreground">
									Current Status
								</Text>
								<View className="mt-1 flex-row items-center gap-2">
									<View className="h-2.5 w-2.5 rounded-full bg-primary" />
									<Text className="text-base font-bold capitalize text-foreground">
										{statusText}
									</Text>
								</View>
							</View>
							<Pressable
								disabled={actions.startDispatch.isPending || !canStart}
								onPress={onPrimaryStatusAction}
								className="min-w-[100px] items-center justify-center rounded-lg bg-primary px-4 py-2.5 active:opacity-90 disabled:opacity-50"
							>
								<Text className="text-sm font-semibold text-primary-foreground">
									{actions.startDispatch.isPending
										? "Updating..."
										: primaryStatusActionLabel}
								</Text>
							</Pressable>
						</View>
					</View>

					<View className="mb-6">
						<Text className="mb-3 text-xl font-bold text-foreground">
							Delivery Details
						</Text>
						<View className="gap-4">
							<View className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3">
								<View className="h-14 w-14 overflow-hidden rounded-full border-2 border-primary/20">
									<View className="h-full w-full bg-primary/10">
										<Icon
											name="User"
											className="m-auto text-primary"
											size={22}
										/>
									</View>
								</View>
								<View className="flex-1">
									<Text className="text-base font-bold text-foreground">
										{(data?.address as any)?.name || "Customer"}
									</Text>
									<Text className="text-sm font-medium text-muted-foreground">
										Customer
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
										{addressLine1 || "Address unavailable"}
									</Text>
									<Text className="mt-0.5 text-sm font-medium text-muted-foreground">
										{addressLine2 || (data?.address as any)?.phoneNo || ""}
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
									{items.length} Items
								</Text>
							</View>
						</View>
						<View className="overflow-hidden rounded-xl border border-border">
							{topPackingItems.map((item, index) => {
								const itemImage = resolveItemImage(item.img as string | null);
								return (
									<Pressable
										key={item.uid}
										onPress={() => ui.setSelectedItemUid(item.uid)}
										className={`flex-row items-center justify-between bg-card p-4 ${
											index < topPackingItems.length - 1
												? "border-b border-border"
												: ""
										}`}
									>
										<View className="flex-row items-center gap-3">
											{itemImage ? (
												<Pressable
													onPress={(event) => {
														event.stopPropagation();
														setPreviewImageUri(itemImage);
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
											<Text className="max-w-[220px] text-sm font-medium text-foreground">
												{item.title}
											</Text>
										</View>
										<Text className="text-base font-bold text-foreground">
											x {totalQty(item.deliverableQty)}
										</Text>
									</Pressable>
								);
							})}
						</View>

						<View className="mt-4 flex-row gap-3">
							<Pressable
								onPress={() => {
									if (!packableItems.length) {
										if (pendingProductionItems.length > 0) {
											presentPackingDelayModal();
										} else {
											Toast.show("No packing items available.", {
												type: "warning",
											});
										}
										return;
									}
									setPackingSlipOpen(true);
								}}
								className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3"
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
								onPress={async () => {
									if (!order?.id || !dispatch?.id) return;
									try {
										await packing.onClearPackings({
											salesId: order.id,
											dispatchId: dispatch.id,
										});
										Toast.show("Packing reset", { type: "success" });
									} catch {
										Toast.show("Unable to reset packing", { type: "error" });
									}
								}}
								disabled={!canEditPacking || packing.taskTrigger.isPending}
								className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border-2 border-border py-3 disabled:opacity-50"
							>
								<Icon name="Loader2" className="text-foreground" size={18} />
								<Text className="text-sm font-bold text-foreground">
									Reset Packing
								</Text>
							</Pressable>
						</View>

						{unpackableItems.length > 0 ? (
							<Pressable
								onPress={() => presentSalesRequestModal()}
								className="mt-3 h-11 flex-row items-center justify-center rounded-xl border border-amber-400/40 bg-amber-50 dark:bg-amber-950/30"
							>
								<Text className="text-xs font-semibold text-amber-700 dark:text-amber-300">
									Packing not available for {unpackableItems.length} items
								</Text>
							</Pressable>
						) : null}
					</View>

					<View className="mb-4 pb-8">
						<Text className="mb-4 text-xl font-bold text-foreground">
							Activity History
						</Text>
						<View className="gap-6 rounded-xl bg-card p-2">
							{timelineItems.map((event, index) => (
								<View key={event.id} className="flex-row items-center gap-3">
									<View
										className={`h-10 w-10 items-center justify-center rounded-full ${
											event.active ? "bg-primary" : "bg-muted"
										}`}
									>
										<Icon
											name={event.icon as any}
											className={
												event.active
													? "text-primary-foreground"
													: "text-muted-foreground"
											}
											size={16}
										/>
									</View>
									<View>
										<Text className="text-sm font-bold text-foreground">
											{event.title}
										</Text>
										<Text className="text-xs text-muted-foreground">
											{event.subtitle}
										</Text>
									</View>
									{index < timelineItems.length - 1 ? (
										<View className="absolute left-5 top-10 h-8 w-px bg-border" />
									) : null}
								</View>
							))}
						</View>
					</View>
				</ScrollView>

				<BlurView intensity={90} className="border-t border-border">
					<View style={{ paddingBottom: Math.max(22, insets.bottom + 14) }}>
						<View className="px-5 pt-3">
							<View className="flex-row gap-3">
								<Pressable
									onPress={onIssue}
									disabled={actions.cancelDispatch.isPending}
									className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl border-2 border-border disabled:opacity-50"
								>
									<Icon
										name="AlertCircle"
										className="text-foreground"
										size={18}
									/>
									<Text className="font-bold text-foreground">Issue</Text>
								</Pressable>
								<Pressable
									onPress={onMarkDelivered}
									disabled={actions.submitDispatch.isPending || !canComplete}
									className="h-12 flex-[2] flex-row items-center justify-center gap-2 rounded-xl bg-primary disabled:opacity-50"
								>
									<Icon
										name="CheckSquare"
										className="text-primary-foreground"
										size={18}
									/>
									<Text className="font-bold text-primary-foreground">
										Mark Delivered
									</Text>
								</Pressable>
							</View>
						</View>
					</View>
				</BlurView>

				{isPackingSlipOpen ? (
					<PackingSlipScreen
						insetsBottom={insets.bottom}
						pageTitle={pageTitle}
						orderId={order?.orderId}
						statusText={statusText}
						topPackingItemTitle={topPackingItems[0]?.title}
						packableItems={packableItems}
						packingDrafts={packingDrafts}
						itemHasSingleQty={itemHasSingleQty as any}
						asNumber={asNumber}
						adjustSingle={adjustSingle}
						setSingleValue={setSingleValue}
						adjustSide={adjustSide}
						setSideValue={setSideValue}
						parseQtyInput={parseQtyInput}
						progressPacked={progressPacked}
						isSubmitting={packing.taskTrigger.isPending}
						onClose={() => setPackingSlipOpen(false)}
						onOpenPackAll={() => {
							setConfirmPackAllChecked(false);
							presentPackAllModal();
						}}
						onConfirmAndStartTrip={() => setDispatchConfirmOpen(true)}
						onImagePress={setPreviewImageUri}
					/>
				) : null}

				{isDispatchConfirmOpen ? (
					<DispatchConfirmScreen
						insetsTop={insets.top}
						insetsBottom={insets.bottom}
						pageTitle={pageTitle}
						orderId={order?.orderId}
						packingConfirmItems={packingConfirmItems as any}
						verifiedPackingCount={verifiedPackingCount}
						verificationPercent={verificationPercent}
						isSubmitting={packing.taskTrigger.isPending}
						onClose={() => setDispatchConfirmOpen(false)}
						onSaveDraft={onSavePackingDraft}
						onConfirmDispatch={onConfirmDispatchAfterPacking}
						onImagePress={setPreviewImageUri}
					/>
				) : null}

				{isStartTripConfirmOpen ? (
					<StartTripConfirmScreen
						insetsTop={insets.top}
						insetsBottom={insets.bottom}
						pageTitle={pageTitle}
						orderId={order?.orderId}
						addressLine1={addressLine1}
						addressLine2={addressLine2}
						packingConfirmItems={packingConfirmItems as any}
						canStartTripFromConfirm={canStartTripFromConfirm}
						isStarting={actions.startDispatch.isPending}
						onClose={() => setStartTripConfirmOpen(false)}
						onViewOrderDetails={() => {
							setStartTripConfirmOpen(false);
							setPackingSlipOpen(false);
						}}
						onPrimaryAction={() => {
							if (canStartTripFromConfirm) {
								onStartTripFromConfirm();
								return;
							}
							setStartTripConfirmOpen(false);
							setPackingSlipOpen(true);
						}}
						onImagePress={setPreviewImageUri}
					/>
				) : null}

				{isIssueReportOpen ? (
					<IssueReportScreen
						insetsTop={insets.top}
						insetsBottom={insets.bottom}
						pageTitle={pageTitle}
						orderId={order?.orderId}
						issueReasons={issueReasons as any}
						selectedIssueReason={selectedIssueReason}
						issueDetails={issueDetails}
						isSubmitting={actions.cancelDispatch.isPending}
						onClose={() => setIssueReportOpen(false)}
						onSelectReason={setSelectedIssueReason}
						onChangeDetails={setIssueDetails}
						onSubmit={onSubmitIssueReport}
					/>
				) : null}

				{ui.isCompleteSheetOpen ? (
					<CompleteDispatchScreen
						insetsTop={insets.top}
						defaultReceivedBy={(data?.address as any)?.name || ""}
						isSubmitting={actions.submitDispatch.isPending}
						onClose={() => ui.setCompleteSheetOpen(false)}
						onSubmit={async (input) => {
							if (!order?.id || !dispatch?.id) return;
							try {
								await actions.onSubmitDispatch({
									salesId: order.id,
									dispatchId: dispatch.id,
									...input,
								});
								ui.setCompleteSheetOpen(false);
								Toast.show("Dispatch completed", { type: "success" });
							} catch {
								Toast.show("Unable to complete dispatch", {
									type: "error",
								});
							}
						}}
					/>
				) : null}

				<PackAllModal
					modalRef={packAllModalRef}
					snapPoints={packAllSnapPoints}
					confirmChecked={confirmPackAllChecked}
					packOnlyAvailableChecked={packOnlyAvailableChecked}
					productionItems={productionPackAllItems as any}
					pendingItemsCount={pendingPackAllItems.length}
					onDismiss={() => {
						setConfirmPackAllChecked(false);
						setPackOnlyAvailableChecked(true);
					}}
					onToggleConfirm={() => setConfirmPackAllChecked((prev) => !prev)}
					onTogglePackOnlyAvailable={() =>
						setPackOnlyAvailableChecked((prev) => !prev)
					}
					onPackAll={onPackAllDraft}
					onCancel={() => {
						setConfirmPackAllChecked(false);
						setPackOnlyAvailableChecked(true);
						dismissPackAllModal();
					}}
					onImagePress={setPreviewImageUri}
				/>

				<PackingItemModal
					modalRef={packingModalRef}
					snapPoints={packingSnapPoints}
					selectedItem={selectedItem as any}
					canEditPacking={canEditPacking}
					isSubmitting={packing.taskTrigger.isPending}
					salesId={order?.id}
					dispatchId={dispatch?.id}
					dispatchStatus={dispatch?.status}
					onDismiss={() => ui.setSelectedItemUid(null)}
					onPackItem={packing.onPackItem}
					onRefetch={overview.refetch}
				/>

				<SalesRequestPackingModal
					modalRef={salesRequestModalRef}
					snapPoints={salesRequestSnapPoints}
					unpackableItems={unpackableItems}
					getSelection={getSalesRequestSelection}
					setSelected={setSalesRequestSelected}
					setQty={setSalesRequestQty}
					markAll={markAllSalesRequestItems}
					parseQtyInput={parseSalesRequestQtyInput}
					asNumber={asSalesRequestNumber}
					hasSingleQty={hasSingleSalesRequestQty}
					isSubmitting={notification.isPending}
					onSubmit={onSubmitSalesRequestPacking}
					onDismiss={() => {
						resetSalesRequestState();
					}}
					onImagePress={setPreviewImageUri}
				/>

				<DispatchPackingDelayModal
					modalRef={packingDelayModalRef}
					snapPoints={packingDelaySnapPoints}
					items={pendingProductionItems}
					loadingItemUid={readyLoadingUid}
					onReady={onMarkPendingProductionReady}
					onDismiss={() => {
						setReadyLoadingUid(null);
						dismissPackingDelayModal();
					}}
				/>

				<ImagePreviewModal
					visible={!!previewImageUri}
					imageUri={previewImageUri}
					onClose={() => setPreviewImageUri(null)}
				/>
			</View>
		</SafeArea>
	);
}

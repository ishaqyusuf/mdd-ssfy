import { SafeArea } from "@/components/safe-area";
import { useModal } from "@/components/ui/modal";
import { Toast } from "@/components/ui/toast";
import { useAuthContext } from "@/hooks/use-auth";
import { useNotificationTrigger } from "@/hooks/use-notification-trigger";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatchActions } from "../../api/use-dispatch-actions";
import { useDispatchDocuments } from "../../api/use-dispatch-documents";
import { useDispatchOverview } from "../../api/use-dispatch-overview";
import { useDispatchPacking } from "../../api/use-dispatch-packing";
import { formatDispatchDate, totalQty } from "../../lib/format-dispatch";
import { buildPackingPayload, hasQty } from "../../lib/packing-payload";
import { useDispatchUiState } from "../../state/use-dispatch-ui-state";
import { DispatchDetailProvider, useDispatchDetailContext } from "./context";
import { useDispatchDetailUiState } from "./hooks/use-dispatch-detail-ui-state";
import { usePackingSlipDrafts } from "./hooks/use-packing-slip-drafts";
import { useSalesRequestPacking } from "./hooks/use-sales-request-packing";
import { endFlow, logError, logStage, startFlow } from "./lib/dev-flow-logger";
import { getPackTargetQty } from "./lib/packing-qty";
import { resolveItemImage } from "./lib/resolve-item-image";
import { DispatchPackingDelayModal } from "./modals/dispatch-packing-delay-modal";
import { ImagePreviewModal } from "./modals/image-preview-modal";
import { PackingItemModal } from "./modals/packing-item-modal";
import { SalesRequestPackingModal } from "./modals/sales-request-packing-modal";
import { CompleteDispatchScreen } from "./subscreens/complete-dispatch-screen";
import { DispatchConfirmScreen } from "./subscreens/dispatch-confirm-screen";
import { IssueReportScreen } from "./subscreens/issue-report-screen";
import { PackingSlipScreen } from "./subscreens/packing-slip-screen";
import { DispatchDetailFooterActions } from "./components/footer-actions";
import { DispatchDetailScrollContent } from "./components/scroll-content";
import {
	DispatchDetailScreenProvider,
	type DispatchDetailScreenVm,
} from "./components/screen-context";
import { DispatchDetailTopBar } from "./components/top-bar";

type Props = {
	dispatchId: number;
	salesNo?: string;
	openCompleteOnMount?: boolean;
	entryMode?: "dispatch" | "packing" | "warehouse-packing";
};

function resolvedAvailableQty(item: any) {
	return getPackTargetQty(item) as any;
}

function sumPackedLinesQty(
	lines: {
		qty?: { qty?: number | null; lh?: number | null; rh?: number | null };
	}[],
) {
	return lines.reduce(
		(acc, line) => ({
			qty: Number(acc.qty || 0) + Number(line?.qty?.qty || 0),
			lh: Number(acc.lh || 0) + Number(line?.qty?.lh || 0),
			rh: Number(acc.rh || 0) + Number(line?.qty?.rh || 0),
		}),
		{ qty: 0, lh: 0, rh: 0 },
	);
}

function buildSignatureSvg(path: string) {
	return `<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 320 160\"><path d=\"${path}\" fill=\"none\" stroke=\"#111827\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" /></svg>`;
}

export function DispatchDetailScreen({
	dispatchId,
	salesNo,
	openCompleteOnMount,
	entryMode = "dispatch",
}: Props) {
	const detailUi = useDispatchDetailUiState();
	return (
		<DispatchDetailProvider value={detailUi}>
			<DispatchDetailScreenInner
				dispatchId={dispatchId}
				salesNo={salesNo}
				openCompleteOnMount={openCompleteOnMount}
				entryMode={entryMode}
			/>
		</DispatchDetailProvider>
	);
}

function DispatchDetailScreenInner({
	dispatchId,
	salesNo,
	openCompleteOnMount,
	entryMode = "dispatch",
}: Props) {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const auth = useAuthContext();
	const ui = useDispatchUiState();
	const detailUi = useDispatchDetailContext();
	const actions = useDispatchActions();
	const packing = useDispatchPacking();
	const documents = useDispatchDocuments();
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
	const duplicateInsight = data?.duplicateInsight;
	const duplicateDispatches = duplicateInsight?.dispatches || [];
	const hasDuplicateDispatch = duplicateInsight?.isDuplicate || false;
	const activeDispatchId = dispatch?.id || dispatchId;
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
		isIssueReportOpen,
		setIssueReportOpen,
		selectedIssueReason,
		setSelectedIssueReason,
		issueDetails,
		setIssueDetails,
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
	const salesRequestSnapPoints = useMemo(() => ["85%"], []);
	const packingDelaySnapPoints = useMemo(() => ["82%"], []);
	const hasAutoOpenedCompleteRef = useRef(false);
	const [readyLoadingUid, setReadyLoadingUid] = useState<string | null>(null);
	const [activityRefreshToken, setActivityRefreshToken] = useState(0);

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
	}, [isPackingSlipOpen, setDispatchConfirmOpen]);

	useEffect(() => {
		if (!openCompleteOnMount || hasAutoOpenedCompleteRef.current) return;
		if (!dispatch?.id || !order?.id) return;
		hasAutoOpenedCompleteRef.current = true;
		ui.setCompleteSheetOpen(true);
	}, [openCompleteOnMount, dispatch?.id, order?.id, ui]);

	const pageTitle = useMemo(() => {
		return `#DISP-${dispatch?.id || dispatchId}`;
	}, [dispatch?.id, dispatchId]);

	const statusText = dispatch?.status || "queue";
	const canStart = actions.canStart(dispatch?.status);
	const canCancel = actions.canCancel(dispatch?.status);
	const canComplete = actions.canComplete(dispatch?.status);
	const primaryStatusActionLabel = canStart
		? "Start Trip"
		: canComplete
			? "Mark Delivered"
			: "In Progress";

	const addressLine1 = useMemo(() => {
		const a = (data?.address || {}) as any;
		const customer = (order as any)?.customer || {};
		return (
			[a?.address1, a?.address2].filter(Boolean).join(", ") ||
			customer?.address ||
			""
		);
	}, [data?.address, order]);
	const addressLine2 = useMemo(() => {
		const a = (data?.address || {}) as any;
		return (
			[a?.city, a?.state, a?.region?.title, a?.zipCode, a?.country]
				.filter(Boolean)
				.join(", ") || ""
		);
	}, [data?.address]);
	const customerName = useMemo(() => {
		const a = (data?.address || {}) as any;
		const customer = (order as any)?.customer || {};
		return customer?.businessName || customer?.name || a?.name || "Customer";
	}, [data?.address, order]);
	const customerPhone = useMemo(() => {
		const a = (data?.address || {}) as any;
		const customer = (order as any)?.customer || {};
		return a?.phoneNo || customer?.phoneNo || "";
	}, [data?.address, order]);
	const customerEmail = useMemo(() => {
		const a = (data?.address || {}) as any;
		const customer = (order as any)?.customer || {};
		return a?.email || customer?.email || "";
	}, [data?.address, order]);

	const packableItems = useMemo(
		() =>
			items.filter(
				(item) => item?.salesItemId && (item as any)?.shippable !== false,
			),
		[items],
	);
	const topPackingItems = useMemo(() => packableItems, [packableItems]);
	const unpackableItems = useMemo(
		() =>
			packableItems.filter((item) => {
				const unavailable = (item as any).nonDeliverableQty || {};
				return (
					Number(unavailable.qty || 0) > 0 ||
					Number(unavailable.lh || 0) > 0 ||
					Number(unavailable.rh || 0) > 0
				);
			}),
		[packableItems],
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
		progressTotal,
		parseQtyInput,
		asNumber,
		itemHasSingleQty,
	} = usePackingSlipDrafts({
		isOpen: isPackingSlipOpen,
		packableItems,
	});

	const buildPackingSnapshot = () => ({
		dispatchId: dispatch?.id,
		salesId: order?.id,
		orderId: order?.orderId,
		packableCount: packableItems.length,
		draftCount: Object.keys(packingDrafts || {}).length,
		drafts: packingDrafts,
		items: packableItems.map((item) => ({
			uid: item.uid,
			title: item.title,
			salesItemId: item.salesItemId,
			mode: itemHasSingleQty(item) ? "single" : "handled",
			listedQty: (item as any).listedQty || {},
			packedQty: (item as any).packedQty || {},
			availableQty: (item as any).availableQty || {},
			deliverableQty: (item as any).deliverableQty || {},
			targetQty: resolvedAvailableQty(item),
			draft: packingDrafts[item.uid] || { qty: 0, lh: 0, rh: 0 },
			deliverables: (item.deliverables || []).map((d: any) => ({
				submissionId: d.submissionId,
				qty: d.qty,
			})),
		})),
	});

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

	const onFooterPrimaryAction = async () => {
		if (!order?.id || !dispatch?.id) return;
		if (dispatch.status === "in progress") {
			onMarkDelivered();
			return;
		}
		if (!canStart) {
			Toast.show("Trip cannot be started at this dispatch stage.", {
				type: "warning",
			});
			return;
		}
		try {
			await actions.onStartDispatch({
				salesId: order.id,
				dispatchId: dispatch.id,
			});
			Toast.show("Trip started", { type: "success" });
		} catch {
			Toast.show("Unable to start trip", { type: "error" });
		}
	};

	const footerPrimaryLabel =
		dispatch?.status === "in progress" ? "Complete" : "Start Trip";
	const footerPrimaryDisabled =
		actions.startDispatch.isPending ||
		actions.submitDispatch.isPending ||
		dispatch?.status === "queue" ||
		(dispatch?.status === "in progress" ? !canComplete : !canStart);

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

		const packingLines = selectedSalesRequestItems.flatMap(({ item, qty }) => {
			const built = buildPackingPayload({
				salesItemId: item.salesItemId,
				enteredQty: qty,
				deliverables: (item.deliverables || []) as any,
				note: "Requested via sales_request_packing",
			});
			return built.packingLines;
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
						packingLines,
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

	const onNotifyDuplicateDispatchToAdmin = async () => {
		if (!activeDispatchId) return;
		try {
			await notification.send("sales_dispatch_duplicate_alert", {
				payload: {
					dispatchId: activeDispatchId,
				},
			});
			Toast.show("Admin has been notified about duplicate dispatch.", {
				type: "success",
			});
		} catch {
			Toast.show("Unable to notify admin right now.", {
				type: "error",
			});
		}
	};

	const onCancelTrip = async () => {
		if (!order?.id || !dispatch?.id) return;
		try {
			await actions.onCancelDispatch({
				salesId: order.id,
				dispatchId: dispatch.id,
			});
			Toast.show("Trip cancelled", { type: "success" });
		} catch {
			Toast.show("Unable to cancel trip", { type: "error" });
		}
	};

	const onRefreshOverview = async () => {
		setActivityRefreshToken((prev) => prev + 1);
		await overview.refetch();
	};

	const packingWorkspaceStats = useMemo(() => {
		const itemCounts = packableItems.reduce(
			(acc, item) => {
				const packedQty = totalQty(((item as any).packedQty || {}) as any);
				const remainingQty = totalQty(resolvedAvailableQty(item) as any);
				if (packedQty > 0) acc.packedItems += 1;
				if (remainingQty > 0) acc.remainingItems += 1;
				acc.packedQty += packedQty;
				acc.remainingQty += remainingQty;
				return acc;
			},
			{
				packedItems: 0,
				remainingItems: 0,
				packedQty: 0,
				remainingQty: 0,
			},
		);

		return {
			totalItems: packableItems.length,
			packedItems: itemCounts.packedItems,
			remainingItems: itemCounts.remainingItems,
			packedQty: itemCounts.packedQty,
			remainingQty: itemCounts.remainingQty,
		};
	}, [packableItems, resolvedAvailableQty]);

	const onOpenUpdatePacking = () => {
		if (!canEditPacking) {
			Toast.show("Packing can only be updated while dispatch is active.", {
				type: "warning",
			});
			return;
		}
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
	};

	const onResetPacking = async () => {
		if (!order?.id || !dispatch?.id) return;
		try {
			await packing.onClearPackings({
				salesId: order.id,
				dispatchId: dispatch.id,
			});
			const prevStatus = (dispatch.status as any) || "queue";
			if (prevStatus !== "queue") {
				await actions.onUpdateDispatchStatus({
					salesId: order.id,
					dispatchId: dispatch.id,
					oldStatus: prevStatus,
					newStatus: "queue" as any,
				});
			}
			try {
				await notification.send("sales_dispatch_packing_reset", {
					payload: {
						orderNo: String(order?.orderId || pageTitle),
						dispatchId: dispatch.id,
						deliveryMode: dispatch.deliveryMode as any,
						dueDate: dispatch.dueDate as any,
						driverId: dispatch.driver?.id || undefined,
					},
				} as any);
			} catch {
				Toast.show(
					"Packing reset completed, but notification failed to send.",
					{
						type: "warning",
					},
				);
			}
			Toast.show("Packing reset", { type: "success" });
		} catch {
			Toast.show("Unable to reset packing", { type: "error" });
		}
	};

	const packingConfirmItems = useMemo(() => {
		return packableItems.map((item) => {
			const draft = packingDrafts[item.uid] || { qty: 0, lh: 0, rh: 0 };
			const hasSingle = itemHasSingleQty(item);
			const packedTotal = hasSingle ? draft.qty : draft.lh + draft.rh;
			const available = resolvedAvailableQty(item);
			const totalAvailable = hasSingle
				? asNumber(available.qty)
				: asNumber(available.lh) + asNumber(available.rh);
			const isVerified = packedTotal > 0;
			return {
				uid: item.uid,
				title: item.title,
				img: item.img,
				isVerified,
				packedQty: packedTotal,
				totalQty: totalAvailable,
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
	}, [asNumber, itemHasSingleQty, packableItems, packingDrafts]);

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
	const verifiedPackingQty = useMemo(
		() => packingConfirmItems.reduce((sum, item) => sum + item.packedQty, 0),
		[packingConfirmItems],
	);
	const verificationTotalQty = useMemo(
		() => packingConfirmItems.reduce((sum, item) => sum + item.totalQty, 0),
		[packingConfirmItems],
	);
	const verificationQtyPercent = useMemo(() => {
		if (verificationTotalQty <= 0) return 0;
		return Math.round((verifiedPackingQty / verificationTotalQty) * 100);
	}, [verifiedPackingQty, verificationTotalQty]);

	const onPackAllDraft = () => {
		const flow = startFlow({
			threadContext: "dispatch-packing-insufficient",
			feature: "dispatch/packing/pack-all",
			tags: ["packing", "pack-all"],
			inputs: buildPackingSnapshot(),
		});
		const nextDrafts = Object.fromEntries(
			packableItems.map((item) => {
				const target = resolvedAvailableQty(item);
				const hasSingle = itemHasSingleQty(item);
				const desired = hasSingle
					? {
							qty: Math.max(0, asNumber((target as any)?.qty)),
							lh: 0,
							rh: 0,
						}
					: {
							qty: 0,
							lh: Math.max(0, asNumber((target as any)?.lh)),
							rh: Math.max(0, asNumber((target as any)?.rh)),
						};
				const allocation = buildPackingPayload({
					salesItemId: Number(item.salesItemId || 0),
					enteredQty: desired as any,
					deliverables: (item.deliverables || []) as any,
					note: "Pack all draft",
				});
				const allocated = sumPackedLinesQty(allocation.packingLines as any);
				const allocatedTotal = totalQty(allocated as any);
				const desiredTotal = totalQty(desired as any);
				const shouldFallbackToDesired =
					desiredTotal > 0 &&
					allocatedTotal <= 0 &&
					((item.deliverables || []).length <= 0 ||
						(allocation.packingLines || []).length <= 0);
				const next = hasSingle
					? {
							qty: shouldFallbackToDesired
								? Math.max(0, asNumber((desired as any)?.qty))
								: Math.max(0, asNumber((allocated as any)?.qty)),
							lh: 0,
							rh: 0,
						}
					: {
							qty: 0,
							lh: shouldFallbackToDesired
								? Math.max(0, asNumber((desired as any)?.lh))
								: Math.max(0, asNumber((allocated as any)?.lh)),
							rh: shouldFallbackToDesired
								? Math.max(0, asNumber((desired as any)?.rh))
								: Math.max(0, asNumber((allocated as any)?.rh)),
						};
				return [item.uid, next];
			}),
		);
		setPackingDrafts(() => nextDrafts as any);
		logStage(flow, {
			eventType: "payload.transformed",
			stage: "pack_all_drafts",
			outputs: {
				drafts: nextDrafts,
			},
		});
		endFlow(flow, { action: "pack_all_applied" });
		// Toast.show("All item quantities updated to available quantities.", {
		//   type: "success",
		// });
	};

	const buildPackingSelectionFromDrafts = (
		note: string,
		flow?: ReturnType<typeof startFlow>,
	) => {
		const requestedItems = packableItems.flatMap((item) => {
			if (!item.salesItemId) return [];
			const draft = packingDrafts[item.uid] || {
				qty: 0,
				lh: 0,
				rh: 0,
			};
			const hasSingle = itemHasSingleQty(item);
			const enteredQty = hasSingle
				? { qty: Math.max(0, asNumber(draft.qty)) }
				: {
						lh: Math.max(0, asNumber(draft.lh)),
						rh: Math.max(0, asNumber(draft.rh)),
					};
			if (!hasQty(enteredQty as any)) return [];
			return [
				{
					salesItemId: item.salesItemId,
					itemUid: item.uid,
					title: String(item.title || "Item"),
					qty: enteredQty as any,
					note,
				},
			];
		});

		const packingLines = packableItems.flatMap((item) => {
			if (!item.salesItemId) return [];
			const draft = packingDrafts[item.uid] || {
				qty: 0,
				lh: 0,
				rh: 0,
			};
			const hasSingle = itemHasSingleQty(item);
			const enteredQty = hasSingle
				? { qty: Math.max(0, asNumber(draft.qty)) }
				: {
						lh: Math.max(0, asNumber(draft.lh)),
						rh: Math.max(0, asNumber(draft.rh)),
					};
			const built = buildPackingPayload({
				salesItemId: item.salesItemId,
				enteredQty: enteredQty as any,
				deliverables: (item.deliverables || []) as any,
				note,
			});
			logStage(flow || null, {
				eventType: "payload.transformed",
				stage: "allocation_compare",
				inputs: {
					uid: item.uid,
					title: item.title,
					salesItemId: item.salesItemId,
					mode: hasSingle ? "single" : "handled",
					enteredQty,
					deliverables: (item.deliverables || []).map((d: any) => ({
						submissionId: d.submissionId,
						qty: d.qty,
					})),
				},
				outputs: {
					pickedLines: built.packingLines,
					remainder: built.remainder,
					insufficient: hasQty(built.remainder),
				},
			});
			return built.packingLines;
		});
		return {
			packingLines,
			requestedItems,
		};
	};

	const savePackingSlip = async (opts?: { closeSlip?: boolean }) => {
		const closeSlip = opts?.closeSlip ?? true;
		if (!order?.id || !dispatch?.id) return;
		try {
			const selection = buildPackingSelectionFromDrafts(
				"Packed via packing slip",
			);
			if ((selection.requestedItems || []).length > 0) {
				await packing.onPackItemsSelection({
					salesId: order.id,
					dispatchId: dispatch.id,
					dispatchStatus: (dispatch.status as any) || "queue",
					replaceExisting: true,
					requestedItems: selection.requestedItems as any,
					packingLines: selection.packingLines,
				});
			} else {
				await packing.onClearPackings({
					salesId: order.id,
					dispatchId: dispatch.id,
				});
			}

			await overview.refetch();
			if (closeSlip) {
				setPackingSlipOpen(false);
			}
			Toast.show("Packing slip updated", { type: "success" });
			return true;
		} catch (error: any) {
			Toast.show(error?.message || "Unable to update packing slip", {
				type: "error",
			});
			return false;
		}
	};

	const onSavePackingDraft = async () => {
		const flow = startFlow({
			threadContext: "dispatch-packing-insufficient",
			feature: "dispatch/packing/save-draft",
			tags: ["packing", "save-draft"],
			inputs: buildPackingSnapshot(),
		});
		const saved = await savePackingSlip({ closeSlip: false });
		endFlow(flow, { saved });
		if (saved) setDispatchConfirmOpen(false);
	};

	const onConfirmDispatchAfterPacking = async () => {
		if (!order?.id || !dispatch?.id) return;
		const flow = startFlow({
			threadContext: "dispatch-packing-insufficient",
			feature: "dispatch/packing/confirm-dispatch",
			tags: ["packing", "confirm"],
			inputs: buildPackingSnapshot(),
		});
		try {
			logStage(flow, {
				eventType: "validation.pre",
				stage: "confirm_precheck",
				derived: {
					dispatchId: dispatch.id,
					salesId: order.id,
					progressPacked,
					progressTotal,
				},
			});
			const selection = buildPackingSelectionFromDrafts(
				"Packed via dispatch confirm",
				flow,
			);
			logStage(flow, {
				eventType: "request.sent",
				stage: "pack_items_selection",
				outputs: {
					replaceExisting: true,
					packingLineCount: selection.packingLines.length,
					requestedItemsCount: selection.requestedItems.length,
				},
			});
			if ((selection.requestedItems || []).length > 0) {
				await packing.onPackItemsSelection({
					salesId: order.id,
					dispatchId: dispatch.id,
					dispatchStatus: (dispatch.status as any) || "queue",
					replaceExisting: true,
					requestedItems: selection.requestedItems as any,
					packingLines: selection.packingLines,
				});
			} else {
				await packing.onClearPackings({
					salesId: order.id,
					dispatchId: dispatch.id,
				});
			}
			await overview.refetch();
			logStage(flow, {
				eventType: "response.received",
				stage: "pack_items_selection",
				outputs: {
					status: "ok",
				},
			});
			setPackingSlipOpen(false);
			setDispatchConfirmOpen(false);
			endFlow(flow, { confirmed: true });
			Toast.show("Dispatch confirmed.", { type: "success" });
		} catch (error: any) {
			logError(flow, "confirm_dispatch", error, buildPackingSnapshot());
			endFlow(flow, { confirmed: false });
			Toast.show(error?.message || "Unable to confirm dispatch", {
				type: "error",
			});
		}
	};

	const screenVm: DispatchDetailScreenVm = {
		onBack: () => router.back(),
		titleText:
			entryMode === "warehouse-packing"
				? order?.orderId
					? `Warehouse Packing #${order.orderId}`
					: `Warehouse ${pageTitle}`
				: entryMode === "packing"
					? `Packing ${order?.orderId ? `#${order.orderId}` : pageTitle}`
					: order?.orderId
						? `Order #${order.orderId}`
						: pageTitle,
		insetsBottom: insets.bottom,
		entryMode,
		statusText,
		packingWorkspaceStats,
		isPrimaryActionDisabled:
			actions.startDispatch.isPending ||
			!canStart ||
			dispatch?.status === "queue",
		isPrimaryActionPending: actions.startDispatch.isPending,
		primaryStatusActionLabel,
		onPrimaryStatusAction,
		isRefetching: overview.isRefetching,
		onRefresh: onRefreshOverview,
		showDriverDuplicateAlert: auth.isDriver && hasDuplicateDispatch,
		isNotificationPending: notification.isPending,
		onNotifyDuplicateDispatchToAdmin,
		showAdminDuplicateCard: auth.isAdmin,
		hasDuplicateDispatch,
		duplicateDispatches,
		duplicateInsight,
		showTripCancelCard: dispatch?.status === "in progress",
		onCancelTrip,
		isCancelTripPending: actions.cancelDispatch.isPending,
		customerName,
		customerPhone,
		customerEmail,
		addressLine1,
		addressLine2,
		itemsCount: items.length,
		topPackingItems,
		resolveItemImage,
		resolvedAvailableQty,
		totalQty,
		onSelectPackingItem: (uid: string) => ui.setSelectedItemUid(uid),
		onImagePress: setPreviewImageUri,
		showPackingButtons:
			dispatch?.status === "queue" || dispatch?.status === "packed",
		isUpdatePackingDisabled:
			!canEditPacking ||
			packing.taskTrigger.isPending ||
			dispatch?.status === "packed",
		onOpenUpdatePacking,
		isResetPackingDisabled:
			!canEditPacking ||
			packing.taskTrigger.isPending ||
			dispatch?.status === "queue",
		onResetPacking,
		showUnpackableHint: unpackableItems.length > 0,
		unpackableCount: unpackableItems.length,
		onOpenSalesRequestModal: () => presentSalesRequestModal(),
		activeDispatchId,
		activityRefreshToken,
		onIssue,
		isIssuePending: actions.cancelDispatch.isPending,
		onFooterPrimaryAction,
		footerPrimaryDisabled,
		footerPrimaryLabel,
	};

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
				<DispatchDetailScreenProvider value={screenVm}>
					<DispatchDetailTopBar />
					<DispatchDetailScrollContent />
					<DispatchDetailFooterActions />
				</DispatchDetailScreenProvider>

				{isPackingSlipOpen ? (
					<PackingSlipScreen
						insetsBottom={insets.bottom}
						dispatchLabel={pageTitle}
						customerName={customerName}
						orderId={order?.orderId}
						dueDateText={formatDispatchDate(dispatch?.dueDate as any)}
						statusText={statusText}
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
						progressTotal={progressTotal}
						isSubmitting={packing.taskTrigger.isPending}
						onClose={() => setPackingSlipOpen(false)}
						onOpenPackAll={onPackAllDraft}
						onOpenConfirmDispatch={() => {
							const flow = startFlow({
								threadContext: "dispatch-packing-insufficient",
								feature: "dispatch/packing/open-confirm",
								tags: ["packing", "open-confirm"],
								inputs: buildPackingSnapshot(),
							});
							logStage(flow, {
								eventType: "validation.pre",
								stage: "open_confirm_precheck",
								derived: {
									progressPacked,
									progressTotal,
								},
							});
							endFlow(flow, { opened: true });
							setDispatchConfirmOpen(true);
						}}
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
						verifiedPackingQty={verifiedPackingQty}
						verificationTotalQty={verificationTotalQty}
						verificationQtyPercent={verificationQtyPercent}
						isSubmitting={packing.taskTrigger.isPending}
						onClose={() => setDispatchConfirmOpen(false)}
						onSaveDraft={onSavePackingDraft}
						onConfirmDispatch={onConfirmDispatchAfterPacking}
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
						defaultNoteType={
							dispatch?.deliveryMode === "pickup" ? "pickup" : "dispatch"
						}
						defaultReceivedBy={customerName || ""}
						isSubmitting={
							actions.submitDispatch.isPending ||
							packing.taskTrigger.isPending ||
							documents.uploadDocument.isPending
						}
						onClose={() => ui.setCompleteSheetOpen(false)}
						onSubmit={async (input) => {
							if (!order?.id || !dispatch?.id) return;
							try {
								if (dispatch.deliveryMode === "pickup") {
									await packing.onPackAll({
										salesId: order.id,
										dispatchId: dispatch.id,
										dispatchStatus: (dispatch.status as any) || "queue",
									});
								}

								const attachmentPaths: { pathname: string }[] = [];
								const files = (input as any)?.attachments || [];
								for (const file of files) {
									const uploaded = await documents.uploadBase64({
										filename:
											file.fileName || `dispatch-attachment-${Date.now()}.jpg`,
										contentType: file.contentType || "image/jpeg",
										folder: `dispatch/${dispatch.id}/attachments`,
										base64: file.base64,
									});
									attachmentPaths.push({ pathname: uploaded.pathname });
								}

								let signaturePathname: string | null | undefined;
								const signaturePathRaw = String(
									(input as any)?.signaturePath || "",
								).trim();
								if (signaturePathRaw) {
									const uploadedSignature = await documents.uploadText({
										filename: `dispatch-signature-${dispatch.id}-${Date.now()}.svg`,
										contentType: "image/svg+xml",
										folder: `dispatch/${dispatch.id}/signature`,
										text: buildSignatureSvg(signaturePathRaw),
									});
									signaturePathname =
										uploadedSignature.url || uploadedSignature.pathname;
								}

								await actions.onSubmitDispatch({
									salesId: order.id,
									dispatchId: dispatch.id,
									...input,
									noteType:
										(input as any)?.noteType ||
										(dispatch.deliveryMode === "pickup"
											? "pickup"
											: "dispatch"),
									signature: signaturePathname || undefined,
									attachments: attachmentPaths,
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

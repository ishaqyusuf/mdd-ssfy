"use client";

import { Icons } from "@gnd/ui/icons";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { PackingProvider, usePacking } from "@/hooks/use-sales-packing";
import { PackingProgress } from "@/components/packing-progress";
import { Progress } from "@/components/(clean-code)/progress";
import { QtyLabel } from "@/components/qty-label";
import { PackingTabSkeleton } from "@/components/sheets/sales-overview-sheet/packing-tab.skeleton";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Badge } from "@gnd/ui/badge";
import { hasQty } from "@gnd/utils/sales";
import { cn } from "@gnd/ui/cn";
import { toast } from "@gnd/ui/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@gnd/ui/input";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@gnd/ui/alert-dialog";
import SalesOverviewSheet from "@gnd/ui/custom/sheet-v2";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemSeparator,
	ItemTitle,
} from "@gnd/ui/item";
import { SalesFormQuantityStepper } from "@sales/sales-form";
import { qtyMatrixSum, recomposeQty } from "@sales/utils/sales-control";
import type { UpdateSalesControl } from "@sales/schema";

import { getDispatchPackingItemPresentation } from "./item-presentation";
import {
	canShowPackingReviewActions,
	packingReportDecisionInput,
	packingReportStatusPresentation,
} from "./packing-report-review";
import {
	buildGuardedPackingPlan,
	type GuardedPackingLine,
} from "./guarded-packing-plan";

type Props = {
	dispatchId?: number | null;
	packItemsOpen: boolean;
	salesNo?: string | null;
	onPackItemsOpenChange: (open: boolean) => void;
};

export function DispatchPackingOverview({
	dispatchId,
	packItemsOpen,
	salesNo,
	onPackItemsOpenChange,
}: Props) {
	const trpc = useTRPC();
	const query = useQuery(
		trpc.dispatch.dispatchOverviewV2.queryOptions(
			{
				dispatchId: dispatchId || undefined,
				salesNo: salesNo || undefined,
			},
			{
				enabled: !!dispatchId,
			},
		),
	);

	if (query.isLoading) return <PackingTabSkeleton />;
	if (!query.data) {
		return (
			<Card>
				<CardContent className="p-6 text-sm text-muted-foreground">
					Unable to load dispatch packing overview.
				</CardContent>
			</Card>
		);
	}

	return (
		<PackingProvider
			args={[
				{
					data: query.data as any,
				},
			]}
		>
			<DispatchPackingOverviewContent
				packItemsOpen={packItemsOpen}
				onPackItemsOpenChange={onPackItemsOpenChange}
			/>
		</PackingProvider>
	);
}

function DispatchPackingOverviewContent({
	packItemsOpen,
	onPackItemsOpenChange,
}: Pick<Props, "packItemsOpen" | "onPackItemsOpenChange">) {
	const ctx = usePacking();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const auth = useAuth();
	const { data } = ctx;
	const dispatch = data?.dispatch;
	const order = data?.order;
	const address = data?.address || {};
	const customer = order?.customer || {};
	const duplicateInsight = data?.duplicateInsight;
	const summary = data?.summary || {
		total: 0,
		deliverable: 0,
		listed: 0,
		packed: 0,
		pending: 0,
		available: 0,
	};

	const rows = useMemo(() => data?.dispatchItems || [], [data?.dispatchItems]);
	const duplicateDispatches = useMemo(
		() => duplicateInsight?.dispatches || [],
		[duplicateInsight?.dispatches],
	);
	const [keepDispatchId, setKeepDispatchId] = useState<number | null>(null);
	const isPackedStatus = dispatch?.status === "packed";
	const isTripStarted = dispatch?.status === "in progress";
	const canResolveDuplicates = auth.roleTitle?.toLowerCase() === "super admin";

	useEffect(() => {
		setKeepDispatchId((prev) => {
			const hasPrev = duplicateDispatches.some((item) => item.id === prev);
			if (hasPrev) return prev ?? null;
			if (duplicateInsight?.currentDispatchId)
				return duplicateInsight.currentDispatchId;
			if (duplicateInsight?.recommendedKeepDispatchId)
				return duplicateInsight.recommendedKeepDispatchId;
			return duplicateDispatches[0]?.id ?? null;
		});
	}, [
		duplicateDispatches,
		duplicateInsight?.currentDispatchId,
		duplicateInsight?.recommendedKeepDispatchId,
	]);

	const resolveDuplicate = useMutation(
		trpc.dispatch.resolveDuplicateGroup.mutationOptions({
			async onSuccess() {
				await Promise.all([
					ctx.invalidate(),
					queryClient.invalidateQueries({
						queryKey: trpc.dispatch.index.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.dispatch.assignedDispatch.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.dispatch.findDuplicateGroups.queryKey(),
					}),
				]);
				toast({
					variant: "success",
					title: "Duplicate dispatch resolved",
					description: "Dispatch duplicates were cleaned successfully.",
				});
			},
			onError(error) {
				toast({
					variant: "error",
					title: "Unable to resolve duplicate",
					description: error?.message || "Please try again.",
				});
			},
		}),
	);

	const onResolveAllDuplicates = () => {
		if (!order?.id || !keepDispatchId) return;
		const deleteDispatchIds = duplicateDispatches
			.map((item) => item.id)
			.filter((id) => id !== keepDispatchId);
		if (!deleteDispatchIds.length) {
			toast({
				variant: "error",
				title: "No duplicates to remove",
				description: "Only one active dispatch remains.",
			});
			return;
		}
		resolveDuplicate.mutate({
			salesId: order.id,
			keepDispatchId,
			deleteDispatchIds,
		});
	};

	const onDeleteDuplicate = (deleteDispatchId: number) => {
		if (!order?.id || !keepDispatchId) return;
		if (deleteDispatchId === keepDispatchId) {
			toast({
				variant: "error",
				title: "Keep dispatch selected",
				description: "Change keep dispatch before deleting this one.",
			});
			return;
		}
		resolveDuplicate.mutate({
			salesId: order.id,
			keepDispatchId,
			deleteDispatchIds: [deleteDispatchId],
		});
	};

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-start justify-between gap-3">
						<div>
							<CardTitle className="text-lg">
								Dispatch Packing Overview
							</CardTitle>
							<p className="text-sm text-muted-foreground">
								{order?.orderId} • Dispatch #{dispatch?.id}
							</p>
						</div>
						<Progress>
							<Progress.Status badge>
								{dispatch?.status || "queue"}
							</Progress.Status>
						</Progress>
					</div>
				</CardHeader>
				<CardContent className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
					<Metric label="Total" value={summary.total} />
					<Metric label="Deliverable" value={summary.deliverable} />
					<Metric label="Available" value={summary.available} />
					<Metric label="Listed" value={summary.listed} />
					<Metric label="Packed" value={summary.packed} />
					<Metric label="Pending" value={summary.pending} />
				</CardContent>
				<CardContent className="pt-0">
					<PackingProgress />
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base">Shipping Details</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 md:grid-cols-2">
					<div className="space-y-2 text-sm">
						<p>
							<span className="text-muted-foreground">Recipient: </span>
							{address.name || customer.name || "-"}
						</p>
						<p>
							<span className="text-muted-foreground">Phone: </span>
							{address.phoneNo || customer.phoneNo || "-"}
						</p>
						<p>
							<span className="text-muted-foreground">Email: </span>
							{address.email || customer.email || "-"}
						</p>
						<p>
							<span className="text-muted-foreground">Address: </span>
							{formatAddress(address)}
						</p>
					</div>
					<div className="space-y-2 text-sm">
						<p>
							<span className="text-muted-foreground">Delivery Mode: </span>
							{dispatch?.deliveryMode || "-"}
						</p>
						<p>
							<span className="text-muted-foreground">Driver: </span>
							{dispatch?.driver?.name || "Unassigned"}
						</p>
						<p>
							<span className="text-muted-foreground">Dispatch #: </span>
							{dispatch?.dispatchNumber || `DISP-${dispatch?.id || "-"}`}
						</p>
						<p>
							<span className="text-muted-foreground">Due Date: </span>
							{formatDate(dispatch?.dueDate)}
						</p>
					</div>
				</CardContent>
			</Card>

			{duplicateInsight?.isDuplicate ? (
				<Card className="border-amber-300 bg-amber-50/40">
					<CardHeader className="pb-3">
						<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
							<div className="flex items-start gap-2">
								<Icons.AlertTriangle className="mt-0.5 h-4 w-4 text-amber-700" />
								<div>
									<CardTitle className="text-base text-amber-900">
										Is this a duplicate dispatch?
									</CardTitle>
									<p className="text-sm text-amber-800">
										Found {duplicateDispatches.length} active dispatches for
										this sale. Review statuses and packing before cleanup.
									</p>
								</div>
							</div>
							<Button
								size="sm"
								disabled={
									resolveDuplicate.isPending ||
									!keepDispatchId ||
									!canResolveDuplicates
								}
								onClick={onResolveAllDuplicates}
							>
								{resolveDuplicate.isPending
									? "Resolving..."
									: "Resolve All Duplicates"}
							</Button>
						</div>
					</CardHeader>
					<CardContent className="space-y-2">
						{!canResolveDuplicates ? (
							<p className="text-xs text-amber-900">
								Duplicate cleanup actions require Super Admin access.
							</p>
						) : null}
						{duplicateDispatches.map((item) => {
							const isKeep = keepDispatchId === item.id;
							return (
								<div
									key={item.id}
									className={cn(
										"rounded-md border bg-background p-3",
										isKeep && "border-emerald-500",
										item.isCurrent && "ring-1 ring-blue-300",
									)}
								>
									<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
										<div className="space-y-1">
											<div className="flex flex-wrap items-center gap-2">
												<p className="font-medium">
													{item.dispatchNumber || `Dispatch #${item.id}`}
												</p>
												<Progress>
													<Progress.Status badge>
														{item.status || "queue"}
													</Progress.Status>
												</Progress>
												{item.isCurrent ? (
													<Badge variant="secondary">Current</Badge>
												) : null}
												{isKeep ? <Badge>Keep</Badge> : null}
											</div>
											<p className="text-xs text-muted-foreground">
												Driver: {item.driverName || "Unassigned"} • Due:{" "}
												{formatDate(item.dueDate)} • Items: {item.itemCount} •
												Packed items: {item.packedItemCount}
											</p>
											<div className="flex flex-wrap gap-3 text-xs">
												<span>
													Listed: <QtyLabel {...item.listedQty} />
												</span>
												<span>
													Packed: <QtyLabel {...item.packedQty} />
												</span>
												<span
													className={cn(
														item.pendingPackingTotal > 0 && "text-amber-700",
													)}
												>
													Pending: <QtyLabel {...item.pendingPackingQty} />
												</span>
											</div>
										</div>
										<div className="flex flex-wrap gap-2">
											<Button
												size="sm"
												variant={isKeep ? "default" : "outline"}
												disabled={
													resolveDuplicate.isPending || !canResolveDuplicates
												}
												onClick={() => setKeepDispatchId(item.id)}
											>
												Keep
											</Button>
											<Button
												size="sm"
												variant="destructive"
												disabled={
													resolveDuplicate.isPending ||
													isKeep ||
													!canResolveDuplicates
												}
												onClick={() => onDeleteDuplicate(item.id)}
											>
												Delete Duplicate
											</Button>
										</div>
									</div>
								</div>
							);
						})}
					</CardContent>
				</Card>
			) : null}

			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base">Actions</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-wrap gap-2">
					<Button
						variant="outline"
						disabled={!ctx.isQueue || ctx.isStarting}
						onClick={ctx.onStartDispatch}
					>
						Start Trip
					</Button>
					<Button
						variant="outline"
						disabled={ctx.isCancelled || isPackedStatus}
						onClick={() => onPackItemsOpenChange(true)}
					>
						Pack Items
					</Button>
					{isTripStarted ? (
						<>
							<Button
								variant="outline"
								disabled={ctx.isCompleting}
								onClick={() => ctx.onCompleteDispatch("packed_only")}
							>
								Mark Delivered (Packed Only)
							</Button>
							<Button
								disabled={ctx.isCompleting}
								onClick={() => ctx.onCompleteDispatch("pack_all")}
							>
								Pack All + Mark Delivered
							</Button>
						</>
					) : null}
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="pb-3">
					<div className="flex items-center justify-between gap-2">
						<CardTitle className="text-base">Items</CardTitle>
						<Button
							size="sm"
							variant="outline"
							disabled={ctx.isCancelled || isPackedStatus}
							onClick={() => onPackItemsOpenChange(true)}
						>
							Pack
						</Button>
					</div>
				</CardHeader>
				<CardContent className="pt-0">
					<ItemGroup>
						{rows.map((item, index) => (
							<ItemRow
								key={item.uid}
								item={item}
								showSeparator={index < rows.length - 1}
							/>
						))}
					</ItemGroup>
				</CardContent>
			</Card>

			{packItemsOpen ? (
				<PackItemsForm
					items={rows}
					onCancel={() => onPackItemsOpenChange(false)}
				/>
			) : null}
		</div>
	);
}

function formatDate(value: Date | string | null | undefined) {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleDateString("en-US");
}

function formatAddress(address: {
	address1?: string | null;
	address2?: string | null;
	city?: string | null;
	state?: string | null;
	country?: string | null;
}) {
	const parts = [
		address?.address1,
		address?.address2,
		[address?.city, address?.state].filter(Boolean).join(", "),
		address?.country,
	].filter(Boolean);
	return parts.length ? parts.join(" • ") : "-";
}

function Metric({ label, value }: { label: string; value: number }) {
	return (
		<div className="rounded-md border px-3 py-2">
			<p className="text-xs uppercase tracking-wide text-muted-foreground">
				{label}
			</p>
			<p className="text-lg font-semibold">{value}</p>
		</div>
	);
}

function qtyTotal(qty?: {
	qty?: number | null;
	lh?: number | null;
	rh?: number | null;
}) {
	const q = Number(qty?.qty || 0);
	const lh = Number(qty?.lh || 0);
	const rh = Number(qty?.rh || 0);
	return q > 0 ? q : lh + rh;
}

function itemHasSingleQty(item: any) {
	const qtySources = [
		item?.totalQty,
		item?.deliverableQty,
		item?.listedQty,
		item?.availableQty,
	].filter(Boolean);

	// Prefer explicit noHandle=true signals, but ignore noHandle=false noise
	// when LH/RH are both zero (older/inconsistent payloads can send this).
	if (item?.totalQty && typeof item.totalQty.noHandle === "boolean") {
		if (item.totalQty.noHandle === true) return true;
		const totalHasHandles =
			Number(item?.totalQty?.lh || 0) > 0 ||
			Number(item?.totalQty?.rh || 0) > 0;
		if (totalHasHandles) return false;
	}
	const hasExplicitSingle = qtySources.some((qty) => qty?.noHandle === true);
	if (hasExplicitSingle) return true;
	const hasHandledQty = qtySources.some(
		(qty) => Number(qty?.lh || 0) > 0 || Number(qty?.rh || 0) > 0,
	);
	return !hasHandledQty;
}

function ItemRow({
	item,
	showSeparator,
}: {
	item: any;
	showSeparator: boolean;
}) {
	const packed = qtyTotal(item?.packedQty);
	const listed = qtyTotal(item?.listedQty);
	const available = qtyTotal(item?.availableQty);
	const target = listed > 0 ? listed : packed + available;
	const statusText =
		target <= 0
			? "No packable qty"
			: packed >= target
				? `Packed ${packed}/${target}`
				: packed > 0
					? `Partially packed ${packed}/${target}`
					: `Not packed 0/${target}`;

	const statusClass =
		target <= 0
			? "text-muted-foreground"
			: packed >= target
				? "text-emerald-600"
				: packed > 0
					? "text-amber-700"
					: "text-rose-600";
	const presentation = getDispatchPackingItemPresentation(item);

	return (
		<>
			<Item role="listitem" size="sm" className="rounded-none px-0">
				<ItemContent className="min-w-0">
					<ItemTitle className="uppercase">{presentation.title}</ItemTitle>
					<ItemDescription className="line-clamp-none uppercase">
						{presentation.description}
					</ItemDescription>
				</ItemContent>
				<ItemActions className="ml-auto self-start">
					<p className={cn("text-sm font-medium", statusClass)}>{statusText}</p>
				</ItemActions>
			</Item>
			{showSeparator ? <ItemSeparator /> : null}
		</>
	);
}

function toDraft(item: any) {
	if (itemHasSingleQty(item)) {
		return {
			qty: Math.max(0, Number(item?.packedQty?.qty || 0)),
			lh: 0,
			rh: 0,
		};
	}
	return {
		qty: 0,
		lh: Math.max(0, Number(item?.packedQty?.lh || 0)),
		rh: Math.max(0, Number(item?.packedQty?.rh || 0)),
	};
}

function getPackAllTarget(item: any) {
	const deliverableQty = recomposeQty(
		qtyMatrixSum(
			...((item?.deliverables || []).map((d: any) => d?.qty) as any),
		),
	);
	const listedQty = recomposeQty(item?.listedQty as any);
	const fallbackDeliverableQty = recomposeQty(item?.deliverableQty as any);
	const sourceQty = hasQty(deliverableQty)
		? deliverableQty
		: hasQty(listedQty)
			? listedQty
			: hasQty(fallbackDeliverableQty)
				? fallbackDeliverableQty
				: recomposeQty(item?.totalQty as any);

	if (itemHasSingleQty(item)) {
		const qtyFromSource = qtyTotal(sourceQty as any);
		return {
			qty: Math.max(0, qtyFromSource),
			lh: 0,
			rh: 0,
		};
	}

	return {
		qty: 0,
		lh: Math.max(0, Number(sourceQty?.lh || 0)),
		rh: Math.max(0, Number(sourceQty?.rh || 0)),
	};
}

function PackItemsForm({
	items,
	onCancel,
}: {
	items: any[];
	onCancel: () => void;
}) {
	const ctx = usePacking();
	const dispatch = ctx.data?.dispatch;
	const order = ctx.data?.order;
	const auth = useAuth();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [note, setNote] = useState("");
	const [drafts, setDrafts] = useState<
		Record<string, { qty: number; lh: number; rh: number }>
	>({});
	const [guardedConfirmation, setGuardedConfirmation] = useState<{
		lines: GuardedPackingLine[];
		packItems: NonNullable<UpdateSalesControl["packItems"]>;
		runNormalPacking: boolean;
	} | null>(null);
	const [queuedGuardedSubmit, setQueuedGuardedSubmit] = useState<{
		lines: GuardedPackingLine[];
		hasStarted: boolean;
	} | null>(null);
	const [isGuardedSubmitting, setIsGuardedSubmitting] = useState(false);

	const packingReportQuery = useQuery(
		trpc.packingReports.context.queryOptions(
			{ dispatchId: Number(dispatch?.id || 0) },
			{ enabled: !!dispatch?.id },
		),
	);

	const invalidatePacking = useCallback(async () => {
		if (!dispatch?.id) return;
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: trpc.packingReports.context.queryKey({
					dispatchId: Number(dispatch.id),
				}),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.dispatch.dispatchOverviewV2.pathKey(),
			}),
		]);
	}, [dispatch?.id, queryClient, trpc]);

	const submitPackingReportMutation = useMutation(
		trpc.packingReports.submit.mutationOptions(),
	);
	const decidePackingReportMutation = useMutation(
		trpc.packingReports.decide.mutationOptions({
			async onSuccess() {
				await invalidatePacking();
				toast({
					variant: "success",
					title: "Packing review updated",
				});
			},
			onError(error) {
				toast({
					variant: "error",
					title: "Unable to decide packing report",
					description: error.message,
				});
			},
		}),
	);

	useEffect(() => {
		const next: Record<string, { qty: number; lh: number; rh: number }> = {};
		items.forEach((item) => {
			next[item.uid] = toDraft(item);
		});
		setDrafts(next);
	}, [items]);

	const isSubmitting = Boolean(
		ctx.trigger?.isLoading ||
			ctx.trigger?.isActionPending ||
			queuedGuardedSubmit ||
			isGuardedSubmitting ||
			submitPackingReportMutation.isPending,
	);
	const hasPendingPackingReport = Boolean(
		packingReportQuery.data?.reports.some(
			(report) => report.status === "PENDING",
		),
	);
	const canEditPacking =
		(dispatch?.status === "queue" || dispatch?.status === "in progress") &&
		!hasPendingPackingReport;
	const packableItems = items.filter(
		(item) => !!item?.salesItemId && item?.shippable !== false,
	);

	const setQtyValue = (
		uid: string,
		key: "qty" | "lh" | "rh",
		value: number,
	) => {
		setDrafts((prev) => ({
			...prev,
			[uid]: {
				...(prev[uid] || { qty: 0, lh: 0, rh: 0 }),
				[key]: Math.max(0, Number.isFinite(value) ? value : 0),
			},
		}));
	};

	const onPackAll = () => {
		const next: Record<string, { qty: number; lh: number; rh: number }> = {};
		packableItems.forEach((item) => {
			next[item.uid] = getPackAllTarget(item);
		});
		setDrafts((prev) => ({
			...prev,
			...next,
		}));
	};

	const submitGuardedLines = useCallback(
		async (lines: GuardedPackingLine[]) => {
			if (!dispatch?.id) return;
			setIsGuardedSubmitting(true);
			try {
				for (const planned of lines) {
					const refreshed = await packingReportQuery.refetch();
					const context = refreshed.data;
					const currentLine = context?.reportableLines.find(
						(line) =>
							line.productionSubmissionId === planned.productionSubmissionId,
					);
					if (!context || !currentLine) {
						throw new Error(
							"Packing availability changed. Refresh and submit again.",
						);
					}

					await submitPackingReportMutation.mutateAsync({
						dispatchId: Number(dispatch.id),
						productionSubmissionId: currentLine.productionSubmissionId,
						dispatchAllocationKey: currentLine.dispatchAllocationKey,
						manifestRevision: context.manifestRevision,
						idempotencyKey: crypto.randomUUID(),
						physicallyVerified: true,
						qty: planned.qty,
						lhQty: planned.lhQty,
						rhQty: planned.rhQty,
						note: planned.note,
					});
				}

				await invalidatePacking();
				toast({
					variant: "success",
					title: "Guarded packing submitted",
					description:
						"The unavailable quantity is awaiting review and is not yet counted as packed.",
				});
				setNote("");
				onCancel();
			} catch (error) {
				toast({
					variant: "error",
					title: "Unable to submit guarded packing",
					description:
						error instanceof Error ? error.message : "Please try again.",
				});
			} finally {
				setIsGuardedSubmitting(false);
			}
		},
		[
			dispatch?.id,
			invalidatePacking,
			onCancel,
			packingReportQuery,
			submitPackingReportMutation,
		],
	);

	useEffect(() => {
		if (!queuedGuardedSubmit) return;
		if (ctx.trigger.status === "SYNCING" && !queuedGuardedSubmit.hasStarted) {
			setQueuedGuardedSubmit((current) =>
				current ? { ...current, hasStarted: true } : null,
			);
			return;
		}
		if (ctx.trigger.status === "COMPLETED" && queuedGuardedSubmit.hasStarted) {
			const lines = queuedGuardedSubmit.lines;
			setQueuedGuardedSubmit(null);
			void submitGuardedLines(lines);
			return;
		}
		if (ctx.trigger.status === "FAILED") {
			setQueuedGuardedSubmit(null);
		}
	}, [ctx.trigger.status, queuedGuardedSubmit, submitGuardedLines]);

	const submitPacking = () => {
		if (!dispatch?.id || !order?.id) return;

		const packItems: NonNullable<UpdateSalesControl["packItems"]> = {
			dispatchId: Number(dispatch.id),
			dispatchStatus: (dispatch.status as any) || "queue",
			packMode: "selection",
			replaceExisting: true,
			requestedItems: [],
			packingLines: [],
		};

		const planItems: Parameters<typeof buildGuardedPackingPlan>[0] = [];

		packableItems.forEach((item) => {
			const draft = drafts[item.uid] || { qty: 0, lh: 0, rh: 0 };
			const enteredQty = recomposeQty(
				itemHasSingleQty(item)
					? { qty: draft.qty, lh: 0, rh: 0 }
					: { qty: 0, lh: draft.lh, rh: draft.rh },
			);
			if (!hasQty(enteredQty)) return;

			const presentation = getDispatchPackingItemPresentation(item);

			packItems.requestedItems?.push({
				salesItemId: Number(item.salesItemId),
				itemUid: String(item.uid),
				title: presentation.title,
				qty: recomposeQty(enteredQty as any),
				note: note || undefined,
			});
			planItems.push({
				salesItemId: Number(item.salesItemId),
				itemUid: String(item.uid),
				title: presentation.title,
				requested: recomposeQty(enteredQty as any),
				deliverables: (item?.deliverables || []).map((deliverable: any) => ({
					submissionId: Number(deliverable.submissionId),
					qty: recomposeQty(deliverable.qty as any),
				})),
				note: note || undefined,
			});
		});

		const plan = buildGuardedPackingPlan(
			planItems,
			packingReportQuery.data?.reportableLines || [],
		);
		packItems.packingLines = plan.packingLines;

		if (plan.guardedLines.length) {
			if (plan.unavailable.length) {
				toast({
					variant: "error",
					title: "Quantity is not available",
					description:
						"Some quantity is neither available nor eligible for guarded packing. Record a genuine shortage in Dispatch Exceptions.",
				});
				return;
			}

			const clearsExistingPacking = packableItems.some((item) => {
				const draft = drafts[item.uid] || { qty: 0, lh: 0, rh: 0 };
				return (
					qtyTotal(item?.packedQty) > 0 &&
					qtyTotal(
						itemHasSingleQty(item)
							? { qty: draft.qty, lh: 0, rh: 0 }
							: { qty: 0, lh: draft.lh, rh: draft.rh },
					) === 0
				);
			});

			setGuardedConfirmation({
				lines: plan.guardedLines,
				packItems: {
					...packItems,
					requestedItems: [],
					packingLines: plan.packingLines,
				},
				runNormalPacking: plan.packingLines.length > 0 || clearsExistingPacking,
			});
			return;
		}

		const blockedUnavailable = plan.unavailable.filter((entry) => {
			const item = packableItems.find(
				(candidate) => Number(candidate.salesItemId) === entry.salesItemId,
			);
			return item?.itemConfig?.production !== false;
		});
		if (blockedUnavailable.length) {
			toast({
				variant: "error",
				title: "Quantity is not available",
				description:
					"Refresh the packing list or record a genuine shortage in Dispatch Exceptions.",
			});
			return;
		}

		ctx.trigger.trigger({
			taskName: "update-sales-control",
			payload: {
				meta: {
					authorId: Number(auth.id || 0),
					authorName: auth.name || "System",
					salesId: Number(order.id),
				},
				packItems,
			} as UpdateSalesControl,
		});
		onCancel();
		setNote("");
	};

	const proceedWithGuardedPacking = () => {
		const confirmation = guardedConfirmation;
		if (!confirmation || !dispatch?.id || !order?.id) return;
		setGuardedConfirmation(null);

		if (!confirmation.runNormalPacking) {
			void submitGuardedLines(confirmation.lines);
			return;
		}

		setQueuedGuardedSubmit({
			lines: confirmation.lines,
			hasStarted: false,
		});
		ctx.trigger.trigger({
			taskName: "update-sales-control",
			payload: {
				meta: {
					authorId: Number(auth.id || 0),
					authorName: auth.name || "System",
					salesId: Number(order.id),
				},
				packItems: confirmation.packItems,
			} as UpdateSalesControl,
		});
	};

	const formId = `dispatch-${dispatch?.id || "unknown"}-pack-items`;

	return (
		<>
			<SalesOverviewSheet.SecondaryContent
				className="px-1"
				Header={
					<SalesOverviewSheet.SecondaryHeader
						title="Pack items"
						description={`Order ${order?.orderId || "-"} · Dispatch #${dispatch?.id || "-"}`}
					/>
				}
				Footer={
					<SalesOverviewSheet.SecondaryFooter className="flex-row justify-end gap-3">
						<Button
							type="button"
							variant="outline"
							onClick={onCancel}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							form={formId}
							disabled={
								isSubmitting || packingReportQuery.isLoading || !canEditPacking
							}
						>
							{isSubmitting ? "Packing..." : "Pack"}
						</Button>
					</SalesOverviewSheet.SecondaryFooter>
				}
			>
				<form
					id={formId}
					className="space-y-5 py-2"
					onSubmit={(event) => {
						event.preventDefault();
						submitPacking();
					}}
				>
					<div className="flex flex-wrap items-center gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={onPackAll}
							disabled={!canEditPacking || isSubmitting}
						>
							Pack All
						</Button>
						<p className="text-xs text-muted-foreground">
							Existing packing will be replaced to match this form.
						</p>
					</div>
					<ItemGroup>
						{packableItems.map((item, index) => {
							const noHandle = itemHasSingleQty(item);
							const presentation = getDispatchPackingItemPresentation(item);
							const draft = drafts[item.uid] || {
								qty: 0,
								lh: 0,
								rh: 0,
							};
							const itemReports = (
								packingReportQuery.data?.reports || []
							).filter(
								(report) =>
									report.status === "PENDING" &&
									report.salesOrderItemId === Number(item.salesItemId),
							);
							return (
								<Fragment key={item.uid}>
									<Item
										role="listitem"
										size="sm"
										className="items-start rounded-none px-0 py-4"
									>
										<ItemContent className="min-w-0">
											<ItemTitle className="uppercase">
												{presentation.title}
											</ItemTitle>
											<ItemDescription className="line-clamp-none uppercase">
												{presentation.description}
											</ItemDescription>
											<p className="text-xs text-muted-foreground">
												Available: <QtyLabel {...item.availableQty} /> • Listed:{" "}
												<QtyLabel {...item.listedQty} /> • Packed:{" "}
												<QtyLabel {...item.packedQty} />
											</p>
											{itemReports.map((report) => {
												const status = packingReportStatusPresentation(
													report.status,
												);
												return (
													<div
														key={report.id}
														className="mt-2 space-y-2 rounded-md border border-amber-200 bg-amber-50/50 p-2"
													>
														<div className="flex flex-wrap items-center gap-2">
															<Badge
																variant="outline"
																className={status.className}
															>
																{status.label}
															</Badge>
															<span className="text-xs text-muted-foreground">
																Guarded quantity:{" "}
																<QtyLabel
																	qty={report.qty}
																	lh={report.lhQty}
																	rh={report.rhQty}
																/>
															</span>
														</div>
														{canShowPackingReviewActions(
															packingReportQuery.data?.reviewerCapability || {
																canReview: false,
															},
														) ? (
															<div className="flex flex-wrap gap-2">
																<Button
																	type="button"
																	size="sm"
																	disabled={
																		decidePackingReportMutation.isPending
																	}
																	onClick={() =>
																		decidePackingReportMutation.mutate(
																			packingReportDecisionInput(
																				{
																					id: Number(report.id),
																					updatedAt: new Date(
																						report.updatedAt!,
																					),
																				},
																				"APPROVE",
																				"Physically verified packing approved.",
																			),
																		)
																	}
																>
																	Approve and finalize
																</Button>
																<Button
																	type="button"
																	size="sm"
																	variant="outline"
																	disabled={
																		decidePackingReportMutation.isPending
																	}
																	onClick={() =>
																		decidePackingReportMutation.mutate(
																			packingReportDecisionInput(
																				{
																					id: Number(report.id),
																					updatedAt: new Date(
																						report.updatedAt!,
																					),
																				},
																				"REJECT",
																				"Physically verified packing rejected.",
																			),
																		)
																	}
																>
																	Reject
																</Button>
															</div>
														) : null}
													</div>
												);
											})}
										</ItemContent>
										<ItemActions className="basis-full items-start sm:basis-auto">
											<div
												className={cn(
													"grid w-full gap-2",
													noHandle
														? "grid-cols-1 sm:w-32"
														: "grid-cols-2 sm:w-72",
												)}
											>
												{(noHandle
													? (["qty"] as const)
													: (["lh", "rh"] as const)
												).map((key) => {
													const label =
														key === "qty"
															? "Quantity"
															: `${key.toUpperCase()} quantity`;
													return (
														<div key={key} className="space-y-1">
															<p className="text-xs font-medium uppercase text-muted-foreground">
																{key}
															</p>
															<SalesFormQuantityStepper
																label={`${label} for ${presentation.title}`}
																value={draft[key]}
																min={0}
																disabled={isSubmitting || !canEditPacking}
																className="w-full"
																onChange={(value) =>
																	setQtyValue(item.uid, key, value)
																}
															/>
														</div>
													);
												})}
											</div>
										</ItemActions>
									</Item>
									{index < packableItems.length - 1 ? <ItemSeparator /> : null}
								</Fragment>
							);
						})}
					</ItemGroup>
					<div className="space-y-2">
						<p className="text-xs font-medium text-muted-foreground">Note</p>
						<Input
							value={note}
							onChange={(e) => setNote(e.target.value)}
							placeholder="Optional note"
							disabled={isSubmitting || !canEditPacking}
						/>
					</div>
				</form>
			</SalesOverviewSheet.SecondaryContent>
			<AlertDialog
				open={!!guardedConfirmation}
				onOpenChange={(open) => {
					if (!open && !isSubmitting) setGuardedConfirmation(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Confirm guarded packing</AlertDialogTitle>
						<AlertDialogDescription>
							Some entered quantity is not currently available because its
							production or material evidence is awaiting review. Proceeding
							records it as guarded packing; it will not count as packed until
							approved, and this dispatch will remain on hold.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<div className="space-y-2">
						{guardedConfirmation?.lines.map((line) => (
							<div
								key={line.productionSubmissionId}
								className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm"
							>
								<span className="font-medium">{line.title}</span>
								<QtyLabel qty={line.qty} lh={line.lhQty} rh={line.rhQty} />
							</div>
						))}
					</div>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isSubmitting}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							disabled={isSubmitting}
							onClick={proceedWithGuardedPacking}
						>
							Proceed
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

"use client";

import { Icon, Icons } from "@gnd/ui/icons";

import { Progress } from "@/components/(clean-code)/progress";
import { useDispatchAssignmentAddressGuard } from "@/components/dispatch-assignment/address-guard";
import { PackingProgress } from "@/components/packing-progress";
import { QtyLabel } from "@/components/qty-label";
import { PackingTabSkeleton } from "@/components/sheets/sales-overview-sheet/packing-tab.skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useDriversList } from "@/hooks/use-data-list";
import { PackingProvider, usePacking } from "@/hooks/use-sales-packing";
import { useTRPC } from "@/trpc/client";
import {
	type GuardedPackingLine,
	buildGuardedPackingPlan,
	buildPackAllTarget,
} from "@gnd/sales/dispatch-packing-plan";
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
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { cn } from "@gnd/ui/cn";
import { Menu } from "@gnd/ui/custom/menu";
import { Input } from "@gnd/ui/input";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemSeparator,
	ItemTitle,
} from "@gnd/ui/item";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { hasQty } from "@gnd/utils/sales";
import { SalesFormQuantityStepper } from "@sales/sales-form";
import type { UpdateSalesControl } from "@sales/schema";
import { recomposeQty } from "@sales/utils/sales-control";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import {
	getDispatchPackingItemPresentation,
	getDispatchPackingItemStatusText,
} from "./item-presentation";
import {
	canShowPackingReviewActions,
	packingReportStatusPresentation,
} from "./packing-report-review";
import { toPackingCommandQuantity } from "./packing-command-quantity";
import {
	PackingSideSheet,
	PackingSideSheetSection,
	PackingSideSheetSkeleton,
} from "./packing-side-sheet";
type Props = {
	dispatchId?: number | null;
	packItemsOpen: boolean;
	packingReviewOpen?: boolean;
	salesNo?: string | null;
	surface?: "admin" | "driver";
	onPackItemsOpenChange: (open: boolean) => void;
	onPackingReviewOpenChange?: (open: boolean) => void;
};

export function DispatchPackingOverview({
	dispatchId,
	packItemsOpen,
	packingReviewOpen = false,
	salesNo,
	surface = "admin",
	onPackItemsOpenChange,
	onPackingReviewOpenChange,
}: Props) {
	const trpc = useTRPC();
	const adminQuery = useQuery(
		trpc.dispatch.dispatchOverviewV2.queryOptions(
			{
				dispatchId: dispatchId || undefined,
				salesNo: salesNo || undefined,
			},
			{
				enabled: surface === "admin" && !!dispatchId,
			},
		),
	);
	const driverQuery = useQuery(
		trpc.dispatch.manifest.queryOptions(
			{ dispatchId: dispatchId || 0 },
			{ enabled: surface === "driver" && !!dispatchId },
		),
	);
	const query = surface === "driver" ? driverQuery : adminQuery;

	if (query.isLoading) {
		return surface === "driver" && packItemsOpen ? (
			<PackingSideSheetSkeleton />
		) : (
			<PackingTabSkeleton />
		);
	}
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
				packingReviewOpen={packingReviewOpen}
				surface={surface}
				onPackItemsOpenChange={onPackItemsOpenChange}
				onPackingReviewOpenChange={onPackingReviewOpenChange}
			/>
		</PackingProvider>
	);
}

function DispatchPackingOverviewContent({
	packItemsOpen,
	packingReviewOpen = false,
	surface = "admin",
	onPackItemsOpenChange,
	onPackingReviewOpenChange,
}: Pick<
	Props,
	| "packItemsOpen"
	| "packingReviewOpen"
	| "surface"
	| "onPackItemsOpenChange"
	| "onPackingReviewOpenChange"
>) {
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
	const isTripStarted = dispatch?.status === "in progress";
	const isTerminalDispatch = ["in progress", "completed", "cancelled"].includes(
		String(dispatch?.status || ""),
	);
	const canResolveDuplicates = auth.roleTitle?.toLowerCase() === "super admin";
	const drivers = useDriversList(surface === "admin");
	const [pendingDriver, setPendingDriver] = useState<{
		id: number | null;
		name: string;
	} | null>(null);
	const [driverConfirmationOpen, setDriverConfirmationOpen] = useState(false);
	const assignmentAddressGuard = useDispatchAssignmentAddressGuard();

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

	const updateDriver = useMutation(
		trpc.dispatch.updateDispatchDriver.mutationOptions({
			async onSuccess(result) {
				setDriverConfirmationOpen(false);
				setPendingDriver(null);
				await Promise.all([
					ctx.invalidate(),
					queryClient.invalidateQueries({
						queryKey: trpc.dispatch.index.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.dispatch.assignedDispatch.pathKey(),
					}),
				]);
				toast({
					variant: "success",
					title: "Driver assignment updated",
					description: "The dispatch now shows the current driver.",
				});
				const failedNotification = Object.values(
					result.notificationResults,
				).find((entry) => entry && !entry.sent);
				if (
					failedNotification &&
					failedNotification.reason !== "NO_RECIPIENT"
				) {
					console.warn(
						"Driver assignment notification was not delivered",
						failedNotification,
					);
				}
			},
			onError(error) {
				toast({
					variant: "error",
					title: "Unable to update driver",
					description: error.message || "Please try again.",
				});
			},
		}),
	);

	const applyDriverUpdate = (newDriverId: number | null) => {
		if (!dispatch?.id) return;
		const oldDriverId = dispatch.driver?.id ?? null;
		if (oldDriverId === newDriverId) return;
		const update = () =>
			updateDriver.mutate({
				dispatchId: dispatch.id,
				oldDriverId,
				newDriverId,
			});
		if (newDriverId) {
			void assignmentAddressGuard.guardAssignment(
				{ dispatchIds: [dispatch.id] },
				update,
			);
			return;
		}
		update();
	};

	const requestDriverUpdate = (driver: {
		id: number | null;
		name: string;
	}) => {
		if ((dispatch?.driver?.id ?? null) === driver.id) return;
		if (dispatch?.driver?.id) {
			setPendingDriver(driver);
			setDriverConfirmationOpen(true);
			return;
		}
		applyDriverUpdate(driver.id);
	};

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

	if (surface === "driver") {
		return packItemsOpen ? (
			<PackItemsForm
				items={rows}
				layout="floating"
				onCancel={() => onPackItemsOpenChange(false)}
			/>
		) : null;
	}

	return (
		<div className="space-y-0">
			<section className="border-b pb-5">
				<div className="pb-3">
					<div className="flex items-start justify-between gap-3">
						<div>
							<h3 className="text-lg font-semibold">
								Dispatch Packing Overview
							</h3>
							<p className="text-sm text-muted-foreground">
								{order?.orderId} • Dispatch #{dispatch?.id}
							</p>
						</div>
						<Progress>
							<Progress.Status>{dispatch?.status || "queue"}</Progress.Status>
						</Progress>
					</div>
				</div>
				<div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
					<Metric label="Total" value={summary.total} />
					<Metric label="Deliverable" value={summary.deliverable} />
					<Metric label="Available" value={summary.available} />
					<Metric label="Listed" value={summary.listed} />
					<Metric label="Packed" value={summary.packed} />
					<Metric label="Pending" value={summary.pending} />
				</div>
				<div className="pt-3">
					<PackingProgress />
				</div>
			</section>

			<section className="border-b py-5">
				<h3 className="pb-3 text-base font-semibold">Shipping Details</h3>
				<div className="grid gap-4 md:grid-cols-2">
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
				</div>
			</section>

			<section className="border-b py-5">
				<div className="pb-3">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<h3 className="text-base font-semibold">Dispatch Details</h3>
							<p className="text-sm text-muted-foreground">
								Review the schedule and assignment for this dispatch.
							</p>
						</div>
						<Menu
							Trigger={
								<Button
									disabled={updateDriver.isPending}
									variant={dispatch?.driver?.name ? "outline" : "default"}
									className="h-8 gap-2"
								>
									<span>
										{updateDriver.isPending
											? "Updating..."
											: dispatch?.driver?.name
												? "Update driver"
												: "Assign driver"}
									</span>
									<Icon Icon={Icons.chevronDown} className="size-4" />
								</Button>
							}
						>
							{dispatch?.driver?.id ? (
								<Menu.Item
									onClick={() =>
										requestDriverUpdate({
											id: null,
											name: "Unassigned",
										})
									}
								>
									Unassign driver
								</Menu.Item>
							) : null}
							{drivers.map((driver) => (
								<Menu.Item
									key={driver.id}
									onClick={() =>
										requestDriverUpdate({
											id: driver.id,
											name: driver.name || `Driver #${driver.id}`,
										})
									}
								>
									<span className="uppercase">
										{driver.name || `Driver #${driver.id}`}
									</span>
								</Menu.Item>
							))}
							{!drivers.length ? (
								<Menu.Item disabled>No drivers found</Menu.Item>
							) : null}
						</Menu>
					</div>
				</div>
				<div className="grid gap-4 text-sm sm:grid-cols-2">
					<div>
						<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
							Assigned driver
						</p>
						<p className="mt-1 font-medium">
							{dispatch?.driver?.name || "Unassigned"}
						</p>
					</div>
					<div>
						<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
							Dispatch date
						</p>
						<p className="mt-1 font-medium">{formatDate(dispatch?.dueDate)}</p>
					</div>
					<div>
						<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
							Delivery mode
						</p>
						<p className="mt-1 font-medium capitalize">
							{dispatch?.deliveryMode || "-"}
						</p>
					</div>
					<div>
						<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
							Dispatch status
						</p>
						<p className="mt-1 font-medium capitalize">
							{dispatch?.status || "Queue"}
						</p>
					</div>
				</div>
			</section>

			<AlertDialog
				open={driverConfirmationOpen}
				onOpenChange={setDriverConfirmationOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Update Dispatch Driver</AlertDialogTitle>
						<AlertDialogDescription>
							Change the driver from {dispatch?.driver?.name || "Unassigned"} to{" "}
							{pendingDriver?.name || "Unassigned"}?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							disabled={updateDriver.isPending}
							onClick={() => applyDriverUpdate(pendingDriver?.id ?? null)}
						>
							{updateDriver.isPending ? "Updating..." : "Proceed"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			{assignmentAddressGuard.dialog}

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
													<Progress.Status>
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

			<section className="border-b py-5">
				<h3 className="pb-3 text-base font-semibold">Actions</h3>
				<div className="flex flex-wrap gap-2">
					<Button
						variant="outline"
						disabled={!ctx.canStartDispatch || ctx.isStarting}
						onClick={ctx.onStartDispatch}
					>
						Start Trip
					</Button>
					<Button
						variant="outline"
						disabled={isTerminalDispatch}
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
				</div>
			</section>

			<section className="pt-5">
				<div className="pb-3">
					<div className="flex items-center justify-between gap-2">
						<h3 className="text-base font-semibold">Items</h3>
						<Button
							size="sm"
							variant="outline"
							disabled={isTerminalDispatch}
							onClick={() => onPackItemsOpenChange(true)}
						>
							Pack
						</Button>
					</div>
				</div>
				<div>
					<ItemGroup className="border-y">
						{rows.map((item, index) => (
							<ItemRow
								key={item.uid}
								item={item}
								showSeparator={index < rows.length - 1}
							/>
						))}
					</ItemGroup>
				</div>
			</section>

			{packItemsOpen ? (
				<PackItemsForm
					items={rows}
					layout="sheet"
					onCancel={() => onPackItemsOpenChange(false)}
				/>
			) : null}
			<PackingBatchReviewDialog
				items={rows}
				open={packingReviewOpen}
				onOpenChange={(open) => onPackingReviewOpenChange?.(open)}
			/>
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
	const statusText = getDispatchPackingItemStatusText(item);

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

function PackingBatchReviewDialog({
	items,
	open,
	onOpenChange,
}: {
	items: any[];
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const ctx = usePacking();
	const dispatch = ctx.data?.dispatch;
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const packingReportQuery = useQuery(
		trpc.packingReports.context.queryOptions(
			{ dispatchId: Number(dispatch?.id || 0) },
			{ enabled: open && !!dispatch?.id },
		),
	);
	const pendingReports = (packingReportQuery.data?.reports || []).filter(
		(report) => report.status === "PENDING",
	);
	const reviewerCanReview = canShowPackingReviewActions(
		packingReportQuery.data?.reviewerCapability || { canReview: false },
	);
	const activeReviewStage = [
		"queue",
		"packing",
		"packing queue",
		"missing items",
		"packed",
	].includes(String(packingReportQuery.data?.dispatch.status || ""));
	const reviewableReports = pendingReports.filter(
		(report) =>
			reviewerCanReview &&
			(activeReviewStage ||
				(packingReportQuery.data?.dispatch.status === "in progress" &&
					packingReportQuery.data?.policy.reviewMode ===
						"ALLOW_DELIVERY_WHILE_PENDING")),
	);
	const canDecideBatch =
		pendingReports.length > 0 &&
		reviewableReports.length === pendingReports.length;
	const decideMutation = useMutation(
		trpc.packingReports.decideBatch.mutationOptions({
			async onSuccess() {
				await Promise.all([
					ctx.invalidate(),
					queryClient.invalidateQueries({
						queryKey: trpc.packingReports.context.queryKey({
							dispatchId: Number(dispatch?.id || 0),
						}),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.dispatch.dispatchOverviewV2.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.dispatch.manifest.pathKey(),
					}),
				]);
				onOpenChange(false);
				toast({
					variant: "success",
					title: "Packing review updated",
				});
			},
			onError(error) {
				toast({
					variant: "error",
					title: "Unable to decide packing review",
					description: error.message,
				});
			},
		}),
	);
	const decide = (action: "APPROVE" | "REJECT") => {
		if (!canDecideBatch) return;
		decideMutation.mutate({
			reports: reviewableReports.map((report) => ({
				reportId: Number(report.id),
				expectedUpdatedAt: new Date(report.updatedAt ?? 0),
			})),
			action,
			note:
				action === "APPROVE"
					? "Physically verified packing batch approved."
					: "Physically verified packing batch rejected.",
		});
	};

	return (
		<AlertDialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (!decideMutation.isPending) onOpenChange(nextOpen);
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Confirm guarded packing review</AlertDialogTitle>
					<AlertDialogDescription>
						The physically verified quantities are shown as one packing batch.
						Approve the complete batch or reject it for correction.
					</AlertDialogDescription>
				</AlertDialogHeader>
				{packingReportQuery.isLoading ? (
					<div className="space-y-3 border-y py-4" aria-busy="true">
						<p className="text-sm font-medium">Loading packing review…</p>
						<p className="text-xs text-muted-foreground">
							Verifying the latest dispatch quantities and review stage.
						</p>
					</div>
				) : pendingReports.length ? (
					<ItemGroup className="max-h-72 overflow-y-auto border-y">
						{pendingReports.map((report, index) => {
							const controlUid =
								report.salesItemControlUid ||
								report.productionSubmission?.assignment?.salesItemControlUid;
							const sourceItem = items.find(
								(item) =>
									Number(item.salesItemId) ===
										Number(report.salesOrderItemId) &&
									(!controlUid || item.uid === controlUid),
							);
							const presentation = sourceItem
								? getDispatchPackingItemPresentation(sourceItem)
								: null;
							const title =
								presentation?.title ||
								report.productionSubmission?.item?.description ||
								report.productionSubmission?.item?.dykeDescription ||
								`Item #${report.salesOrderItemId}`;
							return (
								<Fragment key={report.id}>
									<Item
										role="listitem"
										size="sm"
										className="rounded-none px-0 py-3"
									>
										<ItemContent className="min-w-0">
											<ItemTitle className="uppercase">{title}</ItemTitle>
											<ItemDescription>
												{report.submittedBy?.name
													? `Verified by ${report.submittedBy.name}`
													: "Physically verified"}
											</ItemDescription>
										</ItemContent>
										<ItemActions className="shrink-0 text-sm font-semibold">
											<QtyLabel
												qty={report.qty}
												lh={report.lhQty}
												rh={report.rhQty}
											/>
										</ItemActions>
									</Item>
									{index < pendingReports.length - 1 ? <ItemSeparator /> : null}
								</Fragment>
							);
						})}
					</ItemGroup>
				) : (
					<p className="border-y py-4 text-sm text-muted-foreground">
						This packing review has already been handled or the delivery has
						passed the required stage.
					</p>
				)}
				{!packingReportQuery.isLoading &&
				pendingReports.length > 0 &&
				!canDecideBatch ? (
					<p className="text-sm text-muted-foreground">
						The delivery has passed the configured approval stage. This packing
						batch is now read-only.
					</p>
				) : null}
				<AlertDialogFooter>
					<AlertDialogCancel disabled={decideMutation.isPending}>
						Close
					</AlertDialogCancel>
					{canDecideBatch ? (
						<>
							<AlertDialogAction
								variant="outline"
								disabled={decideMutation.isPending}
								onClick={(event) => {
									event.preventDefault();
									decide("REJECT");
								}}
							>
								Reject
							</AlertDialogAction>
							<AlertDialogAction
								disabled={decideMutation.isPending}
								onClick={(event) => {
									event.preventDefault();
									decide("APPROVE");
								}}
							>
								Approve
							</AlertDialogAction>
						</>
					) : null}
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

function PackItemsForm({
	items,
	layout,
	onCancel,
}: {
	items: any[];
	layout: "sheet" | "floating" | "inline";
	onCancel: () => void;
}) {
	const ctx = usePacking();
	const dispatch = ctx.data?.dispatch;
	const order = ctx.data?.order;
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [note, setNote] = useState("");
	const [drafts, setDrafts] = useState<
		Record<string, { qty: number; lh: number; rh: number }>
	>({});
	const [guardedConfirmation, setGuardedConfirmation] = useState<{
		lines: GuardedPackingLine[];
		packItems: NonNullable<UpdateSalesControl["packItems"]>;
	} | null>(null);

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
			queryClient.invalidateQueries({
				queryKey: trpc.dispatch.driverManifest.pathKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.dispatch.driverWorkQueueSummary.pathKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.dispatch.manifest.pathKey(),
			}),
		]);
	}, [dispatch?.id, queryClient, trpc]);

	const confirmPackingMutation = useMutation(
		trpc.dispatch.confirmPacking.mutationOptions({
			async onSuccess(result) {
				await invalidatePacking();
				toast({
					variant: "success",
					title: result.pendingReportIds.length
						? "Guarded packing submitted"
						: "Packing confirmed",
					description: result.pendingReportIds.length
						? guardedPackingBlocksDelivery
							? "Verified guarded quantity is awaiting review and this dispatch remains on hold."
							: "Verified guarded quantity is awaiting review while delivery may continue."
						: "Packing and inventory readiness were updated together.",
				});
				setNote("");
				onCancel();
			},
			onError(error) {
				const code = (error.data as { code?: string } | undefined)?.code;
				const genericError =
					!error.message ||
					error.message === "Something went wrong. Please try again.";
				toast({
					variant: "error",
					title: "Unable to confirm packing",
					description:
						code === "PRECONDITION_FAILED"
							? genericError
								? "Inventory stock or the dispatch item scope is not ready for every selected quantity. Review inventory availability before retrying."
								: error.message
							: genericError
								? "Packing could not be completed. Refresh the dispatch and review inventory availability before retrying."
								: error.message,
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
			confirmPackingMutation.isPending,
	);
	const hasPendingPackingReport = Boolean(
		packingReportQuery.data?.reports.some(
			(report) => report.status === "PENDING",
		),
	);
	const guardedPackingBlocksDelivery =
		packingReportQuery.data?.policy.reviewMode !==
		"ALLOW_DELIVERY_WHILE_PENDING";
	const canEditPacking =
		["queue", "packing", "packing queue", "missing items", "packed"].includes(
			String(dispatch?.status || ""),
		) && !hasPendingPackingReport;
	const packableItems = useMemo(
		() =>
			items.filter((item) => !!item?.salesItemId && item?.shippable !== false),
		[items],
	);
	const packAllTargets = useMemo(
		() =>
			new Map(
				packableItems.map((item) => [
					item.uid,
					buildPackAllTarget(item, itemHasSingleQty(item)),
				]),
			),
		[packableItems],
	);
	const guardedTargets = useMemo(() => {
		const targets = new Map<string, { qty: number; lh: number; rh: number }>();
		for (const item of packableItems) {
			const lines = (packingReportQuery.data?.reportableLines || []).filter(
				(line) =>
					line.salesOrderItemId === Number(item.salesItemId) &&
					(!line.itemUid || line.itemUid === item.uid),
			);
			if (!lines.length) continue;
			targets.set(
				item.uid,
				lines.reduce(
					(total, line) => ({
						qty: total.qty + Number(line.remaining.qty || 0),
						lh: total.lh + Number(line.remaining.lhQty ?? 0),
						rh: total.rh + Number(line.remaining.rhQty ?? 0),
					}),
					{ qty: 0, lh: 0, rh: 0 },
				),
			);
		}
		return targets;
	}, [packableItems, packingReportQuery.data?.reportableLines]);
	const awaitingSubmissionItemUids = useMemo(
		() =>
			new Set(
				(packingReportQuery.data?.reportableLines || [])
					.filter((line) => !line.productionSubmissionId)
					.map((line) => line.itemUid)
					.filter((uid): uid is string => Boolean(uid)),
			),
		[packingReportQuery.data?.reportableLines],
	);
	const selectionTargets = useMemo(
		() =>
			new Map(
				packableItems.map((item) => {
					const canonical = packAllTargets.get(item.uid) || {
						qty: 0,
						lh: 0,
						rh: 0,
					};
					return [
						item.uid,
						hasQty(canonical)
							? canonical
							: (guardedTargets.get(item.uid) ?? {
									qty: 0,
									lh: 0,
									rh: 0,
								}),
					] as const;
				}),
			),
		[guardedTargets, packAllTargets, packableItems],
	);
	const readyItems = useMemo(
		() =>
			packableItems.filter(
				(item) =>
					hasQty(packAllTargets.get(item.uid) || {}) &&
					!hasQty(guardedTargets.get(item.uid) || {}),
			),
		[guardedTargets, packableItems, packAllTargets],
	);
	const waitingItems = useMemo(
		() =>
			packableItems.filter(
				(item) => !readyItems.some((ready) => ready.uid === item.uid),
			),
		[packableItems, readyItems],
	);
	const actionableItems = useMemo(
		() =>
			packableItems.filter((item) =>
				hasQty(selectionTargets.get(item.uid) || {}),
			),
		[packableItems, selectionTargets],
	);
	const maxPackableCount = useMemo(
		() =>
			actionableItems.reduce(
				(total, item) => total + qtyTotal(selectionTargets.get(item.uid)),
				0,
			),
		[actionableItems, selectionTargets],
	);
	const selectedCount = useMemo(
		() =>
			actionableItems.reduce(
				(total, item) => total + qtyTotal(drafts[item.uid]),
				0,
			),
		[actionableItems, drafts],
	);
	const isPackAllActive = useMemo(
		() =>
			maxPackableCount > 0 &&
			actionableItems.every((item) => {
				const target = selectionTargets.get(item.uid) || {
					qty: 0,
					lh: 0,
					rh: 0,
				};
				const draft = drafts[item.uid] || { qty: 0, lh: 0, rh: 0 };
				return (
					Number(draft.qty || 0) === Number(target.qty || 0) &&
					Number(draft.lh || 0) === Number(target.lh || 0) &&
					Number(draft.rh || 0) === Number(target.rh || 0)
				);
			}),
		[actionableItems, drafts, maxPackableCount, selectionTargets],
	);
	const availableCount = readyItems.reduce(
		(total, item) => total + qtyTotal(packAllTargets.get(item.uid)),
		0,
	);
	const pendingCount = waitingItems.reduce((total, item) => {
		const actionable = selectionTargets.get(item.uid);
		return total + qtyTotal(hasQty(actionable) ? actionable : item.totalQty);
	}, 0);

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
		for (const item of actionableItems) {
			next[item.uid] = isPackAllActive
				? { qty: 0, lh: 0, rh: 0 }
				: (selectionTargets.get(item.uid) ?? { qty: 0, lh: 0, rh: 0 });
		}
		setDrafts((prev) => ({
			...prev,
			...next,
		}));
	};

	const submitPackingCommand = async (
		packItems: NonNullable<UpdateSalesControl["packItems"]>,
	) => {
		if (!dispatch?.id) return;
		let latest;
		try {
			latest = await queryClient.fetchQuery(
				trpc.dispatch.dispatchOverviewV2.queryOptions(
					{
						dispatchId: Number(dispatch.id),
						salesNo: order?.orderId || undefined,
					},
					{ staleTime: 0 },
				),
			);
		} catch (error) {
			toast({
				variant: "error",
				title: "Unable to refresh packing data",
				description:
					error instanceof Error ? error.message : "Please try again.",
			});
			return;
		}
		const expectedManifestRevision = String(
			latest.packingCommandRevision || "",
		);
		if (!expectedManifestRevision) {
			toast({
				variant: "error",
				title: "Packing data is still loading",
				description: "Refresh this dispatch before confirming packing.",
			});
			return;
		}
		const items = (packItems.requestedItems || []).map((item) => {
			return {
				salesItemId: Number(item.salesItemId),
				itemUid: item.itemUid || undefined,
				title: item.title || undefined,
				qty: toPackingCommandQuantity(item.qty || {}),
				note: item.note || undefined,
			};
		});
		confirmPackingMutation.mutate({
			dispatchId: Number(dispatch.id),
			requestId: crypto.randomUUID(),
			expectedManifestRevision,
			replaceExisting: true,
			items,
		});
	};

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
				availableWithoutSubmission: recomposeQty(item.availableQty as any),
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

			setGuardedConfirmation({
				lines: plan.guardedLines,
				packItems,
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

		void submitPackingCommand(packItems);
	};

	const proceedWithGuardedPacking = () => {
		const confirmation = guardedConfirmation;
		if (!confirmation || !dispatch?.id || !order?.id) return;
		setGuardedConfirmation(null);
		void submitPackingCommand(confirmation.packItems);
	};

	const renderPendingReports = (item: (typeof packableItems)[number]) =>
		(packingReportQuery.data?.reports || [])
			.filter(
				(report) =>
					report.status === "PENDING" &&
					report.salesOrderItemId === Number(item.salesItemId) &&
					(!(
						report.salesItemControlUid ||
						report.productionSubmission?.assignment?.salesItemControlUid
					) ||
						(report.salesItemControlUid ||
							report.productionSubmission?.assignment?.salesItemControlUid) ===
							item.uid),
			)
			.map((report) => {
				const status = packingReportStatusPresentation(report.status);
				return (
					<div
						key={report.id}
						className="mt-2 flex flex-wrap items-center gap-2 text-xs"
					>
						<Badge variant="outline" className={status.className}>
							{status.label}
						</Badge>
						<span className="text-muted-foreground">
							Guarded quantity:{" "}
							<QtyLabel qty={report.qty} lh={report.lhQty} rh={report.rhQty} />
						</span>
					</div>
				);
			});

	const formId = `dispatch-${dispatch?.id || "unknown"}-pack-items`;

	return (
		<>
			<PackingSideSheet
				availableCount={availableCount}
				dispatchId={dispatch?.id}
				formId={formId}
				isPackAllActive={isPackAllActive}
				isSubmitting={isSubmitting}
				layout={layout}
				maxPackableCount={maxPackableCount}
				onCancel={onCancel}
				onPackAll={onPackAll}
				onSubmit={submitPacking}
				orderNo={order?.orderId}
				packAllDisabled={
					!canEditPacking || isSubmitting || !actionableItems.length
				}
				pendingCount={pendingCount}
				selectedCount={selectedCount}
				submitDisabled={
					isSubmitting ||
					packingReportQuery.isLoading ||
					!canEditPacking ||
					selectedCount === 0
				}
			>
				<PackingSideSheetSection
					label="Ready to pack"
					lineCount={readyItems.length}
					unitCount={availableCount}
				>
					<ItemGroup>
						{readyItems.map((item, index) => {
							const noHandle = itemHasSingleQty(item);
							const presentation = getDispatchPackingItemPresentation(item);
							const draft = drafts[item.uid] || {
								qty: 0,
								lh: 0,
								rh: 0,
							};
							const packAllTarget = packAllTargets.get(item.uid) || {
								qty: 0,
								lh: 0,
								rh: 0,
							};
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
												<span className="font-semibold text-emerald-700">
													<QtyLabel {...packAllTarget} /> ready
												</span>{" "}
												• {qtyTotal(item.packedQty)} packed
											</p>
											{renderPendingReports(item)}
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
																max={Number(packAllTarget[key] || 0)}
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
									{index < readyItems.length - 1 ? <ItemSeparator /> : null}
								</Fragment>
							);
						})}
					</ItemGroup>
				</PackingSideSheetSection>
				{waitingItems.length ? (
					<PackingSideSheetSection
						label="Pending production or material review"
						lineCount={waitingItems.length}
						tone="waiting"
						unitCount={pendingCount}
					>
						<ItemGroup>
							{waitingItems.map((item, index) => {
								const presentation = getDispatchPackingItemPresentation(item);
								const guardedTarget = guardedTargets.get(item.uid) || {
									qty: 0,
									lh: 0,
									rh: 0,
								};
								const isGuarded = hasQty(guardedTarget);
								const isAwaitingSubmission = awaitingSubmissionItemUids.has(
									item.uid,
								);
								const noHandle = itemHasSingleQty(item);
								const draft = drafts[item.uid] || {
									qty: 0,
									lh: 0,
									rh: 0,
								};
								return (
									<Fragment key={item.uid}>
										<Item
											role="listitem"
											size="sm"
											className="items-start rounded-none bg-amber-50/30 px-0 py-4"
										>
											<ItemContent className="min-w-0">
												<ItemTitle className="uppercase">
													{presentation.title}
												</ItemTitle>
												<ItemDescription className="line-clamp-none uppercase">
													{presentation.description}
												</ItemDescription>
												<p className="text-xs font-semibold text-amber-700">
													{isGuarded ? (
														<>
															<QtyLabel {...guardedTarget} />{" "}
															{isAwaitingSubmission
																? "awaiting production submission; select only quantities physically verified for review"
																: guardedPackingBlocksDelivery
																	? "physically available; approval is required before delivery can continue"
																	: "physically available; approval is requested while delivery may continue"}
														</>
													) : (
														<>
															<QtyLabel {...item.totalQty} /> awaiting
															production evidence
														</>
													)}
												</p>
												{renderPendingReports(item)}
											</ItemContent>
											<ItemActions className="basis-full items-start sm:basis-auto sm:text-right">
												{isGuarded ? (
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
														).map((key) => (
															<div key={key} className="space-y-1">
																<p className="text-xs font-medium uppercase text-muted-foreground">
																	{key}
																</p>
																<SalesFormQuantityStepper
																	label={`${key.toUpperCase()} quantity for ${presentation.title}`}
																	value={draft[key]}
																	min={0}
																	max={Number(guardedTarget[key] || 0)}
																	disabled={isSubmitting || !canEditPacking}
																	onChange={(value) =>
																		setQtyValue(item.uid, key, value)
																	}
																/>
															</div>
														))}
													</div>
												) : (
													<div className="space-y-1.5">
														<Badge
															variant="outline"
															className="border-amber-200 bg-amber-50 text-amber-700"
														>
															Not available yet
														</Badge>
														<p className="text-xs text-muted-foreground">
															Returns here when submitted.
														</p>
													</div>
												)}
											</ItemActions>
										</Item>
										{index < waitingItems.length - 1 ? <ItemSeparator /> : null}
									</Fragment>
								);
							})}
						</ItemGroup>
					</PackingSideSheetSection>
				) : null}
				<div className="space-y-2 border-t px-4 py-4 md:px-6">
					<p className="text-xs font-medium text-muted-foreground">Note</p>
					<Input
						value={note}
						onChange={(e) => setNote(e.target.value)}
						placeholder="Optional note"
						disabled={isSubmitting || !canEditPacking}
					/>
				</div>
			</PackingSideSheet>
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
							records it as guarded packing.{" "}
							{guardedPackingBlocksDelivery
								? "It will not count as packed until approved, and this dispatch will remain on hold."
								: "It will remain reviewable in the activity trail while the configured policy allows delivery to continue."}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<ItemGroup className="max-h-72 overflow-y-auto border-y">
						{guardedConfirmation?.lines.map((line, index) => (
							<Fragment key={line.dispatchAllocationKey}>
								<Item
									role="listitem"
									size="sm"
									className="rounded-none px-0 py-3"
								>
									<ItemContent className="min-w-0">
										<ItemTitle className="uppercase">{line.title}</ItemTitle>
									</ItemContent>
									<ItemActions className="shrink-0 text-sm font-semibold">
										<QtyLabel qty={line.qty} lh={line.lhQty} rh={line.rhQty} />
									</ItemActions>
								</Item>
								{index < (guardedConfirmation?.lines.length || 0) - 1 ? (
									<ItemSeparator />
								) : null}
							</Fragment>
						))}
					</ItemGroup>
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

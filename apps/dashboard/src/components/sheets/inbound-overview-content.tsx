"use client";

import { formatInventoryInboundStatusLabel } from "@/components/sales-inbound-status-badge";
import { useTRPC } from "@/trpc/client";
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
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { Skeleton } from "@gnd/ui/skeleton";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { Textarea } from "@gnd/ui/textarea";
import { toast } from "@gnd/ui/use-toast";
import { useState } from "react";

const statuses = [
	"pending",
	"in_progress",
	"issue_open",
	"completed",
	"closed",
	"cancelled",
] as const;

function formatQty(value: number | null | undefined) {
	return Number(value || 0).toLocaleString(undefined, {
		maximumFractionDigits: 2,
	});
}

function formatDate(value: Date | string | null | undefined) {
	if (!value) return "Not set";
	const date = new Date(value);
	return Number.isNaN(date.getTime())
		? "Not set"
		: new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function DetailMetric({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-lg border bg-muted/20 px-4 py-3">
			<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
				{label}
			</p>
			<p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
				{value}
			</p>
		</div>
	);
}

export function InboundOverviewContent({ inboundId }: { inboundId: number }) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [statusNote, setStatusNote] = useState("");
	const [demandAdjustment, setDemandAdjustment] = useState<{
		demandId: number;
		orderId: string;
		lineTitle: string;
		currentQty: number;
		receivedQty: number;
	} | null>(null);
	const [targetQty, setTargetQty] = useState("");
	const [adjustmentReason, setAdjustmentReason] = useState("");
	const detailQuery = useQuery(
		trpc.inventories.inboundShipmentDetail.queryOptions({ inboundId }),
	);
	const activityQuery = useQuery(
		trpc.inventories.inboundActivity.queryOptions({ inboundId }),
	);
	const refresh = async () => {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: trpc.inventories.inboundShipmentDetail.queryKey({
					inboundId,
				}),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.inventories.inboundActivity.queryKey({ inboundId }),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.inventories.inboundShipments.queryKey({}),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.inventories.orderInboundShipments.pathKey(),
			}),
		]);
	};
	const updateStatus = useMutation(
		trpc.inventories.updateInboundShipmentStatus.mutationOptions({
			onSuccess: async (data) => {
				setStatusNote("");
				await refresh();
				toast({
					title: `Inbound #${data.id} updated`,
					description: `${formatInventoryInboundStatusLabel(data.previousStatus)} → ${formatInventoryInboundStatusLabel(data.status)} by ${data.actorName}.`,
					variant: "success",
				});
			},
			onError: (error) =>
				toast({
					title: "Unable to update inbound",
					description: error.message,
					variant: "destructive",
				}),
		}),
	);
	const receive = useMutation(
		trpc.inventories.receiveInboundShipment.mutationOptions({
			onSuccess: async (data) => {
				await refresh();
				toast({
					title: "Inbound received",
					description: `${formatQty(data.newlyReceivedQty)} new stock quantity posted.`,
					variant: "success",
				});
			},
			onError: (error) =>
				toast({
					title: "Unable to receive inbound",
					description: error.message,
					variant: "destructive",
				}),
		}),
	);
	const adjustDemand = useMutation(
		trpc.inventories.reduceInboundShipmentDemand.mutationOptions({
			onSuccess: async (data) => {
				setDemandAdjustment(null);
				setTargetQty("");
				setAdjustmentReason("");
				await refresh();
				toast({
					title: data.removed
						? "Item removed from inbound"
						: "Inbound quantity reduced",
					description: `${data.lineTitle}: ${formatQty(data.previousQty)} → ${formatQty(data.targetQty)} by ${data.actorName}.`,
					variant: "success",
				});
			},
			onError: (error) =>
				toast({
					title: "Unable to adjust inbound item",
					description: error.message,
					variant: "destructive",
				}),
		}),
	);

	if (detailQuery.isLoading) {
		return (
			<div className="space-y-4 py-2">
				<Skeleton className="h-28" />
				<Skeleton className="h-48" />
				<Skeleton className="h-32" />
			</div>
		);
	}
	if (detailQuery.isError || !detailQuery.data) {
		return (
			<p className="py-10 text-sm text-destructive">
				Unable to load inbound #{inboundId}.
			</p>
		);
	}
	const detail = detailQuery.data;
	const orderedQty = detail.items.reduce(
		(sum, item) => sum + Number(item.qty || 0),
		0,
	);
	const receivedQty = detail.items.reduce(
		(sum, item) => sum + Number(item.qtyGood || 0),
		0,
	);
	const issueQty = detail.items.reduce(
		(sum, item) => sum + Number(item.qtyIssue || 0),
		0,
	);
	const canReceive =
		!["completed", "closed", "cancelled"].includes(detail.status) &&
		receivedQty + issueQty < orderedQty;
	const canAdjustDemand = !["completed", "closed", "cancelled"].includes(
		detail.status,
	);
	const parsedTargetQty = Number(targetQty);
	const validDemandAdjustment = Boolean(
		demandAdjustment &&
			Number.isFinite(parsedTargetQty) &&
			parsedTargetQty >= demandAdjustment.receivedQty &&
			parsedTargetQty < demandAdjustment.currentQty &&
			adjustmentReason.trim(),
	);

	return (
		<>
			<div className="space-y-6 py-2">
				<div className="grid gap-3 sm:grid-cols-3">
					<DetailMetric label="Ordered" value={formatQty(orderedQty)} />
					<DetailMetric label="Received" value={formatQty(receivedQty)} />
					<DetailMetric label="Issues" value={formatQty(issueQty)} />
				</div>
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-base">Shipment details</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-4 text-sm sm:grid-cols-2">
						<div>
							<p className="text-xs text-muted-foreground">Supplier</p>
							<p className="mt-1 font-medium">
								{detail.supplier?.name || "No supplier"}
							</p>
						</div>
						<div>
							<p className="text-xs text-muted-foreground">PO / reference</p>
							<p className="mt-1 font-medium">
								{detail.reference || "Not set"}
							</p>
						</div>
						<div>
							<p className="text-xs text-muted-foreground">Expected</p>
							<p className="mt-1 font-medium">
								{formatDate(detail.expectedAt)}
							</p>
						</div>
						<div>
							<p className="text-xs text-muted-foreground">Created</p>
							<p className="mt-1 font-medium">{formatDate(detail.createdAt)}</p>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-base">Lifecycle controls</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<Textarea
							value={statusNote}
							onChange={(event) => setStatusNote(event.target.value)}
							maxLength={2000}
							placeholder="Optional status note for the activity history"
						/>
						<div className="flex flex-wrap gap-2">
							<Select
								value={detail.status}
								disabled={updateStatus.isPending}
								onValueChange={(status) =>
									updateStatus.mutate({
										inboundId,
										status: status as (typeof statuses)[number],
										note: statusNote.trim() || null,
									})
								}
							>
								<SelectTrigger className="min-h-10 w-48">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{statuses.map((status) => (
										<SelectItem key={status} value={status}>
											{formatInventoryInboundStatusLabel(status)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Button
								disabled={!canReceive || receive.isPending}
								onClick={() =>
									receive.mutate({
										inboundId,
										items: detail.items.map((item) => ({
											inboundShipmentItemId: item.id,
											qtyReceived: Number(item.qty || 0),
											qtyGood: Number(item.qty || 0),
											qtyIssue: 0,
											unitPrice: item.unitPrice ?? null,
										})),
									})
								}
							>
								<Icons.Warehouse className="mr-2 size-4" />
								Receive stock
							</Button>
						</div>
					</CardContent>
				</Card>
				<section className="space-y-3">
					<h3 className="text-sm font-semibold">Inbound items</h3>
					{detail.items.map((item) => (
						<Card key={item.id}>
							<CardContent className="p-4">
								<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
									<div>
										<p className="font-medium">
											{item.inventoryVariant.inventory?.name ||
												`Item #${item.id}`}
										</p>
										<p className="mt-1 text-xs text-muted-foreground">
											{item.inventoryVariant.sku ||
												item.inventoryVariant.uid ||
												`Variant #${item.inventoryVariantId}`}
										</p>
									</div>
									<div className="flex flex-wrap gap-2">
										<Badge variant="outline" className="min-h-7 px-2.5 text-xs">
											Ordered {formatQty(item.qty)}
										</Badge>
										<Badge variant="outline" className="min-h-7 px-2.5 text-xs">
											Received {formatQty(item.qtyGood)}
										</Badge>
										{Number(item.qtyIssue || 0) > 0 ? (
											<Badge
												variant="outline"
												className="min-h-7 border-amber-200 bg-amber-50 px-2.5 text-xs text-amber-700"
											>
												Issue {formatQty(item.qtyIssue)}
											</Badge>
										) : null}
									</div>
								</div>
								{item.inboundDemands.length ? (
									<div className="mt-4 space-y-2 border-t pt-3">
										{item.inboundDemands.map((demand) => (
											<div
												key={demand.id}
												className="flex items-center justify-between gap-3 text-sm"
											>
												<span className="truncate text-muted-foreground">
													{demand.lineItemComponent.parent.sale?.orderId ||
														"Order"}{" "}
													· {formatInventoryInboundStatusLabel(demand.status)}
												</span>
												<span className="shrink-0 tabular-nums">
													{formatQty(demand.qtyReceived)} /{" "}
													{formatQty(demand.qty)}
												</span>
												<Button
													type="button"
													variant="outline"
													size="sm"
													disabled={!canAdjustDemand || adjustDemand.isPending}
													onClick={() => {
														const currentQty = Number(demand.qty || 0);
														const receivedQty = Number(demand.qtyReceived || 0);
														setDemandAdjustment({
															demandId: demand.id,
															orderId:
																demand.lineItemComponent.parent.sale?.orderId ||
																"Order",
															lineTitle:
																demand.lineItemComponent.parent.title ||
																"Line item",
															currentQty,
															receivedQty,
														});
														setTargetQty(String(receivedQty));
														setAdjustmentReason("");
													}}
												>
													Adjust
												</Button>
											</div>
										))}
									</div>
								) : null}
							</CardContent>
						</Card>
					))}
				</section>
				<section className="space-y-3">
					<h3 className="text-sm font-semibold">Activity history</h3>
					{activityQuery.isLoading ? (
						<Skeleton className="h-28" />
					) : (
						(activityQuery.data ?? []).map((activity) => (
							<div key={activity.id} className="rounded-lg border px-4 py-3">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<p className="text-sm font-medium">
										{activity.subject || "Inbound activity"}
									</p>
									<span className="text-xs text-muted-foreground">
										{formatDate(activity.createdAt)}
									</span>
								</div>
								<p className="mt-1 text-sm text-muted-foreground">
									{activity.headline}
								</p>
								{activity.note ? (
									<p className="mt-2 rounded-md bg-muted/40 p-3 text-sm">
										{activity.note}
									</p>
								) : null}
							</div>
						))
					)}
				</section>
			</div>
			<AlertDialog
				open={Boolean(demandAdjustment)}
				onOpenChange={(open) => {
					if (!open && !adjustDemand.isPending) setDemandAdjustment(null);
				}}
			>
				<AlertDialogContent size="sm" className="gap-6 p-6 sm:max-w-lg">
					<AlertDialogHeader>
						<AlertDialogTitle>Review inbound quantity change</AlertDialogTitle>
						<AlertDialogDescription>
							This changes only {demandAdjustment?.orderId}&apos;s linked
							demand. Enter zero to remove an unreceived item from this inbound;
							the sales demand will remain open for reassignment.
						</AlertDialogDescription>
					</AlertDialogHeader>
					{demandAdjustment ? (
						<div className="space-y-4">
							<div className="rounded-lg border bg-muted/30 p-4 text-sm">
								<p className="font-medium">{demandAdjustment.lineTitle}</p>
								<p className="mt-1 text-muted-foreground">
									Ordered {formatQty(demandAdjustment.currentQty)} · Already
									received {formatQty(demandAdjustment.receivedQty)}
								</p>
							</div>
							{demandAdjustment.receivedQty > 0 ? (
								<p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
									Received stock is permanent evidence. The new quantity cannot
									be below {formatQty(demandAdjustment.receivedQty)}.
								</p>
							) : null}
							<div className="space-y-2">
								<Label htmlFor="inbound-target-qty">New inbound quantity</Label>
								<Input
									id="inbound-target-qty"
									type="number"
									min={demandAdjustment.receivedQty}
									max={demandAdjustment.currentQty}
									step="any"
									value={targetQty}
									onChange={(event) => setTargetQty(event.target.value)}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="inbound-adjustment-reason">Reason</Label>
								<Textarea
									id="inbound-adjustment-reason"
									value={adjustmentReason}
									onChange={(event) => setAdjustmentReason(event.target.value)}
									maxLength={2000}
									placeholder="Explain why this inbound quantity is changing"
								/>
							</div>
						</div>
					) : null}
					<AlertDialogFooter className="gap-2 sm:gap-3">
						<AlertDialogCancel disabled={adjustDemand.isPending}>
							Keep current quantity
						</AlertDialogCancel>
						<AlertDialogAction
							disabled={!validDemandAdjustment || adjustDemand.isPending}
							onClick={(event) => {
								event.preventDefault();
								if (!demandAdjustment || !validDemandAdjustment) return;
								adjustDemand.mutate({
									inboundId,
									demandId: demandAdjustment.demandId,
									targetQty: parsedTargetQty,
									note: adjustmentReason.trim(),
								});
							}}
						>
							{parsedTargetQty === 0
								? "Remove from inbound"
								: "Reduce quantity"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

"use client";

import { env } from "@/env.mjs";
import { InboundNeedsApplicationActions } from "@/components/inventory/inbound-needs-application-actions";
import { formatInventoryInboundStatusLabel } from "@/components/sales-inbound-status-badge";
import { formatInventoryItemSubtitle } from "@/components/sales-overview-system/lib/inventory-display";
import { ActivityHistory, type ActivityHistoryNode } from "@/components/chat/activity-history";
import { useTRPC } from "@/trpc/client";
import { activityTag } from "@notifications/activity-tree";
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
import { Collapsible, CollapsibleContent } from "@gnd/ui/collapsible";
import { cn } from "@gnd/ui/cn";
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
import Image from "next/image";
import { useMemo, useState } from "react";

const statuses = [
	"pending",
	"in_progress",
	"issue_open",
	"completed",
	"closed",
	"cancelled",
] as const;

type ChatAttachment = {
	pathname: string;
	name: string;
};

function Attachments({
	attachments,
	onRemove,
}: {
	attachments: ChatAttachment[];
	onRemove: (pathname: string) => void;
}) {
	if (!attachments.length) {
		return null;
	}

	return (
		<div className="flex flex-wrap gap-2 p-1">
			{attachments.map((file) => {
				const url = `${env.NEXT_PUBLIC_VERCEL_BLOB_URL}/${file.pathname}`;
				const isImage = Boolean(file.pathname.match(/\.(png|jpe?g|gif|webp|svg)$/i));

				return (
					<div
						key={file.pathname}
						className="group relative flex h-10 w-10 items-center justify-center rounded-lg border bg-muted/30 overflow-hidden"
					>
						{isImage ? (
							<Image
								src={url}
								alt={file.name}
								width={40}
								height={40}
								className="h-full w-full object-cover"
							/>
						) : (
							<Icons.File className="size-4 text-muted-foreground" />
						)}
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="absolute inset-0 size-full rounded-lg bg-background/80 opacity-0 transition-opacity group-hover:opacity-100"
							onClick={() => onRemove(file.pathname)}
						>
							<Icons.X className="size-4 text-destructive" />
							<span className="sr-only">Remove {file.name}</span>
						</Button>
					</div>
				);
			})}
		</div>
	);
}

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
	const [isChatOpen, setIsChatOpen] = useState(false);
	const [commentText, setCommentText] = useState("");
	const [chatAttachments, setChatAttachments] = useState<ChatAttachment[]>([]);
	const [isUploading, setIsUploading] = useState(false);

	const detailQuery = useQuery(
		trpc.inventories.inboundShipmentDetail.queryOptions({ inboundId }),
	);
	const treeActivityQuery = useQuery(
		trpc.notes.activityTree.queryOptions({
			filter: activityTag("inboundId", String(inboundId)),
			tagFilterMode: "all",
			includeChildren: true,
			pageSize: 40,
			maxDepth: 4,
		}),
	);
	const legacyActivityQuery = useQuery(
		trpc.inventories.inboundActivity.queryOptions({ inboundId }),
	);
	const activityRows = useMemo(() => {
		const treeData = (treeActivityQuery.data?.data || []) as ActivityHistoryNode[];
		if (treeData.length > 0) return treeData;

		const legacyItems = legacyActivityQuery.data ?? [];
		return [...legacyItems].reverse().map((activity) => ({
			id: activity.id,
			createdAt: activity.createdAt,
			subject: activity.subject,
			headline: activity.headline,
			description: null,
			note: activity.note,
			senderContactName: activity.senderContact?.name || "System",
			tags: activity.tags || {},
			children: [],
		}));
	}, [treeActivityQuery.data, legacyActivityQuery.data]);

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
				queryKey: trpc.notes.activityTree.pathKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.inventories.inboundShipments.queryKey({}),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.inventories.orderInboundShipments.pathKey(),
			}),
		]);
	};
	const uploadMutation = useMutation(trpc.storage.upload.mutationOptions());
	const saveInboundNoteMutation = useMutation(
		trpc.notes.saveInboundNote.mutationOptions({
			onSuccess: async () => {
				setCommentText("");
				setChatAttachments([]);
				setIsChatOpen(false);
				await refresh();
				toast({
					title: "Comment added",
					variant: "success",
				});
			},
			onError: (error) => {
				toast({
					title: "Unable to add comment",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(event.target.files || []);
		if (!files.length) return;
		setIsUploading(true);
		try {
			for (const file of files) {
				const reader = new FileReader();
				const contentPromise = new Promise<string>((resolve, reject) => {
					reader.onload = () => {
						const result = reader.result as string;
						resolve(result.split(",")[1] || "");
					};
					reader.onerror = reject;
					reader.readAsDataURL(file);
				});
				const content = await contentPromise;
				const uploaded = await uploadMutation.mutateAsync({
					path: "inbound-documents",
					filename: file.name,
					contentType: file.type || "application/octet-stream",
					content,
				});
				setChatAttachments((prev) => [
					...prev,
					{ pathname: uploaded.pathname, name: file.name },
				]);
			}
		} catch (error: any) {
			toast({
				title: "Unable to upload file",
				description: error?.message || "Please try again",
				variant: "destructive",
			});
		} finally {
			setIsUploading(false);
			event.target.value = "";
		}
	};

	const handleRemoveAttachment = (pathname: string) => {
		setChatAttachments((prev) => prev.filter((a) => a.pathname !== pathname));
	};

	const handleSendComment = () => {
		if (!commentText.trim() && !chatAttachments.length) return;
		if (!detailQuery.data) return;

		const detail = detailQuery.data;
		const salesId =
			detail.items[0]?.inboundDemands[0]?.lineItemComponent?.parent?.saleId ?? 0;

		saveInboundNoteMutation.mutate({
			salesId,
			orderNo: detail.reference || `Inbound #${inboundId}`,
			status: (detail.status as any) || "pending",
			note: commentText.trim() || null,
			attachments: chatAttachments.map((a) => ({ pathname: a.pathname })),
		});
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
							<InboundNeedsApplicationActions
								inboundId={inboundId}
								onChanged={refresh}
							/>
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
											{formatInventoryItemSubtitle({
												variantName:
													item.inventoryVariant.sku ||
													item.inventoryVariant.uid,
												fallback: `Variant #${item.inventoryVariantId}`,
											})}
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
				<Collapsible open={isChatOpen} onOpenChange={setIsChatOpen} className="w-full">
					<CollapsibleContent className="transition-all duration-300 ease-in-out data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down pb-3">
						<div className="flex flex-col rounded-xl border border-border bg-card p-2 shadow-xs">
							<Attachments attachments={chatAttachments} onRemove={handleRemoveAttachment} />
							<div className="flex items-center gap-2">
								<label htmlFor="inbound-collapsible-chat-upload" className="cursor-pointer">
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="size-8 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
										disabled={isUploading}
										asChild
									>
										<span>
											{isUploading ? (
												<Icons.Spinner className="size-4 animate-spin" />
											) : (
												<Icons.Plus className="size-4" />
											)}
											<span className="sr-only">Add attachment</span>
										</span>
									</Button>
								</label>
								<input
									id="inbound-collapsible-chat-upload"
									type="file"
									multiple
									className="hidden"
									onChange={handleFileUpload}
								/>
								<Textarea
									value={commentText}
									onChange={(e) => setCommentText(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter" && !e.shiftKey) {
											e.preventDefault();
											void handleSendComment();
										}
									}}
									placeholder="Write a comment..."
									className="min-h-[32px] max-h-32 flex-1 resize-none border-0 bg-transparent p-0 text-sm shadow-none focus:ring-0 focus-visible:border-0 focus-visible:outline-none focus-visible:ring-0"
								/>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="size-8 shrink-0 rounded-full text-primary hover:bg-primary/10 hover:text-primary"
									disabled={
										saveInboundNoteMutation.isPending ||
										(!commentText.trim() && !chatAttachments.length)
									}
									onClick={handleSendComment}
								>
									{saveInboundNoteMutation.isPending ? (
										<Icons.Spinner className="size-4 animate-spin" />
									) : (
										<Icons.Send className="size-4" />
									)}
									<span className="sr-only">Send comment</span>
								</Button>
							</div>
						</div>
					</CollapsibleContent>
				</Collapsible>
				<ActivityHistory
					data={activityRows}
					isPending={treeActivityQuery.isPending && legacyActivityQuery.isPending}
					isError={treeActivityQuery.isError && legacyActivityQuery.isError}
					title="Activity History"
					emptyText="No activity history yet"
					headerAction={
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="h-7 gap-1.5 rounded-full px-2.5 text-xs shadow-none"
							onClick={() => setIsChatOpen((open) => !open)}
						>
							<Icons.Plus
								className={cn(
									"size-3.5 transition-transform duration-200",
									isChatOpen && "rotate-45",
								)}
							/>
							<span>{isChatOpen ? "Close" : "Add note"}</span>
						</Button>
					}
					className="min-h-[180px]"
				/>
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

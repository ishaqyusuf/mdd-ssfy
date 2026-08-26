"use client";

import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@gnd/ui/dialog";
import { Icons } from "@gnd/ui/icons";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { format } from "date-fns";
import { useMemo, useState } from "react";

import {
	selectInboundAttentionBatch,
	toggleInboundAttentionSelection,
} from "./inbound-needs-attention-selection";

export function InboundNeedsAttentionProvider() {
	const auth = useAuth();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const canApply = Boolean(auth.can?.editInboundOrder);
	const [open, setOpen] = useState(false);
	const [selectedIds, setSelectedIds] = useState<number[]>([]);
	const summaryQuery = useQuery(
		trpc.inventories.inboundNeedsApplicationAttentionSummary.queryOptions(
			undefined,
			{ enabled: canApply },
		),
	);
	const attentionQuery = useQuery(
		trpc.inventories.inboundNeedsApplicationAttention.queryOptions(
			{ take: 100 },
			{ enabled: canApply && open },
		),
	);
	const rows = attentionQuery.data ?? [];
	const attentionCount = summaryQuery.data?.count ?? 0;
	const availableIds = useMemo(
		() => new Set(rows.map((row) => row.inboundId)),
		[rows],
	);

	const validSelectedIds = selectedIds.filter((id) => availableIds.has(id));

	const applyMutation = useMutation(
		trpc.inventories.applyInboundNeedsApplicationAttention.mutationOptions({
			onSuccess: async (result) => {
				setSelectedIds([]);
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey:
							trpc.inventories.inboundNeedsApplicationAttention.queryKey({
								take: 100,
							}),
					}),
					queryClient.invalidateQueries({
						queryKey:
							trpc.inventories.inboundNeedsApplicationAttentionSummary.queryKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.inventories.inboundShipments.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.inventories.salesInventoryOverview.pathKey(),
					}),
				]);
				toast({
					title: "Inbound needs updated",
					description: `${result.changedCount} inbound${result.changedCount === 1 ? "" : "s"} applied across ${result.updatedDemandCount} material need${result.updatedDemandCount === 1 ? "" : "s"}.`,
					variant: "success",
				});
			},
			onError: (error) => {
				toast({
					title: "Unable to apply inbound needs",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	if (!canApply || attentionCount === 0) return null;

	const allSelected =
		rows.length > 0 &&
		rows.every((row) => validSelectedIds.includes(row.inboundId));
	const pendingIds = applyMutation.variables?.inboundIds ?? [];

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					type="button"
					className="fixed top-1/2 right-4 z-40 h-auto max-w-[min(22rem,calc(100vw-2rem))] -translate-y-1/2 justify-start gap-3 rounded-full border border-amber-300 bg-amber-50 px-4 py-3 text-left text-amber-950 shadow-lg hover:bg-amber-100 hover:text-amber-950"
					aria-label={`${attentionCount} received inbounds need application`}
				>
					<span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
						<Icons.AlertTriangle className="size-4" />
					</span>
					<span className="min-w-0">
						<span className="block text-xs font-semibold uppercase tracking-wide text-amber-700">
							Needs attention
						</span>
						<span className="block truncate text-sm font-semibold">
							{attentionCount} received inbound
							{attentionCount === 1 ? "" : "s"} not applied
						</span>
					</span>
					<Badge className="shrink-0 rounded-full bg-amber-600 text-white">
						{attentionCount}
					</Badge>
				</Button>
			</DialogTrigger>

			<DialogContent className="max-h-[88vh] max-w-4xl overflow-hidden p-0">
				<DialogHeader className="border-b px-6 pt-6 pb-4 text-left">
					<DialogTitle>Received inbounds not applied to Needs</DialogTitle>
					<DialogDescription>
						These receipts are complete, but some linked material Needs still
						have unapplied quantity. Applying changes Needs only; physical stock
						is unchanged.
					</DialogDescription>
				</DialogHeader>

				<div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-6 py-3">
					<label
						htmlFor="select-all-inbound-needs-attention"
						className="flex cursor-pointer items-center gap-2 text-sm font-medium"
					>
						<Checkbox
							id="select-all-inbound-needs-attention"
							checked={allSelected}
							onCheckedChange={(checked) =>
								setSelectedIds(
									checked === true
										? selectInboundAttentionBatch(
												rows.map((row) => row.inboundId),
											)
										: [],
								)
							}
						/>
						Select all
					</label>
					<span className="text-xs text-muted-foreground">
						{validSelectedIds.length} of {rows.length} selected
					</span>
				</div>

				<div className="max-h-[58vh] overflow-y-auto px-6 pb-24">
					{attentionQuery.isLoading ? (
						<p className="py-8 text-center text-sm text-muted-foreground">
							Loading inbound details…
						</p>
					) : null}
					<div className="divide-y">
						{rows.map((row) => {
							const isPending = pendingIds.includes(row.inboundId);
							return (
								<div
									key={row.inboundId}
									className="grid gap-4 py-4 sm:grid-cols-[auto_minmax(0,1.3fr)_minmax(0,1fr)_auto] sm:items-center"
								>
									<Checkbox
										checked={validSelectedIds.includes(row.inboundId)}
										onCheckedChange={(checked) =>
											setSelectedIds((current) =>
												toggleInboundAttentionSelection(
													current,
													row.inboundId,
													checked === true,
												),
											)
										}
										aria-label={`Select inbound ${row.inboundId}`}
									/>
									<div className="min-w-0">
										<p className="font-semibold">
											{row.orderNumbers.length
												? row.orderNumbers.join(", ")
												: `Inbound #${row.inboundId}`}
										</p>
										<p className="truncate text-sm text-muted-foreground">
											Author: {row.author}
										</p>
									</div>
									<div className="flex flex-wrap items-center gap-2 text-sm">
										<Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
											Received
										</Badge>
										<span className="whitespace-nowrap text-muted-foreground">
											{format(
												new Date(row.receivedAt ?? row.createdAt),
												"MMM d, yyyy",
											)}
										</span>
										<span className="whitespace-nowrap font-medium">
											Needs {row.appliedQty} of {row.capacityQty}
										</span>
									</div>
									<Button
										type="button"
										size="sm"
										disabled={applyMutation.isPending}
										onClick={() =>
											applyMutation.mutate({ inboundIds: [row.inboundId] })
										}
									>
										{isPending ? "Applying…" : "Apply"}
									</Button>
								</div>
							);
						})}
					</div>
				</div>

				{validSelectedIds.length > 0 ? (
					<div className="pointer-events-none fixed inset-x-0 bottom-6 z-[110] flex justify-center px-4">
						<div className="pointer-events-auto flex items-center gap-4 rounded-full border bg-background px-4 py-3 shadow-2xl">
							<span className="text-sm font-medium">
								{validSelectedIds.length} inbound
								{validSelectedIds.length === 1 ? "" : "s"}
							</span>
							<Button
								type="button"
								disabled={applyMutation.isPending}
								onClick={() =>
									applyMutation.mutate({ inboundIds: validSelectedIds })
								}
							>
								{applyMutation.isPending ? "Applying…" : "Apply selected"}
							</Button>
						</div>
					</div>
				) : null}
			</DialogContent>
		</Dialog>
	);
}

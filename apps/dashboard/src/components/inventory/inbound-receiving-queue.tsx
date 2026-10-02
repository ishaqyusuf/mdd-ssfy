"use client";
import { useAuth } from "@/hooks/use-auth";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";

import { toast } from "sonner";
import { InboundStatusReconciliationPanel } from "./inbound-status-reconciliation-panel";

import { useInboundReceiving } from "./inbound-receiving-context";
export function InboundReceivingQueueContent() {
	const auth = useAuth();
	const canEdit = Boolean(auth.can.editInboundOrder);
	const {
		trpc,
		suppliers,
		demandQueue,
		inboundReconciliation,
		reorderSuggestions,
		reorderSummary,
		demandQueueQuery,
		reorderSuggestionsQuery,
		createInboundMutation,
		createFromDemandsMutation,

		selectedSupplierId,
		setSelectedSupplierId,
		selectedDemandIds,
		setSelectedDemandIds,
	} = useInboundReceiving();
	return (
		<div className="space-y-6">
			<InboundStatusReconciliationPanel
				reconciliation={inboundReconciliation}
			/>

			<section className="space-y-4 border-t py-5">
				<div className="space-y-1">
					<h3 className="text-sm font-semibold">Receiving Tray</h3>
					<p className="text-xs text-muted-foreground">
						Open shortage demand that still needs inbound coverage.
					</p>
				</div>

				<div className="space-y-3 border-b py-3">
					<Select
						value={selectedSupplierId}
						onValueChange={setSelectedSupplierId}
					>
						<SelectTrigger>
							<SelectValue placeholder="Supplier (optional)" />
						</SelectTrigger>
						<SelectContent>
							{suppliers.map((supplier) => (
								<SelectItem key={supplier.id} value={String(supplier.id)}>
									{supplier.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<div className="flex gap-2">
						<Button
							className="flex-1"
							onClick={() => {
								createInboundMutation.mutate({
									supplierId: selectedSupplierId
										? Number(selectedSupplierId)
										: null,
								});
							}}
							disabled={!canEdit || createInboundMutation.isPending}
						>
							New Inbound
						</Button>
						<Button
							variant="outline"
							className="flex-1"
							onClick={() => {
								if (!selectedDemandIds.length) {
									toast.error("Select demand rows to create inbound from");
									return;
								}
								createFromDemandsMutation.mutate({
									supplierId: selectedSupplierId
										? Number(selectedSupplierId)
										: null,
									demandIds: selectedDemandIds,
								});
							}}
							disabled={
								!canEdit ||
								createFromDemandsMutation.isPending ||
								!selectedDemandIds.length
							}
						>
							Create From Demand
						</Button>
					</div>
				</div>

				<div className="space-y-2">
					{demandQueueQuery.isPending ? (
						<p>Loading shortage needs…</p>
					) : demandQueueQuery.isError ? (
						<div role="alert">
							<p>{demandQueueQuery.error.message}</p>
							<Button
								variant="outline"
								onClick={() => demandQueueQuery.refetch()}
							>
								Retry
							</Button>
						</div>
					) : !demandQueue.length ? (
						<p>No open shortage needs.</p>
					) : null}
					{demandQueue.map((row) => {
						const checked = selectedDemandIds.includes(row.id);
						const orderNo = row.lineItemComponent.parent.sale?.orderId;
						return (
							<label
								key={row.id}
								className="flex cursor-pointer items-start gap-3 border-b py-3"
							>
								<input
									type="checkbox"
									checked={checked}
									onChange={(event) => {
										setSelectedDemandIds((current) =>
											event.target.checked
												? [...current, row.id]
												: current.filter((id) => id !== row.id),
										);
									}}
								/>
								<div className="min-w-0 flex-1">
									<div className="flex items-center justify-between gap-2">
										<p className="truncate text-sm font-medium">
											{row.inventoryVariant.inventory.name}
										</p>
										<span className="text-xs uppercase text-muted-foreground">
											{row.status.replaceAll("_", " ")}
										</span>
									</div>
									<p className="text-xs text-muted-foreground">
										{orderNo ? `Order ${orderNo}` : "Unassigned order"}
									</p>
									<p className="text-xs text-muted-foreground">
										Need {Number(row.qty || 0)} / received{" "}
										{Number(row.qtyReceived || 0)}
									</p>
								</div>
							</label>
						);
					})}
				</div>
			</section>

			<section className="space-y-4 border-t py-5">
				<div className="space-y-1">
					<h3 className="text-sm font-semibold">Reorder Suggestions</h3>
					<p className="text-xs text-muted-foreground">
						Open inbound demand grouped by supplier and variant.
					</p>
				</div>

				<div className="grid grid-cols-2 gap-3">
					<div className="border-b px-3 py-2">
						<p className="text-lg font-semibold text-foreground">
							{Number(reorderSummary?.suggestionCount || 0)}
						</p>
						<p className="text-[11px] uppercase tracking-wide text-muted-foreground">
							Suggestions
						</p>
					</div>
					<div className="border-b px-3 py-2">
						<p className="text-lg font-semibold text-foreground">
							{Number(reorderSummary?.suggestedOrderQty || 0)}
						</p>
						<p className="text-[11px] uppercase tracking-wide text-muted-foreground">
							Suggested Qty
						</p>
					</div>
				</div>

				<div className="space-y-2">
					{reorderSuggestions.slice(0, 8).map((suggestion) => (
						<div
							key={`${suggestion.supplierId}-${suggestion.inventoryVariantId}`}
							className="border-b py-3"
						>
							<div className="flex items-start justify-between gap-3">
								<div className="min-w-0">
									<p className="truncate text-sm font-medium">
										{suggestion.inventoryName ||
											suggestion.sku ||
											"Unknown item"}
									</p>
									<p className="text-xs text-muted-foreground">
										{suggestion.supplierName}
										{suggestion.supplierSku
											? ` • ${suggestion.supplierSku}`
											: ""}
									</p>
								</div>
								<Badge variant="outline">{suggestion.demandCount} demand</Badge>
							</div>
							<div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
								<div>
									<p className="font-semibold text-foreground">
										{suggestion.openDemandQty}
									</p>
									<p>Open</p>
								</div>
								<div>
									<p className="font-semibold text-foreground">
										{suggestion.suggestedOrderQty}
									</p>
									<p>Order</p>
								</div>
								<div>
									<p className="font-semibold text-foreground">
										{suggestion.leadTimeDays ?? "-"}
									</p>
									<p>Lead days</p>
								</div>
							</div>
							<Button
								type="button"
								size="sm"
								variant="outline"
								className="mt-3 w-full"
								onClick={() => {
									if (suggestion.supplierId) {
										setSelectedSupplierId(String(suggestion.supplierId));
									}
									setSelectedDemandIds(suggestion.demandIds);
								}}
							>
								Stage Demand
							</Button>
						</div>
					))}
					{reorderSuggestionsQuery.isPending ? (
						<p>Loading reorder needs…</p>
					) : reorderSuggestionsQuery.isError ? (
						<div role="alert">
							<p>{reorderSuggestionsQuery.error.message}</p>
							<Button onClick={() => reorderSuggestionsQuery.refetch()}>
								Retry
							</Button>
						</div>
					) : !reorderSuggestions.length ? (
						<p className="text-sm text-muted-foreground">
							No reorder suggestions yet.
						</p>
					) : null}
				</div>
			</section>
		</div>
	);
}

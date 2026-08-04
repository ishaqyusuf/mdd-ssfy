"use client";

import { formatInventoryInboundStatusLabel } from "@/components/sales-inbound-status-badge";
import { resolveInboundReference } from "@/components/sales-overview-system/lib/inbound-activity-actions";
import { isInventoryNeedRow } from "@/components/sales-overview-system/lib/inventory-inbounds-utils";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import type { NewInboundShipmentStatus } from "@gnd/inventory";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { ComboboxDropdown } from "@gnd/ui/combobox-dropdown";
import Sheet from "@gnd/ui/custom/sheet";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@gnd/ui/field";
import { Input } from "@gnd/ui/input";
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
import { useEffect, useMemo, useState } from "react";

type Overview = RouterOutputs["inventories"]["salesInventoryOverview"];
type Row = NonNullable<Overview>["rows"][number];

function orderableQty(row: Row) {
	return Math.max(
		0,
		Number(row.qtyPending || 0) - Number(row.qtyInboundLinkedOpen || 0),
	);
}

function unique(values: number[]) {
	return Array.from(new Set(values)).sort((a, b) => a - b);
}

function formatQty(value: number) {
	return Number(value || 0).toLocaleString(undefined, {
		maximumFractionDigits: 2,
	});
}

export function InboundCreatePane({
	salesOrderId,
	orderNumber,
	onClose,
	onCreated,
}: {
	salesOrderId: number;
	orderNumber: string;
	onClose: () => void;
	onCreated: (inboundId: number) => void;
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const reference = resolveInboundReference(orderNumber);
	const overviewQuery = useQuery(
		trpc.inventories.salesInventoryOverview.queryOptions({ salesOrderId }),
	);
	const suppliersQuery = useQuery(
		trpc.inventories.inboundSuppliers.queryOptions(),
	);
	const rows = useMemo(
		() =>
			(overviewQuery.data?.rows ?? []).filter(
				(row) =>
					row.actions.includes("create_inbound") &&
					isInventoryNeedRow(row) &&
					orderableQty(row) > 0 &&
					((row.pendingInboundDemandIds?.length || 0) > 0 ||
						(row.componentIds?.length || 0) > 0),
			),
		[overviewQuery.data?.rows],
	);
	const [selected, setSelected] = useState<string[]>([]);
	const [quantities, setQuantities] = useState<Record<string, number>>({});
	const [supplierId, setSupplierId] = useState("none");
	const [expectedAt, setExpectedAt] = useState("");
	const [status, setStatus] = useState<NewInboundShipmentStatus>("pending");
	const [note, setNote] = useState("");
	const supplierItems = useMemo(
		() =>
			(suppliersQuery.data ?? []).map((supplier) => ({
				id: String(supplier.id),
				label: supplier.name,
			})),
		[suppliersQuery.data],
	);
	const selectedSupplier = supplierItems.find((item) => item.id === supplierId);
	const createSupplier = useMutation(
		trpc.inventories.saveInventorySupplier.mutationOptions({
			onSuccess: async (supplier) => {
				await queryClient.invalidateQueries({
					queryKey: trpc.inventories.inboundSuppliers.queryKey(),
				});
				setSupplierId(String(supplier.id));
				toast({
					title: "Supplier created",
					description: supplier.name,
					variant: "success",
				});
			},
			onError: (error) =>
				toast({
					title: "Unable to create supplier",
					description: error.message,
					variant: "destructive",
				}),
		}),
	);
	useEffect(() => {
		setSelected(rows.map((row) => row.id));
		setQuantities(
			Object.fromEntries(rows.map((row) => [row.id, orderableQty(row)])),
		);
	}, [rows]);
	const selectedRows = rows.filter(
		(row) => selected.includes(row.id) && Number(quantities[row.id] || 0) > 0,
	);
	const demandIds = unique(
		selectedRows
			.filter((row) => !row.componentIds.length)
			.flatMap((row) => row.pendingInboundDemandIds ?? []),
	);
	const componentSelections = selectedRows
		.filter((row) => row.componentIds.length)
		.map((row) => ({
			lineItemComponentIds: unique(row.componentIds),
			qty: Math.min(
				orderableQty(row),
				Math.max(0, Number(quantities[row.id] || 0)),
			),
		}));
	const createInbound = useMutation(
		trpc.inventories.createInboundShipmentFromDemands.mutationOptions({
			onSuccess: async (data) => {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.inventories.salesInventoryOverview.queryKey({
							salesOrderId,
						}),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.inventories.orderInboundShipments.queryKey({
							salesOrderId,
						}),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.notes.activityTree.pathKey(),
					}),
				]);
				toast({
					title: `Inbound #${data.inboundId} created`,
					description: `${data.linkedDemandCount} demand row${data.linkedDemandCount === 1 ? "" : "s"} linked to PO ${reference}.`,
					variant: "success",
				});
				onCreated(data.inboundId);
			},
			onError: (error) =>
				toast({
					title: "Unable to create inbound",
					description: error.message,
					variant: "destructive",
				}),
		}),
	);
	const formId = `sales-${salesOrderId}-inbound-create`;

	return (
		<Sheet.SecondaryContent
			className="px-1"
			Header={
				<Sheet.SecondaryHeader
					title="Create inbound"
					description={`Order ${reference} · Select the missing items being ordered.`}
				/>
			}
			Footer={
				<Sheet.SecondaryFooter className="flex-row justify-end gap-3">
					<Button
						type="button"
						variant="outline"
						onClick={onClose}
						disabled={createInbound.isPending}
					>
						Cancel
					</Button>
					<Button
						type="submit"
						form={formId}
						disabled={createInbound.isPending || !selectedRows.length}
					>
						{createInbound.isPending ? "Creating…" : "Create inbound"}
					</Button>
				</Sheet.SecondaryFooter>
			}
		>
			{overviewQuery.isLoading ? (
				<div className="space-y-3 py-4">
					<Skeleton className="h-20" />
					<Skeleton className="h-56" />
				</div>
			) : (
				<form
					id={formId}
					className="space-y-7 py-2"
					onSubmit={(event) => {
						event.preventDefault();
						createInbound.mutate({
							supplierId: supplierId === "none" ? null : Number(supplierId),
							demandIds,
							componentSelections,
							reference,
							expectedAt: expectedAt
								? new Date(`${expectedAt}T00:00:00`)
								: null,
							status,
							note: note.trim() || null,
						});
					}}
				>
					<FieldGroup>
						<div className="grid gap-5 sm:grid-cols-2">
							<Field>
								<FieldLabel htmlFor="inbound-reference">
									PO / reference
								</FieldLabel>
								<Input
									id="inbound-reference"
									value={reference}
									disabled
									aria-describedby="inbound-reference-help"
								/>
								<FieldDescription id="inbound-reference-help">
									The order number is used automatically and cannot be changed.
								</FieldDescription>
							</Field>
							<Field>
								<FieldLabel htmlFor="inbound-supplier">Supplier</FieldLabel>
								<ComboboxDropdown
									items={supplierItems}
									selectedItem={selectedSupplier}
									placeholder={
										suppliersQuery.isLoading
											? "Loading suppliers"
											: "Supplier (optional)"
									}
									searchPlaceholder="Search or create supplier"
									isLoading={suppliersQuery.isLoading}
									disabled={createSupplier.isPending}
									onSelect={(item) => setSupplierId(item.id)}
									onCreate={(value) => {
										const name = value.trim();
										if (name) createSupplier.mutate({ name });
									}}
									emptyResults="No supplier found."
									popoverProps={{ align: "start" }}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="inbound-expected">
									Expected date
								</FieldLabel>
								<Input
									id="inbound-expected"
									type="date"
									value={expectedAt}
									onChange={(event) => setExpectedAt(event.target.value)}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="inbound-status">Initial status</FieldLabel>
								<Select
									value={status}
									onValueChange={(value) =>
										setStatus(value as NewInboundShipmentStatus)
									}
								>
									<SelectTrigger id="inbound-status" className="min-h-10">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="pending">Pending</SelectItem>
										<SelectItem value="in_progress">Ordered</SelectItem>
									</SelectContent>
								</Select>
							</Field>
						</div>
						<Field>
							<FieldLabel htmlFor="inbound-note">Inbound note</FieldLabel>
							<Textarea
								id="inbound-note"
								value={note}
								onChange={(event) => setNote(event.target.value)}
								maxLength={2000}
								placeholder="Receiving context or instructions shown in activity history"
							/>
						</Field>
					</FieldGroup>
					<section className="space-y-3">
						<div className="flex items-end justify-between gap-3">
							<div>
								<h3 className="text-sm font-semibold">Items to order</h3>
								<p className="mt-1 text-sm text-muted-foreground">
									All available missing items are selected by default.
								</p>
							</div>
							<Badge variant="secondary" className="min-h-7 px-2.5 text-xs">
								{selectedRows.length} selected
							</Badge>
						</div>
						<div className="space-y-2">
							{rows.map((row) => {
								const checked = selected.includes(row.id);
								const max = orderableQty(row);
								const checkboxId = `create-inbound-${row.id.replace(/[^a-z0-9_-]/gi, "-")}`;
								return (
									<div
										key={row.id}
										className="flex cursor-pointer items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/30"
									>
										<Checkbox
											id={checkboxId}
											aria-label={`Select ${row.componentName}`}
											checked={checked}
											onCheckedChange={(value) =>
												setSelected((current) =>
													value === true
														? Array.from(new Set([...current, row.id])).sort()
														: current.filter((id) => id !== row.id),
												)
											}
										/>
										<label
											htmlFor={checkboxId}
											className="min-w-0 flex-1 cursor-pointer"
										>
											<p className="truncate text-sm font-medium">
												{row.componentName}
											</p>
											<p className="mt-1 text-xs text-muted-foreground">
												{row.stepName || "Inventory item"}
											</p>
										</label>
										<div className="flex items-center gap-2">
											<Input
												aria-label={`Quantity for ${row.componentName}`}
												type="number"
												min={0}
												max={max}
												value={quantities[row.id] ?? max}
												onChange={(event) =>
													setQuantities((current) => ({
														...current,
														[row.id]: Math.min(
															max,
															Math.max(0, Number(event.target.value)),
														),
													}))
												}
												className="h-10 w-24 text-right tabular-nums"
											/>
											<span className="text-xs text-muted-foreground">
												/ {formatQty(max)}
											</span>
										</div>
									</div>
								);
							})}
						</div>
						{!rows.length ? (
							<p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
								No missing inventory items are available for a new inbound.
							</p>
						) : null}
					</section>
				</form>
			)}
		</Sheet.SecondaryContent>
	);
}

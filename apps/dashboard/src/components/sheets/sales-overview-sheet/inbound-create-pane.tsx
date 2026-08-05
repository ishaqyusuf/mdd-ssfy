"use client";

import { formatInventoryInboundStatusLabel } from "@/components/sales-inbound-status-badge";
import { resolveInboundReference } from "@/components/sales-overview-system/lib/inbound-activity-actions";
import {
	formatInventoryDateInputValue,
	formatInventoryExpectedDateLabel,
	formatInventoryItemSubtitle,
} from "@/components/sales-overview-system/lib/inventory-display";
import { isInventoryNeedRow } from "@/components/sales-overview-system/lib/inventory-inbounds-utils";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import type { NewInboundShipmentStatus } from "@gnd/inventory";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Calendar } from "@gnd/ui/calendar";
import { Checkbox } from "@gnd/ui/checkbox";
import { cn } from "@gnd/ui/cn";
import { ComboboxDropdown } from "@gnd/ui/combobox-dropdown";
import Sheet from "@gnd/ui/custom/sheet";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@gnd/ui/field";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
	InputGroupText,
} from "@gnd/ui/input-group";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from "@gnd/ui/item";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
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
								<Popover>
									<PopoverTrigger asChild>
										<Button
											id="inbound-expected"
											type="button"
											variant="outline"
											className={cn(
												"w-full justify-start bg-background text-left font-normal",
												!expectedAt && "text-muted-foreground",
											)}
										>
											{formatInventoryExpectedDateLabel(expectedAt)}
											<Icons.CalendarIcon className="ml-auto size-4 opacity-50" />
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0" align="start">
										<Calendar
											mode="single"
											selected={
												expectedAt
													? new Date(`${expectedAt}T00:00:00`)
													: undefined
											}
											onSelect={(value) =>
												setExpectedAt(
													value ? formatInventoryDateInputValue(value) : "",
												)
											}
											initialFocus
										/>
									</PopoverContent>
								</Popover>
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
						<ItemGroup className="gap-0" aria-label="Items to order">
							{rows.map((row) => {
								const checked = selected.includes(row.id);
								const max = orderableQty(row);
								const quantity = Math.min(
									max,
									Math.max(0, Number(quantities[row.id] ?? max)),
								);
								const checkboxId = `create-inbound-${row.id.replace(/[^a-z0-9_-]/gi, "-")}`;
								return (
									<Item
										key={row.id}
										size="sm"
										className="items-start rounded-none border-x-0 border-t-0 border-b border-border px-3 py-3 hover:bg-muted/50"
									>
										<label
											htmlFor={checkboxId}
											className="flex cursor-pointer items-center pt-1"
										>
											<Checkbox
												id={checkboxId}
												aria-label={`Select ${row.componentName} for inbound`}
												checked={checked}
												onCheckedChange={(value) =>
													setSelected((current) =>
														value === true
															? Array.from(new Set([...current, row.id])).sort()
															: current.filter((id) => id !== row.id),
													)
												}
											/>
										</label>
										<ItemContent className="min-w-0">
											<ItemTitle className="truncate text-sm font-medium">
												{row.componentName}
											</ItemTitle>
											<ItemDescription className="mt-1 line-clamp-none text-xs">
												{formatInventoryItemSubtitle({
													stepName: row.stepName,
													variantName: row.variantName,
												})}
											</ItemDescription>
										</ItemContent>
										<ItemActions className="shrink-0">
											<InputGroup
												className="h-8 w-28 bg-background"
												aria-label={`Order quantity controls for ${row.componentName}`}
											>
												<InputGroupAddon className="pl-1.5">
													<InputGroupButton
														type="button"
														size="icon-xs"
														disabled={quantity <= 0}
														onClick={() =>
															setQuantities((current) => ({
																...current,
																[row.id]: quantity - 1,
															}))
														}
														aria-label={`Decrease inbound quantity for ${row.componentName}`}
													>
														<Icons.Minus className="size-3.5" />
													</InputGroupButton>
												</InputGroupAddon>
												<InputGroupInput
													aria-label={`Quantity for ${row.componentName}`}
													type="number"
													min={0}
													max={max}
													step={1}
													value={quantity}
													onChange={(event) =>
														setQuantities((current) => ({
															...current,
															[row.id]: Math.min(
																max,
																Math.max(0, Number(event.target.value)),
															),
														}))
													}
													className="h-7 min-w-0 px-1 text-center text-xs tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
												/>
												<InputGroupAddon
													align="inline-end"
													className="gap-1 pr-1.5"
												>
													<InputGroupText className="text-xs tabular-nums">
														/{formatQty(max)}
													</InputGroupText>
													<InputGroupButton
														type="button"
														size="icon-xs"
														disabled={quantity >= max}
														onClick={() =>
															setQuantities((current) => ({
																...current,
																[row.id]: quantity + 1,
															}))
														}
														aria-label={`Increase inbound quantity for ${row.componentName}`}
													>
														<Icons.Plus className="size-3.5" />
													</InputGroupButton>
												</InputGroupAddon>
											</InputGroup>
										</ItemActions>
									</Item>
								);
							})}
						</ItemGroup>
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

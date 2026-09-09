"use client";

import { formatInventoryInboundStatusLabel } from "@/components/sales-inbound-status-badge";
import { resolveInboundReference } from "@/components/sales-overview-system/lib/inbound-activity-actions";
import {
	formatInventoryDateInputValue,
	formatInventoryExpectedDateLabel,
	formatInventoryItemSubtitle,
	getDefaultInventoryExpectedDateValue,
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
import Sheet from "@gnd/ui/custom/sheet-v2";
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
import { useEffect, useId, useMemo, useRef, useState, type ComponentProps } from "react";

import { availabilityBusinessDate } from "@gnd/sales/production-availability-contract";
import { useAvailabilitySave } from "./availability/use-availability-save";

type Overview = RouterOutputs["inventories"]["salesInventoryOverview"];
type Row = NonNullable<Overview>["rows"][number];

type FormRow = Pick<
	Row,
	| "id"
	| "componentName"
	| "stepName"
	| "variantName"
	| "qtyPending"
	| "qtyInboundLinkedOpen"
	| "componentIds"
	| "pendingInboundDemandIds"
>;

function orderableQty(row: FormRow) {
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
	mode = "create_inbound",
	presentation = "sheet",
	onClose,
	onCreated,
}: {
	salesOrderId: number;
	orderNumber: string;
	mode?: "create_inbound" | "mark_available";
	presentation?: "sheet" | "inline";
	onClose: () => void;
	onCreated: (inboundId: number) => void;
}) {
	const isMarkAvailable = mode === "mark_available";
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const reference = resolveInboundReference(orderNumber);
	const overviewQuery = useQuery(
		trpc.inventories.salesInventoryOverview.queryOptions(
			{ salesOrderId },
			{ enabled: !isMarkAvailable },
		),
	);
	const suppliersQuery = useQuery(
		trpc.inventories.inboundSuppliers.queryOptions(undefined, {
			enabled: !isMarkAvailable,
		}),
	);
	const availabilityQuery = useQuery(
		trpc.sales.productionAvailability.queryOptions(
			{ salesOrderId },
			{ enabled: isMarkAvailable },
		),
	);
	const availabilitySuppliers = useQuery(
		trpc.sales.productionAvailabilitySuppliers.queryOptions(
			{ salesOrderId },
			{ enabled: isMarkAvailable },
		),
	);
	const [reviewedAvailability, setReviewedAvailability] = useState<
		RouterOutputs["sales"]["productionAvailability"] | null
	>(null);
	useEffect(() => {
		if (isMarkAvailable && availabilityQuery.data && !reviewedAvailability)
			setReviewedAvailability(availabilityQuery.data);
	}, [isMarkAvailable, availabilityQuery.data, reviewedAvailability]);
	const rows = useMemo<FormRow[]>(
		() =>
			isMarkAvailable
				? (reviewedAvailability?.needs ?? [])
						.filter((row) => row.qtyAvailableToMark > 0)
						.map((row) => ({
							id: row.id,
							componentName: row.name,
							stepName: null,
							variantName: row.description,
							qtyPending: row.qtyAvailableToMark,
							qtyInboundLinkedOpen: 0,
							componentIds: row.componentIds,
							pendingInboundDemandIds: [],
						}))
				: (overviewQuery.data?.rows ?? []).filter(
						(row) =>
							row.actions.includes("create_inbound") &&
							isInventoryNeedRow(row) &&
							orderableQty(row) > 0 &&
							((row.pendingInboundDemandIds?.length || 0) > 0 ||
								(row.componentIds?.length || 0) > 0),
					),
		[overviewQuery.data?.rows, reviewedAvailability?.needs, isMarkAvailable],
	);
	const [selected, setSelected] = useState<string[]>([]);
	const [quantities, setQuantities] = useState<Record<string, number>>({});
	const [supplierId, setSupplierId] = useState("none");
	const [expectedAt, setExpectedAt] = useState(() =>
		isMarkAvailable
			? availabilityBusinessDate()
			: getDefaultInventoryExpectedDateValue(),
	);
	const [status, setStatus] = useState<NewInboundShipmentStatus>("pending");
	const [note, setNote] = useState("");
	const supplierItems = useMemo(
		() =>
			(isMarkAvailable
				? (availabilitySuppliers.data ?? [])
				: (suppliersQuery.data ?? [])
			).map((supplier) => ({
				id: String(supplier.id),
				label: supplier.name,
			})),
		[suppliersQuery.data, availabilitySuppliers.data, isMarkAvailable],
	);
	const selectedSupplier =
		isMarkAvailable && supplierId === "none"
			? { id: "none", label: "N/A" }
			: supplierItems.find((item) => item.id === supplierId);
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
	const initialized = useRef(false);
	useEffect(() => {
		if (!rows.length || initialized.current) return;
		initialized.current = true;
		setSelected(rows.map((row) => row.id));
		setQuantities(
			Object.fromEntries(rows.map((row) => [row.id, orderableQty(row)])),
		);
	}, [rows]);
	const selectedRows = rows.filter(
		(row) => selected.includes(row.id) && Number(quantities[row.id] || 0) > 0,
	);
	const allRowsSelected =
		rows.length > 0 && rows.every((row) => selected.includes(row.id));
	const someRowsSelected = rows.some((row) => selected.includes(row.id));
	const demandSelections = selectedRows
		.filter((row) => !row.componentIds.length)
		.map((row) => ({
			demandIds: unique(row.pendingInboundDemandIds ?? []),
			qty: Math.min(
				orderableQty(row),
				Math.max(0, Number(quantities[row.id] || 0)),
			),
		}))
		.filter((selection) => selection.demandIds.length && selection.qty > 0);
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
					queryClient.invalidateQueries({
						queryKey: trpc.sales.getSalesHandoffActions.pathKey(),
					}),
				]);
				toast({
					title: isMarkAvailable
						? "Inventory marked available"
						: `Inbound #${data.inboundId} created`,
					description: isMarkAvailable
						? `${formatQty(data.receipt?.newlyReceivedQty || 0)} qty received into available stock.`
						: `${data.linkedDemandCount} demand row${data.linkedDemandCount === 1 ? "" : "s"} linked to PO ${reference}.`,
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
	const availabilitySave = useAvailabilitySave(onCreated);
	const saving = createInbound.isPending || availabilitySave.isPending;
	const activeQuery = isMarkAvailable ? availabilityQuery : overviewQuery;
	const suppliersLoading = isMarkAvailable
		? availabilitySuppliers.isLoading
		: suppliersQuery.isLoading;
	const instanceId = useId();
	const formId = `sales-${salesOrderId}-inbound-create-${instanceId}`;
	const Content = presentation === "inline" ? InlineContent : Sheet.SecondaryContent;
	const Header = presentation === "inline" ? InlineHeader : Sheet.SecondaryHeader;
	const Footer = presentation === "inline" ? InlineFooter : Sheet.SecondaryFooter;

	return (
		<Content
			className="px-1"
			Header={
				<Header
					title={isMarkAvailable ? "Mark as available" : "Create inbound"}
					description={
						isMarkAvailable
							? `Order ${reference} · Select available items and quantities.`
							: `Order ${reference} · Select the missing items being ordered.`
					}
				/>
			}
			Footer={
				<Footer className="flex-row justify-end gap-3">
					<Button
						type="button"
						variant="outline"
						onClick={onClose}
						disabled={saving}
					>
						Cancel
					</Button>
					<Button
						type="submit"
						form={formId}
						disabled={
							saving ||
							!selectedRows.length ||
							(isMarkAvailable && !availabilityQuery.data?.canMarkAvailable)
						}
					>
						{saving
							? "Saving…"
							: isMarkAvailable
								? "Mark as available"
								: "Create inbound"}
					</Button>
				</Footer>
			}
		>
			{activeQuery.isLoading ? (
				<div className="space-y-3 py-4">
					<Skeleton className="h-20" />
					<Skeleton className="h-56" />
				</div>
			) : activeQuery.isError ? (
				<Button variant="outline" onClick={() => activeQuery.refetch()}>
					Retry material items
				</Button>
			) : (
				<form
					id={formId}
					className="space-y-7 py-2"
					onSubmit={(event) => {
						event.preventDefault();
						if (saving) return;
						if (isMarkAvailable) {
							if (!reviewedAvailability?.canMarkAvailable) return;
							availabilitySave.save({
								salesOrderId,
								expectedRevision: reviewedAvailability!.revision,
								supplierId: supplierId === "none" ? null : Number(supplierId),
								receivedDate: expectedAt,
								selection: {
									mode: "selected",
									items: selectedRows.map((row) => ({
										id: row.id,
										qty: Math.min(
											orderableQty(row),
											Number(quantities[row.id]),
										),
									})),
								},
								note: note.trim() || undefined,
							});
							return;
						}
						createInbound.mutate({
							supplierId: supplierId === "none" ? null : Number(supplierId),
							demandSelections,
							componentSelections,
							reference,
							expectedAt: expectedAt
								? new Date(`${expectedAt}T00:00:00`)
								: null,
							status,
							operation: mode,
							note: note.trim() || null,
						});
					}}
				>
					{availabilitySave.error && (
						<div role="alert" className="space-y-2 text-sm text-destructive">
							<p>{availabilitySave.error.message}</p>
							<Button
								type="button"
								variant="outline"
								disabled={saving || availabilityQuery.isFetching}
								onClick={async () => {
									const fresh = await availabilityQuery.refetch();
									if (fresh.data) {
										setReviewedAvailability(fresh.data);
										availabilitySave.reset();
									}
								}}
							>
								Refresh materials
							</Button>
						</div>
					)}
					{isMarkAvailable && availabilityQuery.data?.workerMode && (
						<p className="text-sm text-muted-foreground">
							Materials for your assigned work only.
						</p>
					)}
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
									items={
										isMarkAvailable
											? [{ id: "none", label: "N/A" }, ...supplierItems]
											: supplierItems
									}
									selectedItem={selectedSupplier}
									placeholder={
										suppliersLoading
											? "Loading suppliers"
											: "Supplier (optional)"
									}
									searchPlaceholder={
										isMarkAvailable
											? "Search suppliers"
											: "Search or create supplier"
									}
									isLoading={suppliersLoading}
									disabled={createSupplier.isPending}
									onSelect={(item) => setSupplierId(item.id)}
									onCreate={
										isMarkAvailable
											? undefined
											: (value) => {
													const name = value.trim();
													if (name) createSupplier.mutate({ name });
												}
									}
									emptyResults="No supplier found."
									popoverProps={{ align: "start" }}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="inbound-expected">
									{isMarkAvailable ? "Received date" : "Expected date"}
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
											disabled={
												isMarkAvailable
													? {
															after: new Date(
																`${availabilityBusinessDate()}T23:59:59`,
															),
														}
													: undefined
											}
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
								{isMarkAvailable ? (
									<Button
										type="button"
										variant="outline"
										disabled
										className="min-h-10 w-full cursor-not-allowed justify-between bg-muted/50 font-normal text-foreground opacity-100"
									>
										<span>Available</span>
										<Icons.Lock className="size-3.5 text-muted-foreground opacity-70" />
									</Button>
								) : (
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
								)}
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
						<div className="flex items-start justify-between gap-3">
							<div>
								<h3 className="text-sm font-semibold">
									{isMarkAvailable
										? "Items to mark available"
										: "Items to order"}
								</h3>
								<p className="mt-1 text-sm text-muted-foreground">
									{isMarkAvailable
										? "Select each item and quantity that is physically available."
										: "All available missing items are selected by default."}
								</p>
							</div>
							<div className="flex shrink-0 flex-col items-end gap-2">
								<label
									htmlFor="inbound-create-select-all"
									className="flex cursor-pointer items-center gap-2 text-xs font-medium"
								>
									<Checkbox
										id="inbound-create-select-all"
										aria-label="Mark or unmark all inbound items"
										checked={
											allRowsSelected
												? true
												: someRowsSelected
													? "indeterminate"
													: false
										}
										onCheckedChange={(checked) =>
											setSelected(
												checked === true ? rows.map((row) => row.id) : [],
											)
										}
									/>
									<span>Mark / unmark all</span>
								</label>
								<Badge variant="secondary" className="min-h-7 px-2.5 text-xs">
									{selectedRows.length} selected
								</Badge>
							</div>
						</div>
						<ItemGroup
							className="gap-0"
							aria-label={
								isMarkAvailable ? "Items to mark available" : "Items to order"
							}
						>
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
												aria-label={`Select ${row.componentName} to ${
													isMarkAvailable ? "mark available" : "add to inbound"
												}`}
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
											<ItemTitle className="max-w-full min-w-0 truncate text-sm font-medium">
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
												aria-label={`${
													isMarkAvailable ? "Available" : "Order"
												} quantity controls for ${row.componentName}`}
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
								{isMarkAvailable
									? "No missing inventory items can be marked available."
									: "No missing inventory items are available for a new inbound."}
							</p>
						) : null}
					</section>
				</form>
			)}
		</Content>
	);
}

function InlineContent({ Header, Footer, children }: ComponentProps<typeof Sheet.SecondaryContent>) {
	return (
		<section className="flex min-h-0 min-w-0 flex-1 flex-col gap-4" aria-label="Select available materials">
			<div className="shrink-0">{Header}</div>
			<div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
			{Footer}
		</section>
	);
}
function InlineHeader({ title, description }: ComponentProps<typeof Sheet.SecondaryHeader>) {
	return <header className="space-y-1"><h3 className="text-sm font-medium">{title}</h3><p className="text-xs text-muted-foreground">{description}</p></header>;
}
function InlineFooter({ children }: ComponentProps<typeof Sheet.SecondaryFooter>) {
	return <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t bg-background pt-3">{children}</div>;
}

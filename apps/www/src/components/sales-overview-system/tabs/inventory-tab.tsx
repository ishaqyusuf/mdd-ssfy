"use client";

import type { RouterOutputs } from "@api/trpc/routers/_app";

import { useTRPC } from "@/trpc/client";
import { ComboboxDropdown } from "@gnd/ui/combobox-dropdown";

import { Alert, AlertDescription, AlertTitle } from "@gnd/ui/alert";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Calendar } from "@gnd/ui/calendar";
import { Checkbox } from "@gnd/ui/checkbox";
import { cn } from "@gnd/ui/cn";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@gnd/ui/empty";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemHeader,
	ItemTitle,
} from "@gnd/ui/item";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import { Separator } from "@gnd/ui/separator";
import { Skeleton } from "@gnd/ui/skeleton";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import {
	type SalesInventorySegment,
	useSalesInventorySegmentQuery,
} from "../hooks/use-sales-inventory-segment-query";
import { formatInventoryCategoryStepLabel } from "../lib/inventory-display";
import { useSalesOverviewSystem } from "../provider";
import { OverviewEmptyState } from "../section-primitives";

type InventoryOverview = RouterOutputs["inventories"]["salesInventoryOverview"];
type InventoryLine = NonNullable<InventoryOverview>["rows"][number];
type InventoryCapabilities = NonNullable<InventoryOverview>["capabilities"];
type TrackingRepairPreview =
	RouterOutputs["inventories"]["salesInventoryTrackingChangeRepairPreview"];
type OrderInboundShipment =
	RouterOutputs["inventories"]["orderInboundShipments"][number];
type InventoryStockFilter = SalesInventorySegment;
type InventoryProductKind = "inventory" | "component";
type InventoryStockMode = "monitored" | "unmonitored";
type InventoryNeedState = "needed" | "not_needed";
type InboundShipmentStatus =
	| "pending"
	| "in_progress"
	| "completed"
	| "issue_open"
	| "closed"
	| "cancelled";

function formatQty(value: number | null | undefined) {
	return Number(value || 0).toLocaleString(undefined, {
		maximumFractionDigits: 2,
	});
}

function parseQtyInput(value: string | number | null | undefined) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function clampQty(value: number, max: number) {
	return Math.min(Math.max(0, value), Math.max(0, max));
}

function formatMoney(value: number | null | undefined) {
	if (value == null) return "N/A";
	return new Intl.NumberFormat(undefined, {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 2,
	}).format(Number(value || 0));
}

function formatDateButtonLabel(value: string) {
	if (!value) return "Expected date";
	const date = new Date(`${value}T00:00:00`);
	if (Number.isNaN(date.getTime())) return "Expected date";
	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(date);
}

function formatDateValue(value: Date | string | null | undefined) {
	if (!value) return "No date";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "No date";
	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(date);
}

function formatDateInputValue(value: Date) {
	const year = value.getFullYear();
	const month = String(value.getMonth() + 1).padStart(2, "0");
	const day = String(value.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function uniqueNumbers(values: number[]) {
	return Array.from(new Set(values)).sort((a, b) => a - b);
}

function readinessLabel(value: string | null | undefined) {
	return (value || "unknown").replaceAll("_", " ");
}

function titleCaseLabel(value: string | null | undefined) {
	return readinessLabel(value).replace(/\b[a-z]/g, (char) =>
		char.toUpperCase(),
	);
}

function normalizedProductKind(
	value: string | null | undefined,
): InventoryProductKind {
	return value === "component" ? "component" : "inventory";
}

function normalizedStockMode(
	value: string | null | undefined,
): InventoryStockMode {
	return value === "monitored" ? "monitored" : "unmonitored";
}

function isStockInventoryLine(row: InventoryLine) {
	return (
		row.trackingPolicy === "tracked" &&
		row.inventoryProductKind !== "component" &&
		row.inventoryCategoryProductKind !== "component"
	);
}

function isShortageInventoryLine(row: InventoryLine) {
	return row.status === "shortage" || row.status === "needs_allocation";
}

function requirementStatusClassName(row: InventoryLine) {
	if (row.requirementStatus === "not_applicable") {
		return "border-slate-200 bg-slate-50 text-slate-600";
	}
	if (isShortageInventoryLine(row)) {
		return "border-amber-200 bg-amber-50 text-amber-700";
	}
	return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function inboundStatusClassName(status: string | null | undefined) {
	switch (status) {
		case "completed":
		case "closed":
			return "border-emerald-200 bg-emerald-50 text-emerald-700";
		case "in_progress":
			return "border-blue-200 bg-blue-50 text-blue-700";
		case "issue_open":
			return "border-amber-200 bg-amber-50 text-amber-700";
		case "cancelled":
			return "border-red-200 bg-red-50 text-red-700";
		default:
			return "border-slate-200 bg-slate-50 text-slate-700";
	}
}

function inboundOrderableQty(row: InventoryLine) {
	return Math.max(
		0,
		Number(row.qtyPending || 0) - Number(row.qtyInboundLinkedOpen || 0),
	);
}

function inventoryLineKindTags(row: InventoryLine) {
	const tags: Array<{
		label: string;
		className: string;
	}> = [];

	tags.push(
		isStockInventoryLine(row)
			? {
					label: "Needed",
					className: "border-emerald-200 bg-emerald-50 text-emerald-700",
				}
			: {
					label: "Not needed",
					className: "border-zinc-200 bg-zinc-50 text-zinc-600",
				},
	);

	return tags;
}

function InventoryTabSkeleton() {
	return (
		<div className="space-y-4">
			<Skeleton className="h-48 rounded-md" />
			<Skeleton className="h-36 rounded-md" />
		</div>
	);
}

function InventorySyncState({
	message = "Synchronizing with inventory.",
}: {
	message?: string;
}) {
	return (
		<div className="rounded-md border border-dashed bg-muted/20 p-4">
			<div className="flex items-start gap-3">
				<Icons.Loader2 className="mt-0.5 size-4 animate-spin text-muted-foreground" />
				<div>
					<div className="text-sm font-medium">{message}</div>
					<p className="mt-1 text-xs text-muted-foreground">
						We are creating inventory-backed line items for this order and will
						refresh the tab automatically.
					</p>
				</div>
			</div>
		</div>
	);
}

function InventoryReadonlyMetric({
	label,
	value,
	description,
}: {
	label: string;
	value: ReactNode;
	description: string;
}) {
	return (
		<div className="flex min-h-24 flex-col justify-between gap-3 rounded-md border bg-background p-4">
			<div className="text-[11px] font-semibold uppercase text-muted-foreground">
				{label}
			</div>
			<div>
				<div className="text-sm font-medium text-foreground">{value}</div>
				<p className="mt-1 text-xs leading-relaxed text-muted-foreground">
					{description}
				</p>
			</div>
		</div>
	);
}

function FulfilledInventoryNoIntegrationState({
	overview,
}: {
	overview: NonNullable<InventoryOverview>;
}) {
	const lifecycleLabel = overview.lifecycleLabel || "Fulfilled";
	const inventoryStatusLabel = overview.inventoryStatus
		? titleCaseLabel(overview.inventoryStatus)
		: "No manual inbound status";
	const lineItemCount = overview.summary.lineItemCount;

	return (
		<div className="flex flex-col gap-4">
			<div className="grid gap-3 md:grid-cols-3">
				<InventoryReadonlyMetric
					label="Order lifecycle"
					value={lifecycleLabel}
					description="The sales workflow has already reached a terminal fulfillment state."
				/>
				<InventoryReadonlyMetric
					label="Inventory setup"
					value="Not previously configured"
					description={`${formatQty(lineItemCount)} synced line item${
						lineItemCount === 1 ? "" : "s"
					}; no inventory demand rows are attached.`}
				/>
				<InventoryReadonlyMetric
					label="Inbound status"
					value={inventoryStatusLabel}
					description="Any legacy status is preserved as history, not converted into new inventory work."
				/>
			</div>

			<Empty className="items-stretch justify-start border bg-background p-0 text-left">
				<div className="flex flex-col gap-5 p-5">
					<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
						<div className="flex min-w-0 gap-3">
							<EmptyMedia
								variant="icon"
								className="border border-emerald-200 bg-emerald-50 text-emerald-700"
							>
								<Icons.CheckCircle2 />
							</EmptyMedia>
							<EmptyHeader className="max-w-none items-start text-left">
								<EmptyTitle>Fulfilled outside inventory</EmptyTitle>
								<EmptyDescription>
									This order was completed before inventory-backed fulfillment
									was configured, so the Inventory tab is keeping it in a
									read-only historical state.
								</EmptyDescription>
							</EmptyHeader>
						</div>
						<Badge
							variant="outline"
							className="w-fit border-emerald-200 bg-emerald-50 text-emerald-700"
						>
							No open inventory task
						</Badge>
					</div>

					<EmptyContent className="max-w-none items-stretch">
						<Alert className="border-dashed bg-muted/20 text-left">
							<Icons.Info />
							<AlertTitle>Inventory sync is intentionally paused</AlertTitle>
							<AlertDescription>
								Creating new stock demand after fulfillment would make the order
								look unfinished again. Future orders still configure inventory
								as usual; this completed order remains review-only unless a
								repair workflow is run intentionally.
							</AlertDescription>
						</Alert>

						<Separator />

						<ItemGroup className="gap-2" aria-label="Inventory history notes">
							<Item
								variant="outline"
								size="sm"
								className="items-start rounded-md bg-background/80 px-3 py-2.5"
							>
								<ItemContent>
									<ItemHeader>
										<ItemTitle>Historical sale preserved</ItemTitle>
									</ItemHeader>
									<ItemDescription>
										No allocations, inbound shipments, or availability prompts
										were created for this completed record.
									</ItemDescription>
								</ItemContent>
								<ItemActions>
									<Badge variant="outline">Read-only</Badge>
								</ItemActions>
							</Item>
							<Item
								variant="outline"
								size="sm"
								className="items-start rounded-md bg-background/80 px-3 py-2.5"
							>
								<ItemContent>
									<ItemHeader>
										<ItemTitle>New inventory work stays current</ItemTitle>
									</ItemHeader>
									<ItemDescription>
										Open and newly saved orders still use the inventory
										workbench for stock, allocation, and inbound planning.
									</ItemDescription>
								</ItemContent>
								<ItemActions>
									<Badge variant="outline">Current orders</Badge>
								</ItemActions>
							</Item>
						</ItemGroup>
					</EmptyContent>
				</div>
			</Empty>
		</div>
	);
}

function LegacyInventoryStatusLockedState({
	overview,
}: {
	overview: NonNullable<InventoryOverview>;
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const inventoryStatusLabel = overview.inventoryStatus
		? titleCaseLabel(overview.inventoryStatus)
		: "Manual status";
	const salesOrderId = overview.id;
	const resolveLegacyStatus = useMutation(
		trpc.inventories.resolveSalesInventoryLegacyStatusSetup.mutationOptions({
			onSuccess: async (data) => {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.inventories.salesInventoryOverview.queryKey({
							salesOrderId,
						}),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.inventories.inboundDemandQueue.queryKey({}),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.sales.getSaleOverview.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.sales.getOrders.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.sales.getOrdersSummary.pathKey(),
					}),
				]);
				toast({
					title:
						data.action === "reset"
							? "Inbound status reset"
							: "Inventory setup overridden",
					description: `${data.createdCount + data.updatedCount} inventory row${
						data.createdCount + data.updatedCount === 1 ? "" : "s"
					} synced.`,
					variant: "success",
				});
			},
			onError: (error) => {
				toast({
					title: "Unable to configure inventory",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);
	const isResolving = resolveLegacyStatus.isPending;

	return (
		<div className="flex flex-col gap-4">
			<div className="grid gap-3 md:grid-cols-3">
				<InventoryReadonlyMetric
					label="Inbound status"
					value={inventoryStatusLabel}
					description="This order already has a manual inbound prompt saved on the sales record."
				/>
				<InventoryReadonlyMetric
					label="Inventory setup"
					value="Paused"
					description="Inventory setup is held until the manual status is reset or intentionally overridden."
				/>
				<InventoryReadonlyMetric
					label="Order lifecycle"
					value={overview.lifecycleLabel || "Active"}
					description="The order can continue normal sales work, but inventory setup will not auto-run."
				/>
			</div>

			<Empty className="items-stretch justify-start border bg-background p-0 text-left">
				<div className="flex flex-col gap-5 p-5">
					<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
						<div className="flex min-w-0 gap-3">
							<EmptyMedia
								variant="icon"
								className="border border-amber-200 bg-amber-50 text-amber-700"
							>
								<Icons.LockKeyhole />
							</EmptyMedia>
							<EmptyHeader className="max-w-none items-start text-left">
								<EmptyTitle>Manual inbound status needs review</EmptyTitle>
								<EmptyDescription>
									This order has a legacy inbound status but no inventory-backed
									line items yet. Inventory setup is paused so that status does
									not get converted into stock demand by accident.
								</EmptyDescription>
							</EmptyHeader>
						</div>
						<Badge
							variant="outline"
							className="w-fit border-amber-200 bg-amber-50 text-amber-700"
						>
							Setup locked
						</Badge>
					</div>

					<EmptyContent className="max-w-none items-stretch">
						<Alert className="border-dashed bg-muted/20 text-left">
							<Icons.Info />
							<AlertTitle>Inventory sync is waiting for intent</AlertTitle>
							<AlertDescription>
								Reset the manual inbound status or run an explicit override
								workflow before configuring inventory for this order.
							</AlertDescription>
						</Alert>

						<div className="flex flex-col gap-2 sm:flex-row">
							<Button
								type="button"
								size="sm"
								variant="default"
								disabled={isResolving}
								onClick={() =>
									resolveLegacyStatus.mutate({
										salesOrderId,
										action: "reset",
									})
								}
							>
								Reset status and configure
							</Button>
							<Button
								type="button"
								size="sm"
								variant="outline"
								disabled={isResolving}
								onClick={() =>
									resolveLegacyStatus.mutate({
										salesOrderId,
										action: "override",
									})
								}
							>
								Override and configure
							</Button>
						</div>

						<ItemGroup
							className="gap-2"
							aria-label="Manual inbound status lock notes"
						>
							<Item
								variant="outline"
								size="sm"
								className="items-start rounded-md bg-background/80 px-3 py-2.5"
							>
								<ItemContent>
									<ItemHeader>
										<ItemTitle>Manual prompt preserved</ItemTitle>
									</ItemHeader>
									<ItemDescription>
										The saved status remains on the order for review and sales
										list visibility.
									</ItemDescription>
								</ItemContent>
								<ItemActions>
									<Badge variant="outline">{inventoryStatusLabel}</Badge>
								</ItemActions>
							</Item>
							<Item
								variant="outline"
								size="sm"
								className="items-start rounded-md bg-background/80 px-3 py-2.5"
							>
								<ItemContent>
									<ItemHeader>
										<ItemTitle>No stock demand created</ItemTitle>
									</ItemHeader>
									<ItemDescription>
										The Inventory tab will not create allocations, inbound
										demand, or stock tasks until the legacy prompt is handled.
									</ItemDescription>
								</ItemContent>
								<ItemActions>
									<Badge variant="outline">Read-only</Badge>
								</ItemActions>
							</Item>
						</ItemGroup>
					</EmptyContent>
				</div>
			</Empty>
		</div>
	);
}

function InventoryActionBar({
	overview,
	salesOrderId,
}: {
	overview: NonNullable<InventoryOverview>;
	salesOrderId: number;
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { setInventorySegment } = useSalesInventorySegmentQuery();
	const rows = overview.rows || [];
	const capabilities = overview.capabilities;
	const stockActionRows = rows.filter(isStockInventoryLine);
	const pendingQty = stockActionRows.reduce(
		(total, row) => total + row.qtyPending,
		0,
	);
	const inboundRows = useMemo(
		() =>
			rows.filter(
				(row) =>
					row.actions.includes("create_inbound") &&
					isStockInventoryLine(row) &&
					inboundOrderableQty(row) > 0 &&
					((row.pendingInboundDemandIds?.length || 0) > 0 ||
						(row.componentIds?.length || 0) > 0),
			),
		[rows],
	);
	const inboundRowIds = useMemo(
		() => inboundRows.map((row) => row.id),
		[inboundRows],
	);
	const [isInboundFormOpen, setIsInboundFormOpen] = useState(false);
	const [selectedInboundRowIds, setSelectedInboundRowIds] = useState<string[]>(
		[],
	);
	const [inboundQtyByRowId, setInboundQtyByRowId] = useState<
		Record<string, number>
	>({});
	const selectedInboundRows = useMemo(
		() =>
			inboundRows.filter(
				(row) =>
					selectedInboundRowIds.includes(row.id) &&
					clampQty(
						inboundQtyByRowId[row.id] ?? inboundOrderableQty(row),
						inboundOrderableQty(row),
					) > 0,
			),
		[inboundQtyByRowId, inboundRows, selectedInboundRowIds],
	);
	const selectedDemandIds = useMemo(
		() =>
			uniqueNumbers(
				selectedInboundRows
					.filter((row) => !row.componentIds.length)
					.flatMap((row) => row.pendingInboundDemandIds ?? []),
			),
		[selectedInboundRows],
	);
	const selectedComponentSelections = useMemo(
		() =>
			selectedInboundRows
				.map((row) => ({
					lineItemComponentIds: uniqueNumbers(row.componentIds),
					qty: clampQty(
						inboundQtyByRowId[row.id] ?? inboundOrderableQty(row),
						inboundOrderableQty(row),
					),
				}))
				.filter((selection) => selection.lineItemComponentIds.length),
		[inboundQtyByRowId, selectedInboundRows],
	);
	const selectedInboundQty = useMemo(
		() =>
			selectedInboundRows.reduce(
				(total, row) =>
					total +
					clampQty(
						inboundQtyByRowId[row.id] ?? inboundOrderableQty(row),
						inboundOrderableQty(row),
					),
				0,
			),
		[inboundQtyByRowId, selectedInboundRows],
	);
	const [supplierId, setSupplierId] = useState("");
	const [expectedAt, setExpectedAt] = useState("");
	const [reference, setReference] = useState("");
	const [createdInboundId, setCreatedInboundId] = useState<number | null>(null);
	const suppliersQuery = useQuery(
		trpc.inventories.inboundSuppliers.queryOptions(undefined, {
			enabled: isInboundFormOpen,
			refetchOnWindowFocus: false,
			staleTime: 60 * 1000,
		}),
	);
	const suppliers = suppliersQuery.data ?? [];
	const supplierItems = useMemo(
		() =>
			suppliers.map((supplier) => ({
				id: String(supplier.id),
				label: supplier.name,
				supplierId: supplier.id,
			})),
		[suppliers],
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
			onError: (error) => {
				toast({
					title: "Unable to create supplier",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);
	const createInbound = useMutation(
		trpc.inventories.createInboundShipmentFromDemands.mutationOptions({
			onSuccess: async (data) => {
				setCreatedInboundId(data.inboundId);
				setIsInboundFormOpen(false);
				setSelectedInboundRowIds([]);
				setReference("");
				setExpectedAt("");
				setInventorySegment("inbounds", {
					inboundId: data.inboundId,
				});
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.inventories.salesInventoryOverview.queryKey({
							salesOrderId,
						}),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.inventories.inboundShipments.queryKey({}),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.inventories.orderInboundShipments.queryKey({
							salesOrderId,
						}),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.inventories.inboundDemandQueue.queryKey({}),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.sales.getSaleOverview.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.sales.getOrders.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.sales.getOrdersSummary.pathKey(),
					}),
				]);
				toast({
					title: `Inbound #${data.inboundId} created`,
					description: `${data.linkedDemandCount} demand row${
						data.linkedDemandCount === 1 ? "" : "s"
					} linked.`,
					variant: "success",
				});
			},
			onError: (error) => {
				toast({
					title: "Unable to create inbound",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	useEffect(() => {
		if (!isInboundFormOpen) return;
		setSelectedInboundRowIds(inboundRowIds);
		setInboundQtyByRowId((current) => {
			const next: Record<string, number> = {};
			for (const row of inboundRows) {
				const maxQty = inboundOrderableQty(row);
				next[row.id] = clampQty(current[row.id] ?? maxQty, maxQty);
			}
			return next;
		});
	}, [inboundRowIds, inboundRows, isInboundFormOpen]);

	const toggleInboundRow = (row: InventoryLine, checked: boolean) => {
		setSelectedInboundRowIds((current) => {
			const next = new Set(current);
			if (checked) next.add(row.id);
			else next.delete(row.id);
			return Array.from(next).sort();
		});
	};
	const setInboundRowQty = (row: InventoryLine, value: number) => {
		const qty = clampQty(value, inboundOrderableQty(row));
		setInboundQtyByRowId((current) => ({
			...current,
			[row.id]: qty,
		}));
		setSelectedInboundRowIds((current) => {
			const next = new Set(current);
			if (qty > 0) next.add(row.id);
			else next.delete(row.id);
			return Array.from(next).sort();
		});
	};

	const submitInbound = () => {
		if (!capabilities.canCreateInbound) {
			toast({
				title: "Inventory actions locked",
				description:
					overview.inventoryActionBlockReason ||
					"Create inbound is not available for this order.",
				variant: "destructive",
			});
			return;
		}
		if (!supplierId) {
			toast({
				title: "Select a supplier",
				variant: "destructive",
			});
			return;
		}
		if (!selectedInboundRows.length) {
			toast({
				title: "Select at least one missing needed item",
				variant: "destructive",
			});
			return;
		}

		createInbound.mutate({
			supplierId: Number(supplierId),
			demandIds: selectedDemandIds,
			componentSelections: selectedComponentSelections,
			reference: reference.trim() || null,
			expectedAt: expectedAt ? new Date(`${expectedAt}T00:00:00`) : null,
		});
	};

	if (overview.isInventoryReadOnly) {
		return (
			<Alert className="border-dashed bg-muted/20 text-left">
				<Icons.Info />
				<AlertTitle>Inventory actions are locked</AlertTitle>
				<AlertDescription>
					{overview.inventoryActionBlockReason ||
						"This order is locked for inventory review."}
				</AlertDescription>
			</Alert>
		);
	}

	return (
		<div className="space-y-3">
			<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
				<p className="text-xs text-muted-foreground">
					{pendingQty > 0
						? "Some needed items require inbound or inventory review."
						: "All needed items are covered."}
				</p>
				<div className="flex flex-wrap gap-2">
					<Button
						type="button"
						size="sm"
						variant="outline"
						disabled={!capabilities.canCreateInbound || !inboundRows.length}
						onClick={() => setIsInboundFormOpen((value) => !value)}
					>
						Create inbound
					</Button>
					<Button type="button" size="sm" disabled>
						Mark all available
					</Button>
				</div>
			</div>
			{isInboundFormOpen ? (
				<div className="mt-3 space-y-3 rounded-md border bg-background p-3">
					<div className="grid gap-2 md:grid-cols-[1.2fr_1fr_1fr]">
						<div className="space-y-2">
							<ComboboxDropdown
								items={supplierItems}
								selectedItem={selectedSupplier}
								placeholder={
									suppliersQuery.isLoading ? "Loading suppliers" : "Supplier"
								}
								searchPlaceholder="Search or create supplier"
								isLoading={suppliersQuery.isLoading}
								disabled={createSupplier.isPending}
								onSelect={(item) => setSupplierId(item.id)}
								onCreate={(value) => {
									const name = value.trim();
									if (!name) return;
									createSupplier.mutate({ name });
								}}
								renderOnCreate={(value) => (
									<div className="flex items-center gap-2">
										<Icons.Plus className="size-4" />
										Create supplier "{value.trim()}"
									</div>
								)}
								emptyResults="No supplier found."
								popoverProps={{ align: "start" }}
							/>
						</div>
						<Popover>
							<PopoverTrigger asChild>
								<Button
									type="button"
									variant="outline"
									className={cn(
										"w-full justify-start bg-background text-left font-normal",
										!expectedAt && "text-muted-foreground",
									)}
								>
									{formatDateButtonLabel(expectedAt)}
									<Icons.CalendarIcon className="ml-auto size-4 opacity-50" />
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-auto p-0" align="start">
								<Calendar
									mode="single"
									selected={
										expectedAt ? new Date(`${expectedAt}T00:00:00`) : undefined
									}
									onSelect={(value) =>
										setExpectedAt(value ? formatDateInputValue(value) : "")
									}
									initialFocus
								/>
							</PopoverContent>
						</Popover>
						<Input
							value={reference}
							onChange={(event) => setReference(event.target.value)}
							placeholder="PO / reference"
						/>
					</div>
					<div className="max-h-72 space-y-2 overflow-y-auto pr-1">
						{inboundRows.map((row) => {
							const isChecked = selectedInboundRowIds.includes(row.id);
							const maxQty = inboundOrderableQty(row);
							const qtyValue = clampQty(
								inboundQtyByRowId[row.id] ?? maxQty,
								maxQty,
							);
							const checkboxId = `inbound-demand-${row.id.replace(
								/[^a-z0-9_-]/gi,
								"-",
							)}`;

							return (
								<div
									key={row.id}
									className="flex items-start gap-3 rounded-md border p-2 hover:bg-muted/40"
								>
									<label
										htmlFor={checkboxId}
										className="flex cursor-pointer items-center pt-1"
									>
										<Checkbox
											id={checkboxId}
											checked={isChecked}
											onCheckedChange={(checked) =>
												toggleInboundRow(row, checked === true)
											}
										/>
									</label>
									<div className="min-w-0 flex-1">
										<div className="truncate text-xs font-semibold uppercase">
											{row.componentName}
										</div>
										<div className="mt-0.5 text-[11px] text-muted-foreground">
											{[
												formatInventoryCategoryStepLabel(row.stepName),
												row.variantName,
											]
												.filter(Boolean)
												.join(" • ")}
										</div>
									</div>
									<div className="flex shrink-0 items-center gap-1">
										<Button
											type="button"
											size="icon"
											variant="outline"
											className="size-7"
											disabled={qtyValue <= 0}
											onClick={() => setInboundRowQty(row, qtyValue - 1)}
											aria-label={`Decrease inbound quantity for ${row.componentName}`}
										>
											<Icons.Minus className="size-3.5" />
										</Button>
										<Input
											type="number"
											min={0}
											max={maxQty}
											step={1}
											value={qtyValue}
											onChange={(event) =>
												setInboundRowQty(row, parseQtyInput(event.target.value))
											}
											className="h-7 w-16 px-2 text-center text-xs tabular-nums"
											aria-label={`Inbound quantity for ${row.componentName}`}
										/>
										<Button
											type="button"
											size="icon"
											variant="outline"
											className="size-7"
											disabled={qtyValue >= maxQty}
											onClick={() => setInboundRowQty(row, qtyValue + 1)}
											aria-label={`Increase inbound quantity for ${row.componentName}`}
										>
											<Icons.Plus className="size-3.5" />
										</Button>
										<Badge variant="outline" className="ml-1">
											/{formatQty(maxQty)}
										</Badge>
									</div>
								</div>
							);
						})}
					</div>
					<div className="flex flex-wrap items-center justify-between gap-2">
						<div className="text-xs text-muted-foreground">
							{formatQty(selectedInboundRows.length)} needed item
							{selectedInboundRows.length === 1 ? "" : "s"} selected
							{selectedDemandIds.length
								? ` • ${formatQty(selectedDemandIds.length)} existing demand${
										selectedDemandIds.length === 1 ? "" : "s"
									}`
								: ""}
							{selectedComponentSelections.length
								? ` • ${formatQty(selectedInboundQty)} qty will be ordered`
								: ""}
							{createdInboundId ? ` • Last created #${createdInboundId}` : ""}
						</div>
						<div className="flex gap-2">
							<Button
								type="button"
								size="sm"
								variant="ghost"
								onClick={() => setIsInboundFormOpen(false)}
							>
								Cancel
							</Button>
							<Button
								type="button"
								size="sm"
								disabled={
									createInbound.isPending ||
									!supplierId ||
									!selectedInboundRows.length
								}
								onClick={submitInbound}
							>
								Create inbound
							</Button>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}

function InventoryMergedTable({
	rows,
	salesOrderId,
	capabilities,
	isReadOnly,
	readOnlyReason,
}: {
	rows: InventoryLine[];
	salesOrderId: number;
	capabilities: InventoryCapabilities;
	isReadOnly: boolean;
	readOnlyReason: string | null;
}) {
	return (
		<div className="min-w-0 w-full max-w-full overflow-hidden [contain:inline-size]">
			{rows.length ? (
				<ItemGroup className="gap-2" aria-label="Inventory component items">
					{rows.map((row) => (
						<InventoryLineRow
							key={row.id}
							row={row}
							salesOrderId={salesOrderId}
							capabilities={capabilities}
							isReadOnly={isReadOnly}
							readOnlyReason={readOnlyReason}
						/>
					))}
				</ItemGroup>
			) : (
				<div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
					No items are in this section yet.
				</div>
			)}
		</div>
	);
}

function inventoryVariantLabel(row: InventoryLine) {
	return row.variantName || null;
}

function InventoryStockFilterGroup({
	value,
	onChange,
	stockCount,
	nonStockCount,
	inboundCount,
}: {
	value: InventoryStockFilter;
	onChange: (value: InventoryStockFilter) => void;
	stockCount: number;
	nonStockCount: number;
	inboundCount: number;
}) {
	return (
		<div className="inline-flex rounded-md border bg-background p-1">
			<Button
				type="button"
				size="sm"
				variant={value === "stock" ? "default" : "ghost"}
				aria-pressed={value === "stock"}
				className="h-8 gap-2 rounded-sm px-3"
				onClick={() => onChange("stock")}
			>
				Needs
				<Badge
					variant={value === "stock" ? "secondary" : "outline"}
					className="h-5 px-1.5 text-[10px]"
				>
					{stockCount}
				</Badge>
			</Button>
			<Button
				type="button"
				size="sm"
				variant={value === "inbounds" ? "default" : "ghost"}
				aria-pressed={value === "inbounds"}
				className="h-8 gap-2 rounded-sm px-3"
				onClick={() => onChange("inbounds")}
			>
				Inbounds
				<Badge
					variant={value === "inbounds" ? "secondary" : "outline"}
					className="h-5 px-1.5 text-[10px]"
				>
					{inboundCount}
				</Badge>
			</Button>
			<Button
				type="button"
				size="sm"
				variant={value === "non_stock" ? "default" : "ghost"}
				aria-pressed={value === "non_stock"}
				className="h-8 gap-2 rounded-sm px-3"
				onClick={() => onChange("non_stock")}
			>
				Not Needed
				<Badge
					variant={value === "non_stock" ? "secondary" : "outline"}
					className="h-5 px-1.5 text-[10px]"
				>
					{nonStockCount}
				</Badge>
			</Button>
		</div>
	);
}

function InventoryInboundsPanel({
	salesOrderId,
	shipments,
	isLoading,
	isReadOnly,
	readOnlyReason,
}: {
	salesOrderId: number;
	shipments: OrderInboundShipment[];
	isLoading: boolean;
	isReadOnly: boolean;
	readOnlyReason: string | null;
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { selectedInventoryInboundId, setSelectedInventoryInboundId } =
		useSalesInventorySegmentQuery();
	const [selectedInboundId, setSelectedInboundId] = useState<number | null>(
		null,
	);
	const selectedShipment =
		shipments.find((shipment) => shipment.id === selectedInboundId) ??
		shipments[0] ??
		null;
	const refreshOrderInbounds = async (inboundId?: number | null) => {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: trpc.inventories.orderInboundShipments.queryKey({
					salesOrderId,
				}),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.inventories.salesInventoryOverview.queryKey({
					salesOrderId,
				}),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.inventories.inboundShipments.queryKey({}),
			}),
			inboundId
				? queryClient.invalidateQueries({
						queryKey: trpc.inventories.inboundShipmentDetail.queryKey({
							inboundId,
						}),
					})
				: Promise.resolve(),
		]);
	};
	const updateStatus = useMutation(
		trpc.inventories.updateInboundShipmentStatus.mutationOptions({
			onSuccess: async (data) => {
				await refreshOrderInbounds(data.id);
				toast({
					title: "Inbound status updated",
					description: `Inbound #${data.id} is now ${titleCaseLabel(data.status)}.`,
					variant: "success",
				});
			},
			onError: (error) => {
				toast({
					title: "Unable to update inbound",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);
	const receiveInbound = useMutation(
		trpc.inventories.receiveInboundShipment.mutationOptions({
			onSuccess: async (data) => {
				await refreshOrderInbounds(data.inboundId);
				toast({
					title: "Inbound received into stock",
					description: `${formatQty(data.newlyReceivedQty)} new stock qty posted.`,
					variant: "success",
				});
			},
			onError: (error) => {
				toast({
					title: "Unable to receive inbound",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	useEffect(() => {
		if (!shipments.length) {
			setSelectedInboundId(null);
			return;
		}
		if (
			selectedInventoryInboundId &&
			shipments.some((row) => row.id === selectedInventoryInboundId)
		) {
			if (selectedInboundId !== selectedInventoryInboundId) {
				setSelectedInboundId(selectedInventoryInboundId);
			}
			return;
		}
		if (
			selectedInboundId &&
			shipments.some((row) => row.id === selectedInboundId)
		) {
			return;
		}
		setSelectedInboundId(shipments[0]?.id ?? null);
	}, [selectedInboundId, selectedInventoryInboundId, shipments]);

	const receiveAll = () => {
		if (!selectedShipment || isReadOnly) return;
		receiveInbound.mutate({
			inboundId: selectedShipment.id,
			items: selectedShipment.items.map((item) => ({
				inboundShipmentItemId: item.id,
				qtyReceived: Number(item.qty || item.demandQty || 0),
				qtyGood: Number(item.qty || item.demandQty || 0),
				qtyIssue: 0,
				unitPrice: item.unitPrice ?? null,
			})),
		});
	};
	const canReceive =
		!!selectedShipment &&
		!isReadOnly &&
		!["completed", "closed", "cancelled"].includes(selectedShipment.status) &&
		selectedShipment.items.some(
			(item) =>
				Number(item.receivedQty || item.qtyGood || 0) < Number(item.qty),
		);

	if (isLoading) return <InventoryTabSkeleton />;

	if (!shipments.length) {
		return (
			<div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
				No inbound shipments are linked to this order yet.
			</div>
		);
	}

	return (
		<div className="grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
			<div className="space-y-2">
				{shipments.map((shipment) => {
					const isSelected = selectedShipment?.id === shipment.id;
					return (
						<button
							key={shipment.id}
							type="button"
							className={cn(
								"w-full rounded-md border bg-background p-3 text-left transition hover:bg-muted/40",
								isSelected && "border-primary bg-primary/5",
							)}
							onClick={() => {
								setSelectedInboundId(shipment.id);
								setSelectedInventoryInboundId(shipment.id);
							}}
						>
							<div className="flex items-start justify-between gap-3">
								<div className="min-w-0">
									<div className="text-sm font-semibold">
										Inbound #{shipment.id}
									</div>
									<div className="mt-0.5 truncate text-xs text-muted-foreground">
										{shipment.supplier?.name || "No supplier"}{" "}
										{shipment.reference ? `• ${shipment.reference}` : ""}
									</div>
								</div>
								<Badge
									variant="outline"
									className={cn(
										"h-5 shrink-0 px-1.5 text-[10px]",
										inboundStatusClassName(shipment.status),
									)}
								>
									{titleCaseLabel(shipment.status)}
								</Badge>
							</div>
							<div className="mt-3 flex flex-wrap gap-1.5">
								<InventoryMetric label="ITEMS" value={shipment.itemCount} />
								<InventoryMetric
									label="QTY"
									value={formatQty(shipment.qtyOrdered)}
								/>
								<InventoryMetric
									label="RECEIVED"
									value={formatQty(shipment.qtyReceived)}
									tone={shipment.qtyReceived ? "success" : "default"}
								/>
							</div>
						</button>
					);
				})}
			</div>
			{selectedShipment ? (
				<div className="min-w-0 rounded-md border bg-background p-3">
					{isReadOnly ? (
						<Alert className="mb-3 border-dashed bg-muted/20 text-left">
							<Icons.LockKeyhole />
							<AlertTitle>Inbound actions are locked</AlertTitle>
							<AlertDescription>
								{readOnlyReason ||
									"This order is locked for inventory review and repair only."}
							</AlertDescription>
						</Alert>
					) : null}
					<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
						<div>
							<div className="flex flex-wrap items-center gap-2">
								<h3 className="text-sm font-semibold">
									Inbound #{selectedShipment.id}
								</h3>
								<Badge
									variant="outline"
									className={cn(
										"h-5 px-1.5 text-[10px]",
										inboundStatusClassName(selectedShipment.status),
									)}
								>
									{titleCaseLabel(selectedShipment.status)}
								</Badge>
							</div>
							<p className="mt-1 text-xs text-muted-foreground">
								{selectedShipment.supplier?.name || "No supplier"} • Expected{" "}
								{formatDateValue(selectedShipment.expectedAt)}
							</p>
						</div>
						<div className="flex flex-wrap gap-2">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										type="button"
										size="sm"
										variant="outline"
										disabled={isReadOnly || updateStatus.isPending}
									>
										Update status
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuLabel>Status</DropdownMenuLabel>
									<DropdownMenuSeparator />
									{(
										[
											"pending",
											"in_progress",
											"issue_open",
											"completed",
											"closed",
											"cancelled",
										] satisfies InboundShipmentStatus[]
									).map((status) => (
										<DropdownMenuItem
											key={status}
											disabled={
												isReadOnly ||
												updateStatus.isPending ||
												status === selectedShipment.status
											}
											onSelect={() => {
												if (isReadOnly) return;
												updateStatus.mutate({
													inboundId: selectedShipment.id,
													status,
												});
											}}
										>
											{titleCaseLabel(status)}
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
							<Button
								type="button"
								size="sm"
								disabled={!canReceive || receiveInbound.isPending}
								onClick={receiveAll}
							>
								Receive stock
							</Button>
						</div>
					</div>
					<div className="mt-4 space-y-2">
						{selectedShipment.items.map((item) => (
							<div key={item.id} className="rounded-md border bg-muted/10 p-3">
								<div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
									<div className="min-w-0">
										<div className="truncate text-xs font-semibold uppercase">
											{item.itemName}
										</div>
										<div className="mt-0.5 text-[11px] text-muted-foreground">
											{item.inventoryVariant.sku ||
												item.inventoryVariant.uid ||
												`Variant #${item.inventoryVariantId}`}
										</div>
									</div>
									<div className="flex flex-wrap gap-1.5">
										<InventoryMetric
											label="ORDERED"
											value={formatQty(item.qty)}
										/>
										<InventoryMetric
											label="RECEIVED"
											value={formatQty(item.receivedQty || item.qtyGood)}
											tone={
												Number(item.receivedQty || item.qtyGood || 0) > 0
													? "success"
													: "default"
											}
										/>
										{Number(item.qtyIssue || 0) > 0 ? (
											<InventoryMetric
												label="ISSUE"
												value={formatQty(item.qtyIssue)}
												tone="warning"
											/>
										) : null}
									</div>
								</div>
								<div className="mt-2 space-y-1">
									{item.inboundDemands.map((demand) => (
										<div
											key={demand.id}
											className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground"
										>
											<span className="min-w-0 truncate">
												{formatInventoryCategoryStepLabel(
													demand.lineItemComponent.inventoryCategory?.title,
												) || "Component"}{" "}
												•{" "}
												{demand.lineItemComponent.inventory?.name ||
													item.itemName}
											</span>
											<span className="tabular-nums">
												{formatQty(demand.qtyReceived)} /{" "}
												{formatQty(demand.qty)} {titleCaseLabel(demand.status)}
											</span>
										</div>
									))}
								</div>
							</div>
						))}
					</div>
				</div>
			) : null}
		</div>
	);
}

function InventoryLineRow({
	row,
	salesOrderId,
	capabilities,
	isReadOnly,
	readOnlyReason,
}: {
	row: InventoryLine;
	salesOrderId: number;
	capabilities: InventoryCapabilities;
	isReadOnly: boolean;
	readOnlyReason: string | null;
}) {
	const variantLabel = inventoryVariantLabel(row);
	const categoryStepLabel = formatInventoryCategoryStepLabel(row.stepName);
	const kindTags = inventoryLineKindTags(row);
	const pendingTone = row.qtyPending > 0 ? "warning" : "default";
	const allocatedTone = row.qtyAllocated > 0 ? "success" : "default";
	const stockCell = row.inventoryId ? (
		<a
			className="font-medium text-primary underline-offset-4 hover:underline"
			href={`/inventory/${row.inventoryId}`}
		>
			{formatQty(row.qtyInStock)}
		</a>
	) : (
		formatQty(row.qtyInStock)
	);

	return (
		<Item
			variant="outline"
			size="sm"
			className="items-start rounded-md bg-background/80 px-3 py-2.5 hover:bg-muted/30"
		>
			<ItemContent className="min-w-0 gap-2">
				<ItemHeader className="items-start gap-3">
					<div className="min-w-0 space-y-1">
						<ItemTitle className="min-w-0 flex-wrap gap-1.5">
							<span className="truncate text-[13px] tracking-normal">
								{row.componentName.toUpperCase()}
							</span>
							{kindTags.map((tag) => (
								<Badge
									key={tag.label}
									variant="outline"
									className={cn(
										"h-4 px-1 text-[9px] leading-none",
										tag.className,
									)}
								>
									{tag.label}
								</Badge>
							))}
						</ItemTitle>
						<ItemDescription className="line-clamp-none text-[11px]">
							{[
								categoryStepLabel,
								variantLabel ? variantLabel.toUpperCase() : null,
							]
								.filter(Boolean)
								.join(" • ") || "No step assigned"}
						</ItemDescription>
					</div>
					<ItemActions className="shrink-0">
						<InventoryLineActions
							row={row}
							salesOrderId={salesOrderId}
							capabilities={capabilities}
							isReadOnly={isReadOnly}
							readOnlyReason={readOnlyReason}
						/>
					</ItemActions>
				</ItemHeader>
				<div className="flex flex-wrap gap-1.5">
					<InventoryMetric
						label="INBOUND"
						value={row.requirementShortLabel}
						className={requirementStatusClassName(row)}
					/>
					<InventoryMetric label="QTY" value={formatQty(row.qtyRequired)} />
					<InventoryMetric label="ON HAND" value={stockCell} />
					<InventoryMetric
						label="ALLOCATED"
						value={formatQty(row.qtyAllocated)}
						tone={allocatedTone}
					/>
					<InventoryMetric
						label="PENDING"
						value={formatQty(row.qtyPending)}
						tone={pendingTone}
					/>
					<InventoryMetric label="COST" value={formatMoney(row.cost)} />
					<InventoryMetric label="SALES" value={formatMoney(row.salesPrice)} />
				</div>
			</ItemContent>
		</Item>
	);
}

function InventoryMetric({
	label,
	value,
	tone = "default",
	className,
}: {
	label: string;
	value: ReactNode;
	tone?: "default" | "success" | "warning";
	className?: string;
}) {
	return (
		<Badge
			variant="outline"
			className={cn(
				"h-6 gap-1 rounded-full border bg-muted/20 px-2 text-[10px] font-medium uppercase tabular-nums",
				tone === "success" && "border-emerald-200 bg-emerald-50/80",
				tone === "warning" && "border-amber-200 bg-amber-50/80",
				className,
			)}
		>
			<span className="text-muted-foreground">{label}:</span>
			<span className="min-w-0 truncate text-foreground">{value}</span>
		</Badge>
	);
}

function TrackingRepairPreviewDialog({
	preview,
	open,
	onOpenChange,
	onCheckStock,
	onCreateInbound,
}: {
	preview: TrackingRepairPreview | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCheckStock: () => void;
	onCreateInbound: () => void;
}) {
	if (!preview) return null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[86dvh] max-w-2xl overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Stock tracking changed</DialogTitle>
					<DialogDescription>
						These orders were previously treated as not needing tracked stock.
						The new tracking setting may require inventory review before
						production.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-3">
					<div className="grid gap-2 sm:grid-cols-3">
						<InventoryMetric
							label="ORDERS"
							value={preview.eligibleOrderCount}
							tone={preview.eligibleOrderCount ? "warning" : "default"}
						/>
						<InventoryMetric
							label="PENDING"
							value={formatQty(preview.totalPendingQty)}
							tone={preview.totalPendingQty ? "warning" : "default"}
						/>
						<InventoryMetric
							label="SKIPPED"
							value={preview.skippedReadOnlyOrderCount}
						/>
					</div>
					{preview.orders.length ? (
						<ItemGroup className="gap-2">
							{preview.orders.map((order) => (
								<Item
									key={order.salesOrderId}
									variant="outline"
									size="sm"
									className="items-start rounded-md bg-background/80 px-3 py-2.5"
								>
									<ItemContent>
										<ItemHeader>
											<ItemTitle className="text-sm">{order.orderId}</ItemTitle>
											<Badge
												variant="outline"
												className="h-5 px-1.5 text-[10px]"
											>
												{order.lifecycleLabel}
											</Badge>
										</ItemHeader>
										<ItemDescription className="line-clamp-none text-[11px]">
											{order.componentNames.join(", ")}
											{order.componentCount > order.componentNames.length
												? ` +${
														order.componentCount - order.componentNames.length
													} more`
												: ""}
										</ItemDescription>
									</ItemContent>
									<ItemActions>
										<InventoryMetric
											label="PENDING"
											value={formatQty(order.pendingQty)}
											tone="warning"
										/>
									</ItemActions>
								</Item>
							))}
						</ItemGroup>
					) : (
						<Alert className="border-dashed bg-muted/20">
							<Icons.Info />
							<AlertTitle>No eligible repair work</AlertTitle>
							<AlertDescription>
								Orders already past production or fulfillment were skipped, and
								no open pre-production order currently needs stock from this
								category.
							</AlertDescription>
						</Alert>
					)}
					{preview.truncated ? (
						<p className="text-xs text-muted-foreground">
							Only the first {preview.orders.length} affected orders are shown.
						</p>
					) : null}
				</div>
				<DialogFooter>
					<Button type="button" variant="outline" onClick={onCheckStock}>
						Check the stock
					</Button>
					<Button type="button" onClick={onCreateInbound}>
						Create inbound
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function InventoryLineActions({
	row,
	salesOrderId,
	capabilities,
	isReadOnly,
	readOnlyReason,
}: {
	row: InventoryLine;
	salesOrderId: number;
	capabilities: InventoryCapabilities;
	isReadOnly: boolean;
	readOnlyReason: string | null;
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { setInventorySegment } = useSalesInventorySegmentQuery();
	const [repairPreview, setRepairPreview] =
		useState<TrackingRepairPreview | null>(null);
	const categoryProductKind = normalizedProductKind(
		row.inventoryCategoryProductKind,
	);
	const categoryStockMode = normalizedStockMode(
		row.inventoryCategoryStockMode ?? row.inventoryStockMode,
	);
	const categoryNeedState: InventoryNeedState =
		categoryProductKind === "inventory" && categoryStockMode === "monitored"
			? "needed"
			: "not_needed";
	const categoryStepLabel = formatInventoryCategoryStepLabel(row.stepName);
	const canConfigureTracking = capabilities.canConfigureTracking && !isReadOnly;
	const canAllocateFromStock =
		capabilities.canAllocateStock &&
		!isReadOnly &&
		isStockInventoryLine(row) &&
		(row.pendingStockAllocationIds?.length || 0) > 0;
	const refreshOverview = async () => {
		await queryClient.invalidateQueries({
			queryKey: trpc.inventories.salesInventoryOverview.queryKey({
				salesOrderId,
			}),
		});
	};
	const updateCategoryKind = useMutation(
		trpc.inventories.updateCategoryProductKind.mutationOptions({
			onSuccess: async () => {
				await refreshOverview();
				toast({
					title: "Need setting updated",
					variant: "success",
				});
			},
		}),
	);
	const previewTrackingRepair = useMutation(
		trpc.inventories.salesInventoryTrackingChangeRepairPreview.mutationOptions({
			onSuccess: (preview) => {
				if (preview.eligibleOrderCount > 0) {
					setRepairPreview(preview);
					return;
				}
				toast({
					title: "No open orders need repair",
					description: preview.skippedReadOnlyOrderCount
						? `${preview.skippedReadOnlyOrderCount} order${
								preview.skippedReadOnlyOrderCount === 1 ? "" : "s"
							} already past production or fulfillment were skipped.`
						: "No pre-production order currently needs stock from this category.",
					variant: "success",
				});
			},
			onError: (error) => {
				toast({
					title: "Unable to check affected orders",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);
	const updateCategoryStockMode = useMutation(
		trpc.inventories.updateCategoryStockMode.mutationOptions({
			onSuccess: async (data) => {
				await refreshOverview();
				toast({
					title: "Need setting updated",
					variant: "success",
				});
				if (data.becameTracked) {
					previewTrackingRepair.mutate({
						inventoryCategoryId: data.id,
					});
				}
			},
		}),
	);
	const approveAllocations = useMutation(
		trpc.inventories.approveBulkStockAllocation.mutationOptions({
			onSuccess: async (result) => {
				await refreshOverview();
				toast({
					title: "Stock allocated",
					description: `${result.count} allocation${
						result.count === 1 ? "" : "s"
					} approved${
						result.skippedCount
							? `, ${result.skippedCount} already handled`
							: ""
					}.`,
					variant: "success",
				});
			},
			onError: (error) => {
				toast({
					title: "Unable to allocate stock",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);
	const isSaving =
		updateCategoryKind.isPending ||
		updateCategoryStockMode.isPending ||
		previewTrackingRepair.isPending ||
		approveAllocations.isPending;
	const setCategoryNeedState = (needState: InventoryNeedState) => {
		if (
			!canConfigureTracking ||
			!row.inventoryCategoryId ||
			needState === categoryNeedState
		) {
			return;
		}

		if (needState === "not_needed") {
			updateCategoryKind.mutate({
				id: row.inventoryCategoryId,
				productKind: "component",
			});
			return;
		}

		if (categoryProductKind !== "inventory") {
			updateCategoryKind.mutate(
				{
					id: row.inventoryCategoryId,
					productKind: "inventory",
				},
				{
					onSuccess: () => {
						if (categoryStockMode === "monitored" || !row.inventoryCategoryId) {
							return;
						}
						updateCategoryStockMode.mutate({
							id: row.inventoryCategoryId,
							stockMode: "monitored",
						});
					},
				},
			);
			return;
		}

		if (categoryStockMode !== "monitored") {
			updateCategoryStockMode.mutate({
				id: row.inventoryCategoryId,
				stockMode: "monitored",
			});
		}
	};

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						type="button"
						size="icon"
						variant="ghost"
						className="size-8 rounded-full"
						aria-label={`Edit ${row.componentName}`}
					>
						<Icons.MoreHorizontal className="size-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-64">
					<DropdownMenuLabel>
						<div className="truncate text-xs font-semibold">
							{categoryStepLabel || "Category"}
						</div>
						<div className="mt-0.5 whitespace-normal text-[11px] font-normal leading-relaxed text-muted-foreground">
							Applies to every item in this category.
						</div>
					</DropdownMenuLabel>
					{isReadOnly ? (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuLabel className="whitespace-normal text-xs font-normal leading-relaxed text-muted-foreground">
								<span className="flex items-start gap-2">
									<Icons.LockKeyhole className="mt-0.5 size-3.5 shrink-0" />
									<span>
										{readOnlyReason ||
											"This order is locked for inventory review and repair only."}
									</span>
								</span>
							</DropdownMenuLabel>
						</>
					) : null}
					<DropdownMenuSeparator />
					<DropdownMenuRadioGroup
						value={categoryNeedState}
						onValueChange={(value) =>
							setCategoryNeedState(value as InventoryNeedState)
						}
					>
						<DropdownMenuRadioItem
							value="needed"
							disabled={
								!canConfigureTracking || !row.inventoryCategoryId || isSaving
							}
						>
							Needed
						</DropdownMenuRadioItem>
						<DropdownMenuRadioItem
							value="not_needed"
							disabled={
								!canConfigureTracking || !row.inventoryCategoryId || isSaving
							}
						>
							Not needed
						</DropdownMenuRadioItem>
					</DropdownMenuRadioGroup>
					{canAllocateFromStock ? (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								disabled={isSaving}
								onSelect={() =>
									approveAllocations.mutate({
										allocationIds: row.pendingStockAllocationIds,
									})
								}
							>
								<Icons.Warehouse className="mr-2 size-4" />
								Allocate available stock
							</DropdownMenuItem>
						</>
					) : null}
					{row.inventoryId ? (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuItem asChild>
								<a href={`/inventory/${row.inventoryId}`}>
									<Icons.ExternalLink className="mr-2 size-4" />
									Open inventory item
								</a>
							</DropdownMenuItem>
						</>
					) : null}
				</DropdownMenuContent>
			</DropdownMenu>
			<TrackingRepairPreviewDialog
				preview={repairPreview}
				open={!!repairPreview}
				onOpenChange={(open) => {
					if (!open) setRepairPreview(null);
				}}
				onCheckStock={() => {
					setRepairPreview(null);
					setInventorySegment("stock");
				}}
				onCreateInbound={() => {
					setRepairPreview(null);
					setInventorySegment("inbounds");
				}}
			/>
		</>
	);
}

export function SalesOverviewInventoryContent({
	salesOrderId,
}: {
	salesOrderId?: number | null;
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [autoSyncOrderId, setAutoSyncOrderId] = useState<number | null>(null);
	const { inventorySegment: stockFilter, setInventorySegment: setStockFilter } =
		useSalesInventorySegmentQuery();
	const normalizedSalesOrderId = salesOrderId ? Number(salesOrderId) : 0;
	const inventoryQuery = useQuery(
		trpc.inventories.salesInventoryOverview.queryOptions(
			{
				salesOrderId: normalizedSalesOrderId,
			},
			{
				enabled: !!normalizedSalesOrderId,
				staleTime: 60 * 1000,
				refetchOnWindowFocus: false,
			},
		),
	);
	const orderInboundsQuery = useQuery(
		trpc.inventories.orderInboundShipments.queryOptions(
			{
				salesOrderId: normalizedSalesOrderId,
			},
			{
				enabled: !!normalizedSalesOrderId && stockFilter === "inbounds",
				staleTime: 60 * 1000,
				refetchOnWindowFocus: false,
			},
		),
	);
	const syncInventory = useMutation(
		trpc.inventories.syncSalesInventoryOverview.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: trpc.inventories.salesInventoryOverview.queryKey({
						salesOrderId: normalizedSalesOrderId,
					}),
				});
			},
		}),
	);
	const overview = inventoryQuery.data;
	const groups = overview?.groups ?? [];
	const rows = overview?.rows ?? [];
	const stockRows = rows.filter(isStockInventoryLine);
	const nonStockRows = rows.filter((row) => !isStockInventoryLine(row));
	const orderInboundShipments = orderInboundsQuery.data ?? [];
	const overviewLinkedInboundRowCount = rows.filter(
		(row) => Number(row.qtyInboundLinkedOpen || 0) > 0,
	).length;
	const inboundCount =
		stockFilter === "inbounds" && orderInboundsQuery.data
			? orderInboundShipments.length
			: overviewLinkedInboundRowCount;
	const filteredRows =
		stockFilter === "stock"
			? stockRows
			: stockFilter === "non_stock"
				? nonStockRows
				: [];
	const filteredPendingQty = filteredRows.reduce(
		(total, row) => total + row.qtyPending,
		0,
	);
	const filteredShortageCount = filteredRows.filter(
		isShortageInventoryLine,
	).length;
	const shouldAutoSync =
		!!normalizedSalesOrderId &&
		!!overview &&
		overview.capabilities.canSync &&
		overview.setupMode === "not_configured" &&
		!groups.length &&
		autoSyncOrderId !== normalizedSalesOrderId &&
		!syncInventory.isPending;

	useEffect(() => {
		if (!shouldAutoSync) return;
		setAutoSyncOrderId(normalizedSalesOrderId);
		syncInventory.mutate({ salesOrderId: normalizedSalesOrderId });
	}, [normalizedSalesOrderId, shouldAutoSync, syncInventory]);

	if (!normalizedSalesOrderId) {
		return (
			<OverviewEmptyState>
				Open a saved order before reviewing inventory status.
			</OverviewEmptyState>
		);
	}

	if (inventoryQuery.isLoading) return <InventoryTabSkeleton />;

	if (shouldAutoSync || syncInventory.isPending) {
		return (
			<div className="space-y-4">
				{overview ? (
					<InventoryActionBar
						overview={overview}
						salesOrderId={normalizedSalesOrderId}
					/>
				) : null}
				<InventorySyncState />
			</div>
		);
	}

	if (!overview) {
		return (
			<OverviewEmptyState>
				Inventory status is not available for this order yet.
			</OverviewEmptyState>
		);
	}

	if (overview.setupMode === "completed_readonly") {
		return <FulfilledInventoryNoIntegrationState overview={overview} />;
	}

	if (overview.setupMode === "legacy_status_locked") {
		return <LegacyInventoryStatusLockedState overview={overview} />;
	}

	if (!rows.length) {
		return (
			<div className="space-y-4">
				<InventoryActionBar
					overview={overview}
					salesOrderId={normalizedSalesOrderId}
				/>
				{syncInventory.isError ? (
					<InventorySyncState message="Inventory sync could not finish." />
				) : null}
				<OverviewEmptyState>
					No inventory-backed line items are synced for this order yet.
				</OverviewEmptyState>
				<Button
					type="button"
					size="sm"
					variant="outline"
					disabled={!overview.capabilities.canSync}
					onClick={() =>
						syncInventory.mutate({
							salesOrderId: normalizedSalesOrderId,
						})
					}
				>
					Sync with inventory
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<InventoryStockFilterGroup
					value={stockFilter}
					onChange={setStockFilter}
					stockCount={stockRows.length}
					nonStockCount={nonStockRows.length}
					inboundCount={inboundCount}
				/>
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant="outline" className="capitalize">
						{readinessLabel(overview.summary.readiness)}
					</Badge>
					{stockFilter === "inbounds" ? (
						<Badge variant="outline">
							{formatQty(inboundCount)} inbound
							{inboundCount === 1 ? "" : "s"}
						</Badge>
					) : (
						<>
							{filteredShortageCount ? (
								<Badge
									variant="outline"
									className="border-red-200 bg-red-50 text-red-700"
								>
									{formatQty(filteredShortageCount)} short
								</Badge>
							) : null}
							{filteredPendingQty ? (
								<Badge variant="outline">
									{formatQty(filteredPendingQty)} pending
								</Badge>
							) : null}
							<Badge variant="outline">
								{formatQty(filteredRows.length)} shown
							</Badge>
						</>
					)}
				</div>
			</div>
			{stockFilter === "stock" ? (
				<InventoryActionBar
					overview={overview}
					salesOrderId={normalizedSalesOrderId}
				/>
			) : null}
			{stockFilter === "inbounds" ? (
				<InventoryInboundsPanel
					salesOrderId={normalizedSalesOrderId}
					shipments={orderInboundShipments}
					isLoading={orderInboundsQuery.isLoading}
					isReadOnly={overview.isInventoryReadOnly}
					readOnlyReason={overview.inventoryActionBlockReason}
				/>
			) : (
				<InventoryMergedTable
					rows={filteredRows}
					salesOrderId={normalizedSalesOrderId}
					capabilities={overview.capabilities}
					isReadOnly={overview.isInventoryReadOnly}
					readOnlyReason={overview.inventoryActionBlockReason}
				/>
			)}
		</div>
	);
}

export function SalesOverviewInventoryTab() {
	const {
		state: { data },
	} = useSalesOverviewSystem();

	return (
		<SalesOverviewInventoryContent
			salesOrderId={data?.id ? Number(data.id) : null}
		/>
	);
}

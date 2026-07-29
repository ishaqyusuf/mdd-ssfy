"use client";

import { useSalesInventoryConfiguratorPrompt } from "@/components/forms/sales-form/inventory-configurator-dialog";
import {
	getInventoryInboundOwnershipLabel,
	getInventoryInboundOwnershipStatus,
	getInventoryInboundOwnershipTitle,
	getInventoryInboundStatusToneClassName,
	getSalesInboundActionIntent,
	getSalesInboundStatusToneClassName,
	normalizeSalesInboundStatus,
	resolveSalesInboundColumnState,
} from "@/components/sales-inbound-status-badge";
import { SalesMenu } from "@/components/sales-menu";
import { useSalesInventorySegmentQuery } from "@/components/sales-overview-system/hooks/use-sales-inventory-segment-query";
import { SalesPriorityBadge } from "@/components/sales-priority-control";
import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { SalesPaymentProcessor } from "@/components/widgets/sales-payment-processor/sales-payment-processor";
import { useSalesOrdersV2FilterParams } from "@/hooks/use-sales-orders-v2-filter-params";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { formatCurrency } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { getSalesOrderLifecycleStatusBadgeClassName } from "@gnd/sales/order-status";
import { Badge } from "@gnd/ui/badge";
import { Button, buttonVariants } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { cn } from "@gnd/ui/cn";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Icons } from "@gnd/ui/icons";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@gnd/ui/tooltip";
import { toast } from "@gnd/ui/use-toast";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useRef, useState } from "react";
import {
	getDealerSaleOrderCellClassName,
	getDealerSaleOrderNumberClassName,
} from "./dealer-sale-style";

export type SalesOrder = RouterOutputs["sales"]["getOrders"]["data"][number];

type Column = ColumnDef<SalesOrder>;

function baseInvoiceTotal(item: SalesOrder) {
	return item.baseInvoiceTotal ?? item.invoiceTotal;
}

function amountTone(item: SalesOrder) {
	if (item.amountDue === baseInvoiceTotal(item)) return "text-red-600";
	if (item.amountDue > 0) return "text-violet-600";
	return "text-emerald-600";
}

function paymentHint(item: SalesOrder) {
	if (item.amountDue === baseInvoiceTotal(item)) return "Unpaid";
	if (item.amountDue > 0) return `Due ${formatCurrency.format(item.amountDue)}`;
	return "Paid";
}

const selectColumn: Column = {
	id: "select",
	...sizes.xs,
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		sticky: true,
		skeleton: { type: "checkbox" },
		className: sizeClass(
			sizes.xs,
			"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20 justify-center",
		),
		contentClassName: "flex items-center justify-center",
	},
	cell: ({ row }) => (
		<Checkbox
			checked={row.getIsSelected()}
			onCheckedChange={(checked) => {
				if (checked === "indeterminate") {
					row.toggleSelected();
				} else {
					row.toggleSelected(checked);
				}
			}}
		/>
	),
};

const orderIdColumn: Column = {
	id: "orderId",
	header: "Order #",
	accessorKey: "orderId",
	...sizes.md,
	enableResizing: true,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Order #",
		sortField: "orderId",
		className: sizeClass(
			sizes.md,
			"md:sticky md:left-[50px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => (
		<div
			className={cn(
				"flex h-full w-full min-w-0 items-center gap-1.5 overflow-hidden",
				getDealerSaleOrderCellClassName(row.original.isDealerSale),
			)}
		>
			<span
				className={cn(
					"truncate font-mono text-sm font-medium uppercase",
					getDealerSaleOrderNumberClassName(row.original.isDealerSale),
				)}
			>
				{row.original.orderId}
			</span>
			{row.original.isDealerSale ? (
				<span className="sr-only">Dealer sale</span>
			) : null}
			<SalesPriorityBadge priority={row.original.priority} />
			{row.original.salesRepInitial &&
			!row.original.orderId
				?.toUpperCase()
				.endsWith(row.original.salesRepInitial) ? (
				<Badge
					className="h-5 shrink-0 rounded-full px-1.5 text-[10px] font-semibold uppercase"
					variant="secondary"
				>
					{row.original.salesRepInitial}
				</Badge>
			) : null}
			{row.original.noteCount ? (
				<Badge
					className="h-5 shrink-0 gap-1 rounded-full px-1.5 text-[10px]"
					variant="secondary"
				>
					<Icons.StickyNote className="size-3" />
					<span>{row.original.noteCount}</span>
				</Badge>
			) : null}
		</div>
	),
};

const statusColumn: Column = {
	id: "status",
	header: "Status",
	accessorKey: "status",
	...sizes.custom(110, 180, 130),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-28" },
		headerLabel: "Status",
		sortField: "status",
		className: sizeClass(sizes.custom(110, 180, 130)),
	},
	cell: ({ row }) => <SalesOrderStatusMenu item={row.original} />,
};

function SalesOrderStatusMenu({ item }: { item: SalesOrder }) {
	return (
		<SalesMenu
			id={item.id}
			slug={item.slug}
			type="order"
			orderNo={item.orderId}
			customerEmail={item.email}
			customerPhone={item.customerPhone}
			customerName={item.customerName}
			align="start"
			contentClassName="min-w-56"
			trigger={
				<span
					aria-label={`Change status for ${item.orderId}`}
					// biome-ignore lint/a11y/useSemanticElements: Product design requires the status badge to remain a non-button trigger.
					role="button"
					tabIndex={0}
					className={cn(
						buttonVariants({
							variant: "ghost",
							size: "sm",
						}),
						"h-7 max-w-full cursor-pointer justify-start gap-1.5 whitespace-nowrap border-0 px-2 font-medium shadow-none",
						getSalesOrderLifecycleStatusBadgeClassName(item.status),
					)}
					onClick={(event) => event.stopPropagation()}
					onKeyDown={(event) => event.stopPropagation()}
					onPointerDown={(event) => event.stopPropagation()}
				>
					<span className="truncate">{item.statusLabel}</span>
					<Icons.ChevronDown className="size-3 shrink-0 opacity-70" />
				</span>
			}
		>
			<SalesMenu.MarkAs
				asSubmenu={false}
				currentStatus={item.status}
				productionStatus={item.productionState}
			/>
		</SalesMenu>
	);
}

const salesDateColumn: Column = {
	id: "salesDate",
	header: "Date",
	accessorKey: "salesDate",
	...sizes.sm,
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Date",
		sortField: "createdAt",
		className: sizeClass(sizes.sm),
	},
	cell: ({ row }) => (
		<span className="truncate text-muted-foreground">
			{row.original.salesDate}
		</span>
	),
};

const customerColumn: Column = {
	id: "customerName",
	header: "Customer",
	accessorKey: "customerName",
	...sizes.custom(180, 380, 240),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-36" },
		headerLabel: "Customer",
		sortField: "customerName",
		className: sizeClass(sizes.custom(180, 380, 240)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate font-medium uppercase"
			text={row.original.customerName}
		/>
	),
};

const phoneColumn: Column = {
	id: "customerPhone",
	header: "Phone",
	accessorKey: "customerPhone",
	...sizes.custom(120, 200, 150),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Phone",
		className: sizeClass(sizes.custom(120, 200, 150)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate text-muted-foreground"
			text={row.original.customerPhone || "-"}
		/>
	),
};

const poColumn: Column = {
	id: "poNo",
	header: "P.O",
	accessorKey: "poNo",
	...sizes.custom(90, 180, 120),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-16" },
		headerLabel: "P.O",
		className: sizeClass(sizes.custom(90, 180, 120)),
	},
	cell: ({ row }) => (
		<span className="truncate text-muted-foreground">
			{row.original.poNo || "-"}
		</span>
	),
};

const inboundColumn: Column = {
	id: "inboundStatus",
	header: "Inbound",
	accessorKey: "inboundStatus",
	...sizes.custom(110, 180, 130),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-24" },
		headerLabel: "Inbound",
		className: sizeClass(sizes.custom(110, 180, 130)),
	},
	cell: ({ row }) => <InboundStatusCell item={row.original} />,
};

function InboundStatusCell({ item }: { item: SalesOrder }) {
	const overviewQuery = useSalesOverviewQuery();
	const { setInventorySegment } = useSalesInventorySegmentQuery();
	const inventoryInboundOwnership = item.inventoryInboundOwnership;
	const inventoryApplicability = item.inventoryApplicability;
	const inventoryLegacyCompatibility = item.inventoryLegacyCompatibility;
	const hasInventoryInbound = !!inventoryInboundOwnership?.hasInventoryInbound;
	const columnState = resolveSalesInboundColumnState({
		ownership: inventoryInboundOwnership,
		inventoryApplicabilityState: inventoryApplicability?.state,
		legacyCompatibilityState: inventoryLegacyCompatibility?.state,
		legacyStatus: item.inboundStatus,
	});
	const actionIntent = getSalesInboundActionIntent(inventoryInboundOwnership);
	const inboundStatusClassName =
		"h-7 max-w-full cursor-pointer justify-start gap-1.5 whitespace-nowrap px-2 font-medium shadow-none";
	const openInventoryInbound = () => {
		setInventorySegment(actionIntent.segment, {
			inboundId: actionIntent.inboundId,
			openCreate: actionIntent.openCreate,
		});
		overviewQuery.setParams({
			"sales-overview-id": item.uuid,
			"sales-type": "order",
			mode: "sales",
			salesTab: "inventory",
			"prod-item-tab": null,
			"prod-item-view": null,
			dispatchOverviewId: null,
		});
	};
	const openInventoryReview = () => {
		setInventorySegment("stock", {
			inboundId: null,
			openCreate: false,
		});
		overviewQuery.setParams({
			"sales-overview-id": item.uuid,
			"sales-type": "order",
			mode: "sales",
			salesTab: "inventory",
			"prod-item-tab": null,
			"prod-item-view": null,
			dispatchOverviewId: null,
		});
	};

	if (columnState === "inventory_inbound" && hasInventoryInbound) {
		const status = getInventoryInboundOwnershipStatus(
			inventoryInboundOwnership,
		);

		return (
			<span
				aria-label={`Open inbound status for ${item.orderId}`}
				// biome-ignore lint/a11y/useSemanticElements: Product design requires status cells to use button styling without rendering a button.
				role="button"
				tabIndex={0}
				className={cn(
					buttonVariants({ variant: "ghost", size: "sm" }),
					inboundStatusClassName,
					getInventoryInboundStatusToneClassName(status),
				)}
				title={getInventoryInboundOwnershipTitle(inventoryInboundOwnership)}
				onClick={(event) => {
					event.preventDefault();
					event.stopPropagation();
					openInventoryInbound();
				}}
				onKeyDown={(event) => {
					event.stopPropagation();
					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						openInventoryInbound();
					}
				}}
				onPointerDown={(event) => event.stopPropagation()}
			>
				<Icons.PackageOpen className="size-3 shrink-0" />
				<span className="truncate">
					{getInventoryInboundOwnershipLabel(inventoryInboundOwnership)}
				</span>
			</span>
		);
	}

	if (columnState === "not_applicable") {
		return (
			<button
				type="button"
				aria-label={`Explain inbound status for ${item.orderId}`}
				className={cn(
					buttonVariants({ variant: "ghost", size: "sm" }),
					inboundStatusClassName,
					"text-muted-foreground",
				)}
				title={inventoryApplicability.description}
				onClick={(event) => {
					event.preventDefault();
					event.stopPropagation();
					toast({
						duration: 4000,
						title: "Inbound not applicable",
						description: inventoryApplicability.description,
					});
				}}
				onPointerDown={(event) => event.stopPropagation()}
			>
				N/A
			</button>
		);
	}

	if (columnState === "syncing") {
		return (
			<span
				className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-md px-2 font-medium text-muted-foreground"
				title={inventoryApplicability.description}
			>
				<Icons.Loader2 className="size-3 animate-spin" />
				{inventoryApplicability.label}
			</span>
		);
	}

	if (columnState === "legacy_status_locked") {
		const legacyStatus =
			inventoryLegacyCompatibility?.normalizedLegacyStatus ??
			normalizeSalesInboundStatus(item.inboundStatus);

		return (
			<span
				aria-label={`Review legacy inbound status for ${item.orderId}`}
				// biome-ignore lint/a11y/useSemanticElements: Product design requires status cells to use button styling without rendering a button.
				role="button"
				tabIndex={0}
				className={cn(
					buttonVariants({ variant: "ghost", size: "sm" }),
					inboundStatusClassName,
					"border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:text-amber-900",
				)}
				title={`Legacy ${legacyStatus} status — inventory setup is required to continue.`}
				onClick={(event) => {
					event.preventDefault();
					event.stopPropagation();
					openInventoryReview();
				}}
				onKeyDown={(event) => {
					event.stopPropagation();
					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						openInventoryReview();
					}
				}}
				onPointerDown={(event) => event.stopPropagation()}
			>
				<Icons.LockKeyhole className="size-3 shrink-0" />
				<span className="truncate">{legacyStatus}</span>
			</span>
		);
	}

	if (columnState === "unsupported_status") {
		return (
			<span
				aria-label={`Review unsupported inbound status for ${item.orderId}`}
				// biome-ignore lint/a11y/useSemanticElements: Product design requires status cells to use button styling without rendering a button.
				role="button"
				tabIndex={0}
				className={cn(
					buttonVariants({ variant: "ghost", size: "sm" }),
					inboundStatusClassName,
					"border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800",
				)}
				title={inventoryLegacyCompatibility?.description}
				onClick={(event) => {
					event.preventDefault();
					event.stopPropagation();
					openInventoryReview();
				}}
				onKeyDown={(event) => {
					event.stopPropagation();
					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						openInventoryReview();
					}
				}}
				onPointerDown={(event) => event.stopPropagation()}
			>
				<Icons.AlertTriangle className="size-3 shrink-0" />
				<span className="truncate">Status needs review</span>
			</span>
		);
	}

	if (columnState === "projection_attention") {
		return (
			<button
				type="button"
				className={cn(
					buttonVariants({ variant: "ghost", size: "sm" }),
					inboundStatusClassName,
					"text-muted-foreground",
				)}
				title={inventoryApplicability.description}
				onClick={(event) => {
					event.preventDefault();
					event.stopPropagation();
					openInventoryReview();
				}}
				onPointerDown={(event) => event.stopPropagation()}
			>
				{inventoryApplicability.label}
			</button>
		);
	}

	const inboundStatusLabel =
		normalizeSalesInboundStatus(item.inboundStatus) ?? "Set status";

	return (
		<span
			aria-label={`Change inbound status for ${item.orderId}`}
			// biome-ignore lint/a11y/useSemanticElements: Product design requires status cells to use button styling without rendering a button.
			role="button"
			tabIndex={0}
			className={cn(
				buttonVariants({ variant: "ghost", size: "sm" }),
				inboundStatusClassName,
				getSalesInboundStatusToneClassName(item.inboundStatus),
			)}
			title="Create inventory inbound"
			onClick={(event) => {
				event.preventDefault();
				event.stopPropagation();
				openInventoryInbound();
			}}
			onKeyDown={(event) => {
				event.stopPropagation();
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					openInventoryInbound();
				}
			}}
			onPointerDown={(event) => event.stopPropagation()}
		>
			<span className="truncate">{inboundStatusLabel}</span>
		</span>
	);
}

const invoiceTotalColumn: Column = {
	id: "invoiceTotal",
	header: "Invoice",
	accessorKey: "invoiceTotal",
	...sizes.sm,
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-16" },
		headerLabel: "Invoice",
		sortField: "grandTotal",
		defaultSortDirection: "desc",
		className: sizeClass(sizes.sm, "text-right"),
	},
	cell: ({ row }) => <InvoiceCell item={row.original} />,
};

const amountDueColumn: Column = {
	id: "amountDue",
	header: "Balance",
	accessorKey: "amountDue",
	...sizes.custom(110, 200, 140),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Balance",
		sortField: "amountDue",
		className: sizeClass(sizes.custom(110, 200, 140), "text-right"),
	},
	cell: ({ row }) => (
		<span className="block truncate text-right font-mono text-muted-foreground">
			{paymentHint(row.original)}
		</span>
	),
};

const deliveryColumn: Column = {
	id: "deliveryOption",
	header: "Method",
	accessorKey: "deliveryOption",
	...sizes.custom(100, 180, 130),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Method",
		className: sizeClass(sizes.custom(100, 180, 130)),
	},
	cell: ({ row }) => (
		<span className="truncate capitalize text-muted-foreground">
			{row.original.deliveryOption || "-"}
		</span>
	),
};

const productionColumn: Column = {
	id: "productionLabel",
	header: "Production",
	accessorKey: "productionLabel",
	...sizes.custom(120, 220, 140),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Production",
		sortField: "prodStatus",
		className: sizeClass(sizes.custom(120, 220, 140)),
	},
	cell: ({ row }) => (
		<span className="truncate text-muted-foreground">
			{row.original.productionLabel}
		</span>
	),
};

const fulfillmentColumn: Column = {
	id: "fulfillmentLabel",
	header: "Fulfillment",
	accessorKey: "fulfillmentLabel",
	...sizes.custom(120, 220, 140),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Fulfillment",
		className: sizeClass(sizes.custom(120, 220, 140)),
	},
	cell: ({ row }) => (
		<span className="truncate text-muted-foreground">
			{row.original.fulfillmentLabel}
		</span>
	),
};

const salesRepColumn: Column = {
	id: "salesRepName",
	header: "Sales rep",
	accessorKey: "salesRepName",
	...sizes.custom(120, 220, 140),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Sales rep",
		sortField: "salesRepName",
		className: sizeClass(sizes.custom(120, 220, 140)),
	},
	cell: ({ row }) => (
		<span className="truncate text-muted-foreground">
			{row.original.salesRepName}
		</span>
	),
};

const addressColumn: Column = {
	id: "address",
	header: "Address",
	accessorKey: "address",
	...sizes.md,
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-40" },
		headerLabel: "Address",
		className: sizeClass(sizes.md),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate text-muted-foreground"
			text={row.original.address}
		/>
	),
};

const actionsColumn: Column = {
	id: "actions",
	header: "Actions",
	...sizes.custom(144, 144),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		skeleton: { type: "icon" },
		headerLabel: "Actions",
		className: sizeClass(
			sizes.custom(144, 144),
			"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => <ActionCell item={row.original} />,
};

export const columns: Column[] = [
	selectColumn,
	orderIdColumn,
	salesDateColumn,
	poColumn,
	inboundColumn,
	customerColumn,
	phoneColumn,
	addressColumn,
	invoiceTotalColumn,
	deliveryColumn,
	statusColumn,
	amountDueColumn,
	productionColumn,
	fulfillmentColumn,
	salesRepColumn,
	actionsColumn,
];

function InvoiceCell({ item }: { item: SalesOrder }) {
	const [opened, setOpened] = useState(false);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const pending = item.amountDue;
	const total = item.invoiceTotal;
	const baseTotal = baseInvoiceTotal(item);
	const ccc = item.displayCcc || 0;
	const paid = Math.max(baseTotal - pending, 0);
	const hasPendingBalance = pending > 0;
	const paymentReview = item.latestPaymentReview;
	const amountContent = formatCurrency.format(total);

	const amountElement = (
		<span
			className={cn(
				"block truncate text-right font-mono font-medium",
				amountTone(item),
			)}
		>
			{amountContent}
		</span>
	);

	if (!hasPendingBalance) {
		return (
			<div className="flex min-w-0 flex-col items-end gap-0.5">
				{amountElement}
				<PaymentReviewBadge paymentReview={paymentReview} />
			</div>
		);
	}

	return (
		<div className="relative z-10 flex min-w-0 flex-col items-end gap-0.5 text-right">
			<SalesPaymentProcessor
				phoneNo={item.accountNo || item.customerPhone}
				selectedIds={[item.id]}
				customerId={item.customerId}
			>
				<button
					ref={buttonRef}
					type="button"
					className="hidden"
					onClick={(event) => event.stopPropagation()}
				/>
			</SalesPaymentProcessor>
			<TooltipProvider delayDuration={70}>
				<Tooltip open={opened} onOpenChange={setOpened}>
					<TooltipTrigger asChild>
						<button
							type="button"
							className={cn(
								"block w-full truncate text-right font-mono font-medium",
								amountTone(item),
							)}
							onClick={(event) => {
								event.preventDefault();
								event.stopPropagation();
							}}
						>
							{amountContent}
						</button>
					</TooltipTrigger>
					<TooltipContent
						align="end"
						side="left"
						sideOffset={10}
						className="relative z-[999] w-52 space-y-3 px-3 py-2 text-xs"
						onClick={(event) => {
							event.preventDefault();
							event.stopPropagation();
						}}
					>
						<div className="space-y-2">
							<InvoiceBreakdownLine label="Base Total" value={baseTotal} />
							{ccc > 0 ? (
								<InvoiceBreakdownLine label="C.C.C" value={ccc} />
							) : null}
							<InvoiceBreakdownLine label="Pending" value={pending} />
							<InvoiceBreakdownLine label="Paid" value={paid} />
							<InvoiceBreakdownLine label="Total" value={total} />
							{paymentReview ? (
								<InvoiceBreakdownLine
									label="Latest payment"
									value={paymentReview.amount}
								/>
							) : null}
						</div>
						<Button
							className="w-full"
							disabled={!item.due}
							size="sm"
							onClick={(event) => {
								event.preventDefault();
								event.stopPropagation();
								setOpened(false);
								buttonRef.current?.click();
							}}
						>
							Apply Payment
						</Button>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
			<PaymentReviewBadge paymentReview={paymentReview} />
		</div>
	);
}

function PaymentReviewBadge({
	paymentReview,
}: {
	paymentReview: SalesOrder["latestPaymentReview"];
}) {
	if (!paymentReview) return null;

	return (
		<Badge
			variant="outline"
			className="h-4 max-w-full gap-1 rounded-full border-amber-200 bg-amber-50 px-1.5 text-[9px] font-semibold uppercase text-amber-700"
			title={`${paymentReview.origin || "office"} payment needs review`}
		>
			<Icons.CheckCircle className="size-2.5 shrink-0" />
			<span className="truncate">
				{paymentReview.origin === "online" ? "Online" : "Office"}
			</span>
		</Badge>
	);
}

function InvoiceBreakdownLine({
	label,
	value,
}: {
	label: string;
	value: number;
}) {
	return (
		<div className="flex items-center justify-between gap-4">
			<span className="font-medium text-muted-foreground">{label}</span>
			<span className="font-mono font-medium">
				{formatCurrency.format(value)}
			</span>
		</div>
	);
}

function ActionCell({ item }: { item: SalesOrder }) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const overviewQuery = useSalesOverviewQuery();
	const { filters } = useSalesOrdersV2FilterParams();
	const { inventoryConfiguratorDialog, openSalesInventoryConfigurator } =
		useSalesInventoryConfiguratorPrompt();
	const [paymentLinkOpen, setPaymentLinkOpen] = useState(false);
	const [paymentLink, setPaymentLink] = useState<{
		url: string;
		orderId: string | null;
		amountDue: number;
	} | null>(null);
	const markPaymentReviewed = useMutation(
		trpc.sales.markLatestPaymentReviewed.mutationOptions({
			onSuccess() {
				toast({
					duration: 2000,
					variant: "success",
					title: "Payment reviewed",
					description: "The payment was removed from the review queue.",
				});
			},
			onError(error) {
				toast({
					duration: 3000,
					variant: "error",
					title: "Review failed",
					description: error.message || "Unable to review payment.",
				});
			},
		}),
	);
	const createPaymentLink = useMutation(
		trpc.sales.createPaymentLink.mutationOptions({
			onSuccess(result) {
				setPaymentLink(result);
				setPaymentLinkOpen(true);
			},
			onError(error) {
				toast({
					duration: 3000,
					variant: "error",
					title: "Link not created",
					description: error.message || "Unable to create payment link.",
				});
			},
		}),
	);
	const isPaymentReviewMode = filters.paymentReview === "needs_review";

	return (
		<>
			{inventoryConfiguratorDialog}
			<PaymentLinkDialog
				open={paymentLinkOpen}
				onOpenChange={setPaymentLinkOpen}
				paymentLink={paymentLink}
			/>
			<div className="relative z-10 flex items-center justify-end gap-1">
				{!isPaymentReviewMode ? (
					<>
						<Button
							asChild
							variant="ghost"
							size="icon"
							className="size-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
						>
							<Link
								href={`/sales-book/edit-order/${item.slug}`}
								target="_blank"
								rel="noopener noreferrer"
								title="Edit"
								aria-label={`Edit ${item.orderId || item.slug}`}
								onClick={(event) => event.stopPropagation()}
							>
								<Icons.Edit className="size-4" />
								<span className="sr-only">Edit order</span>
							</Link>
						</Button>

						<Button
							variant="ghost"
							size="icon"
							className="size-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
							onClick={(event) => {
								event.stopPropagation();
								overviewQuery.open2(item.uuid, "sales");
							}}
						>
							<Icons.ArrowUpRight className="size-4" />
							<span className="sr-only">Open order</span>
						</Button>
					</>
				) : null}
				<SalesMenu
					id={item.id}
					slug={item.slug}
					type="order"
					orderNo={item.orderId}
					customerEmail={item.email}
					customerPhone={item.customerPhone}
					customerName={item.customerName}
					trigger={
						<Button
							variant="ghost"
							size="icon"
							className="size-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
							onClick={(event) => event.stopPropagation()}
						>
							<Icons.MoreHoriz className="size-4" />
							<span className="sr-only">More order actions</span>
						</Button>
					}
					contentClassName="min-w-56"
				>
					<SalesMenu.Item
						disabled={!item.id}
						onSelect={() => {
							void openSalesInventoryConfigurator(item.id);
						}}
					>
						<Icons.PackageOpen className="mr-2 size-4 text-muted-foreground/70" />
						Inventory
					</SalesMenu.Item>
					<SalesMenu.Item
						disabled={!item.id || createPaymentLink.isPending}
						onSelect={(event) => {
							event.preventDefault();
							createPaymentLink.mutate({ salesId: item.id });
						}}
					>
						<Icons.ExternalLink className="mr-2 size-4 text-muted-foreground/70" />
						Create Payment Link
					</SalesMenu.Item>
					{!isPaymentReviewMode ? (
						<SalesMenu.Item
							disabled={
								!item.latestPaymentReview || markPaymentReviewed.isPending
							}
							onSelect={(event) => {
								event.preventDefault();
								markPaymentReviewed.mutate({
									salesId: item.id,
									note: "Reviewed from sales orders action menu.",
								});
							}}
						>
							<Icons.CheckCircle className="mr-2 size-4 text-muted-foreground/70" />
							Mark Payment Reviewed
						</SalesMenu.Item>
					) : null}
					<SalesMenu.Separator />
					<SalesMenu.SalesEmailMenuItems />
					<SalesMenu.MarkAs />
					<SalesMenu.SalesPrintMenuItems />
					<SalesMenu.Copy />
					<SalesMenu.Move />
					<SalesMenu.Separator />
					<SalesMenu.Delete
						onDeleted={async () => {
							await Promise.all([
								queryClient.invalidateQueries({
									queryKey: trpc.sales.getOrders.infiniteQueryKey(),
								}),
								queryClient.invalidateQueries({
									queryKey: trpc.sales.getOrdersSummary.queryKey(),
								}),
							]);
						}}
					/>
				</SalesMenu>
				{isPaymentReviewMode ? (
					<Button
						disabled={
							!item.latestPaymentReview || markPaymentReviewed.isPending
						}
						size="sm"
						type="button"
						variant="default"
						onClick={(event) => {
							event.preventDefault();
							event.stopPropagation();
							markPaymentReviewed.mutate({
								salesId: item.id,
								note: "Reviewed from sales orders table.",
							});
						}}
					>
						Reviewed
					</Button>
				) : null}
			</div>
		</>
	);
}

function PaymentLinkDialog({
	open,
	onOpenChange,
	paymentLink,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	paymentLink: {
		url: string;
		orderId: string | null;
		amountDue: number;
	} | null;
}) {
	const copyLink = async () => {
		if (!paymentLink?.url) return;
		await navigator.clipboard.writeText(paymentLink.url);
		toast({
			duration: 2000,
			variant: "success",
			title: "Copied",
			description: "Payment link copied to clipboard.",
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Link created</DialogTitle>
				</DialogHeader>
				<div className="space-y-3">
					<div className="rounded-md border bg-muted/40 p-3">
						<p className="text-sm font-medium">
							{paymentLink?.orderId || "Order"} ·{" "}
							{formatCurrency.format(paymentLink?.amountDue || 0)}
						</p>
						<p className="mt-1 break-all font-mono text-xs text-muted-foreground">
							{paymentLink?.url}
						</p>
					</div>
				</div>
				<DialogFooter className="gap-2 sm:justify-between">
					<Button type="button" variant="outline" onClick={copyLink}>
						<Icons.Copy className="mr-2 size-4" />
						Copy
					</Button>
					<Button asChild type="button">
						<a
							href={paymentLink?.url || "#"}
							target="_blank"
							rel="noopener noreferrer"
						>
							<Icons.ExternalLink className="mr-2 size-4" />
							Click to open
						</a>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

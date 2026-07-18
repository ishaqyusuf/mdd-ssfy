"use client";

import { SalesPriorityBadge } from "@/components/sales-priority-control";
import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import { SalesPaymentProcessor } from "@/components/widgets/sales-payment-processor/sales-payment-processor";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { cn, formatCurrency } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import { useQueryClient } from "@gnd/ui/tanstack";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@gnd/ui/tooltip";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import {
	parseAsInteger,
	parseAsString,
	parseAsStringEnum,
	useQueryStates,
} from "nuqs";
import { useRef, useState } from "react";

import { QuoteRowActionsMenu } from "./row-actions-menu";

export type SalesQuote = RouterOutputs["sales"]["quotes"]["data"][number];

type Column = ColumnDef<SalesQuote>;

function DealerSaleBadge({ item }: { item: SalesQuote }) {
	if (!(item as SalesQuote & { isDealerSale?: boolean }).isDealerSale)
		return null;

	return (
		<Badge
			variant="outline"
			className="rounded-full border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-cyan-700"
		>
			Dealer
		</Badge>
	);
}

function getInvoiceStatusLabel(item: SalesQuote) {
	if (item.invoice.pending <= 0) return "Paid";
	if (item.invoice.pending >= item.invoice.total) return "Open";
	return "Part paid";
}

function getInvoiceToneClass(item: SalesQuote) {
	if (item.invoice.pending <= 0) {
		return "border-emerald-200 bg-emerald-50 text-emerald-700";
	}
	if (item.invoice.pending >= item.invoice.total) {
		return "border-slate-200 bg-slate-50 text-slate-700";
	}
	return "border-amber-200 bg-amber-50 text-amber-700";
}

const selectColumn: Column = {
	id: "select",
	...sizes.custom(50, 50),
	enableResizing: false,
	enableHiding: false,
	enableSorting: false,
	meta: {
		sticky: true,
		skeleton: { type: "checkbox" },
		className: sizeClass(
			sizes.custom(50, 50),
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

const quoteIdColumn: Column = {
	id: "orderId",
	header: "Quote #",
	accessorKey: "orderId",
	...sizes.custom(150, 280, 180),
	enableResizing: true,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Quote #",
		sortField: "orderId",
		className: sizeClass(
			sizes.custom(150, 280, 180),
			"md:sticky md:left-[50px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
		),
	},
	cell: ({ row }) => (
		<div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
			<span className="truncate font-mono text-sm font-medium uppercase">
				{row.original.orderId}
			</span>
			<DealerSaleBadge item={row.original} />
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
		</div>
	),
};

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
	id: "displayName",
	header: "Customer",
	accessorKey: "displayName",
	...sizes.custom(180, 340, 220),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-36" },
		headerLabel: "Customer",
		className: sizeClass(sizes.custom(180, 340, 220)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className={cn(
				"max-w-full truncate font-medium uppercase",
				row.original.isBusiness && "text-blue-700",
			)}
			text={row.original.displayName || "-"}
		/>
	),
};

const phoneColumn: Column = {
	id: "customerPhone",
	header: "Phone",
	accessorKey: "customerPhone",
	...sizes.custom(112, 170, 128),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Phone",
		className: sizeClass(sizes.custom(112, 170, 128)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate text-muted-foreground"
			text={row.original.customerPhone || "-"}
		/>
	),
};

const addressColumn: Column = {
	id: "address",
	header: "Address",
	accessorKey: "address",
	...sizes.custom(180, 360, 240),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-40" },
		headerLabel: "Address",
		className: sizeClass(sizes.custom(180, 360, 240)),
	},
	cell: ({ row }) => (
		<TextWithTooltip
			className="max-w-full truncate text-muted-foreground"
			text={row.original.address || "No address"}
		/>
	),
};

const invoiceColumn: Column = {
	id: "invoiceTotal",
	header: "Invoice",
	accessorFn: (row) => row.invoice.total,
	...sizes.custom(104, 160, 118),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Invoice",
		sortField: "grandTotal",
		className: sizeClass(sizes.custom(104, 160, 118), "text-right"),
	},
	cell: ({ row }) => <InvoiceCell item={row.original} />,
};

const statusColumn: Column = {
	id: "invoiceStatus",
	header: "Status",
	accessorFn: (row) => getInvoiceStatusLabel(row),
	...sizes.custom(104, 150, 116),
	enableResizing: true,
	meta: {
		skeleton: { type: "badge", width: "w-20" },
		headerLabel: "Status",
		className: sizeClass(sizes.custom(104, 150, 116)),
	},
	cell: ({ row }) => (
		<Badge
			variant="outline"
			className={cn(
				"rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase whitespace-nowrap",
				getInvoiceToneClass(row.original),
			)}
		>
			{getInvoiceStatusLabel(row.original)}
		</Badge>
	),
};

const salesRepColumn: Column = {
	id: "salesRepInitial",
	header: "Sales rep",
	accessorKey: "salesRepInitial",
	...sizes.custom(86, 130, 96),
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-16" },
		headerLabel: "Sales rep",
		className: sizeClass(sizes.custom(86, 130, 96)),
	},
	cell: ({ row }) => (
		<span className="truncate text-muted-foreground">
			{row.original.salesRepInitial || "-"}
		</span>
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
	quoteIdColumn,
	salesDateColumn,
	customerColumn,
	phoneColumn,
	addressColumn,
	invoiceColumn,
	statusColumn,
	salesRepColumn,
	actionsColumn,
];

function InvoiceCell({ item }: { item: SalesQuote }) {
	const [opened, setOpened] = useState(false);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const pending = item.invoice.pending;
	const total = item.invoice.total;
	const paid = Math.max(total - pending, 0);
	const hasPendingBalance = pending > 0;

	if (!hasPendingBalance) {
		return (
			<span className="block truncate text-right font-mono font-medium text-emerald-600">
				{formatCurrency.format(total)}
			</span>
		);
	}

	return (
		<div className="relative z-10 text-right">
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
							className="block w-full truncate text-right font-mono font-medium text-amber-700"
							onClick={(event) => {
								event.preventDefault();
								event.stopPropagation();
							}}
						>
							{formatCurrency.format(total)}
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
							<InvoiceBreakdownLine label="Pending" value={pending} />
							<InvoiceBreakdownLine label="Paid" value={paid} />
							<InvoiceBreakdownLine label="Total" value={total} />
						</div>
						<Button
							className="w-full"
							disabled={!pending}
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
		</div>
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

function QuotePreviewAction({ item }: { item: SalesQuote }) {
	const requestRef = useRef(0);
	const [, setParams] = useQueryStates({
		salesPreviewId: parseAsInteger,
		salesPreviewCustomerEmail: parseAsString,
		salesPreviewCustomerName: parseAsString,
		salesPreviewError: parseAsString,
		salesPreviewRequest: parseAsString,
		salesPreviewUrl: parseAsString,
		salesPreviewType: parseAsStringEnum(["order", "quote"]),
		previewMode: parseAsStringEnum(["quote"]),
		dispatchId: parseAsInteger,
	});

	const preview = async () => {
		if (!item.id) return;

		requestRef.current += 1;
		const requestId = `${Date.now()}-${requestRef.current}`;

		setParams({
			salesPreviewId: item.id,
			salesPreviewCustomerEmail: item.email ?? null,
			salesPreviewCustomerName: item.displayName ?? null,
			salesPreviewType: "quote",
			salesPreviewRequest: requestId,
			salesPreviewUrl: null,
			salesPreviewError: null,
			previewMode: "quote",
			dispatchId: null,
		});

		try {
			const { prepareSalesHtmlPreview } = await import(
				"@/modules/sales-print/application/sales-print-service"
			);
			const previewUrl = await prepareSalesHtmlPreview({
				salesIds: [item.id],
				mode: "quote",
				dispatchId: null,
			});

			if (!isCurrentPreviewRequest(requestId)) return;

			setParams({
				salesPreviewUrl: previewUrl,
				salesPreviewError: null,
			});
		} catch {
			if (!isCurrentPreviewRequest(requestId)) return;

			setParams({
				salesPreviewError: "Unable to prepare this preview.",
			});
		}
	};

	return (
		<Button
			type="button"
			size="icon"
			variant="ghost"
			className="size-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
			title="Preview"
			aria-label={`Preview ${item.orderId || item.slug}`}
			onClick={(event) => {
				event.preventDefault();
				event.stopPropagation();
				void preview();
			}}
		>
			<Icons.Eye className="size-4" />
			<span className="sr-only">Preview quote</span>
		</Button>
	);
}

function isCurrentPreviewRequest(requestId: string) {
	if (typeof window === "undefined") return true;

	return (
		new URLSearchParams(window.location.search).get("salesPreviewRequest") ===
		requestId
	);
}

function ActionCell({ item }: { item: SalesQuote }) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const overviewQuery = useSalesOverviewQuery();
	const [open, setOpen] = useState(false);
	const [loaded, setLoaded] = useState(false);

	return (
		<div className="relative z-10 flex items-center justify-end gap-1">
			<Button
				asChild
				variant="ghost"
				size="icon"
				className="size-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
			>
				<Link
					href={`/sales-book/edit-quote/${item.slug}`}
					target="_blank"
					rel="noopener noreferrer"
					title="Edit"
					aria-label={`Edit ${item.orderId || item.slug}`}
					onClick={(event) => event.stopPropagation()}
				>
					<Icons.Edit className="size-4" />
					<span className="sr-only">Edit quote</span>
				</Link>
			</Button>

			<Button
				variant="ghost"
				size="icon"
				className="size-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
				onClick={(event) => {
					event.stopPropagation();
					overviewQuery.open2(item.uuid, "quote");
				}}
			>
				<Icons.ArrowUpRight className="size-4" />
				<span className="sr-only">Open quote</span>
			</Button>

			<QuotePreviewAction item={item} />

			{loaded ? (
				<QuoteRowActionsMenu
					item={item}
					open={open}
					onOpenChange={setOpen}
					onDeleted={async () => {
						await queryClient.invalidateQueries({
							queryKey: trpc.sales.quotes.infiniteQueryKey(),
						});
					}}
				/>
			) : (
				<Button
					size="icon"
					variant="ghost"
					className="size-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
					onClick={(event) => {
						event.preventDefault();
						event.stopPropagation();
						setLoaded(true);
						setOpen(true);
					}}
				>
					<Icons.MoreHoriz className="size-4" />
					<span className="sr-only">More quote actions</span>
				</Button>
			)}
		</div>
	);
}

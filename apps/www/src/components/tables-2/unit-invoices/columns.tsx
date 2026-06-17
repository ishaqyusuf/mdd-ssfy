"use client";

import Money from "@/components/_v1/money";
import { useUnitInvoiceParams } from "@/hooks/use-unit-invoice-params";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { Menu } from "@gnd/ui/custom/menu";
import { Progress } from "@gnd/ui/custom/progress";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import { formatDate } from "@gnd/utils/dayjs";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

export type UnitInvoiceRow =
	RouterOutputs["community"]["getUnitInvoices"]["data"][number];

type Column = ColumnDef<UnitInvoiceRow>;

export function getUnitInvoiceRowId(item: UnitInvoiceRow) {
	return String(item.id);
}

function getStatusTone(status?: string | null) {
	switch ((status || "").toLowerCase()) {
		case "completed":
			return "bg-emerald-100 text-emerald-700";
		case "started":
			return "bg-amber-100 text-amber-700";
		case "queued":
			return "bg-sky-100 text-sky-700";
		default:
			return "bg-slate-100 text-slate-600";
	}
}

const dateColumn: Column = {
	id: "date",
	header: "Date",
	accessorFn: (row) => row.createdAt,
	size: 150,
	minSize: 130,
	maxSize: 190,
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-24" },
		headerLabel: "Date",
		sortField: "date",
		className: "w-[150px] min-w-[130px]",
	},
	cell: ({ row }) => (
		<span className="font-mono text-sm">
			{formatDate(row.original.createdAt)}
		</span>
	),
};

const projectColumn: Column = {
	id: "project",
	header: "Project",
	accessorFn: (row) => row.project?.title,
	size: 300,
	minSize: 220,
	maxSize: 420,
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-44" },
		headerLabel: "Project",
		sortField: "project",
		className: "w-[300px] min-w-[220px]",
	},
	cell: ({ row }) => {
		const project = row.original.project;

		if (!project?.slug) {
			return (
				<div className="min-w-0 space-y-1">
					<TextWithTooltip
						className="max-w-full truncate font-medium"
						text={project?.title || "No project"}
					/>
					<p className="truncate text-xs text-muted-foreground">
						{project?.builder?.name || "No builder"}
					</p>
				</div>
			);
		}

		return (
			<Link
				href={`/community/project/${project.slug}`}
				className="min-w-0 space-y-1"
				onClick={(event) => event.stopPropagation()}
			>
				<TextWithTooltip
					className="max-w-full truncate font-medium"
					text={project.title || "No project"}
				/>
				<p className="truncate text-xs text-muted-foreground">
					{project.builder?.name || "No builder"}
				</p>
			</Link>
		);
	},
};

const unitColumn: Column = {
	id: "lotBlock",
	header: "Unit",
	accessorFn: (row) => row.lotBlock,
	size: 280,
	minSize: 220,
	maxSize: 380,
	enableResizing: true,
	enableHiding: false,
	meta: {
		sticky: true,
		skeleton: { type: "text", width: "w-36" },
		headerLabel: "Unit",
		sortField: "lotBlock",
		className:
			"w-[280px] min-w-[220px] md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
	},
	cell: ({ row }) => {
		const item = row.original;

		return (
			<div className="flex min-w-0 items-center gap-3 overflow-hidden">
				<div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
					<Icons.ReceiptText className="size-4" />
				</div>
				<div className="min-w-0 space-y-1">
					<TextWithTooltip
						className="max-w-full truncate font-semibold"
						text={item.lotBlock || "No unit"}
					/>
					<TextWithTooltip
						className="max-w-full truncate text-xs text-muted-foreground"
						text={item.modelName || "No model"}
					/>
				</div>
			</div>
		);
	},
};

const statusColumn: Column = {
	id: "status",
	header: "Status",
	accessorFn: (row) =>
		row.jobCount ? "Installed" : row.production?.status || "Idle",
	size: 170,
	minSize: 140,
	maxSize: 220,
	enableResizing: true,
	meta: {
		skeleton: { type: "badge" },
		headerLabel: "Status",
		className: "w-[170px] min-w-[140px]",
	},
	cell: ({ row }) => {
		const item = row.original;

		return (
			<div className="w-full max-w-[150px]">
				<Progress>
					<Progress.Status>
						{item.jobCount ? "Installed" : `Prod. ${item.production?.status}`}
					</Progress.Status>
				</Progress>
				<p className="mt-1 truncate text-xs text-muted-foreground">
					{item.production?.date || `${item.jobCount} submissions`}
				</p>
			</div>
		);
	},
};

const invoiceColumn: Column = {
	id: "invoice",
	header: "Invoice",
	accessorFn: (row) => row.invoice?.due ?? 0,
	size: 160,
	minSize: 140,
	maxSize: 210,
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-20" },
		headerLabel: "Invoice",
		className: "w-[160px] min-w-[140px] text-right",
	},
	cell: ({ row }) => {
		const invoice = row.original.invoice;

		return (
			<div className="flex flex-col items-end gap-0.5 text-sm">
				<Money className="text-orange-600" value={invoice?.due} />
				<Money className="text-emerald-600" value={invoice?.paid} />
				{!!invoice?.chargeBack && invoice.chargeBack < 0 ? (
					<Money className="text-red-600" value={invoice.chargeBack} />
				) : null}
			</div>
		);
	},
};

const invoiceTasksColumn: Column = {
	id: "invoiceTasks",
	header: "Tasks",
	accessorFn: (row) => row.invoiceTaskCount || 0,
	size: 110,
	minSize: 90,
	maxSize: 140,
	enableResizing: true,
	meta: {
		skeleton: { type: "text", width: "w-10" },
		headerLabel: "Tasks",
		className: "w-[110px] min-w-[90px]",
	},
	cell: ({ row }) => (
		<span className="font-mono text-sm">
			{row.original.invoiceTaskCount || 0}
		</span>
	),
};

const actionsColumn: Column = {
	id: "actions",
	header: "",
	size: 96,
	minSize: 84,
	maxSize: 120,
	enableResizing: false,
	enableHiding: false,
	meta: {
		actionCell: true,
		preventDefault: true,
		headerLabel: "Actions",
		skeleton: { type: "button", width: "w-16" },
		className: "w-[96px] min-w-[84px]",
	},
	cell: ({ row }) => <Actions item={row.original} />,
};

export const columns: Column[] = [
	unitColumn,
	projectColumn,
	dateColumn,
	statusColumn,
	invoiceColumn,
	invoiceTasksColumn,
	actionsColumn,
];

export const projectTabColumns: Column[] = [
	unitColumn,
	dateColumn,
	statusColumn,
	invoiceColumn,
	invoiceTasksColumn,
	actionsColumn,
];

function Actions({ item }: { item: UnitInvoiceRow }) {
	const { setParams } = useUnitInvoiceParams();

	const openInvoice = () => {
		setParams({
			editUnitInvoiceId: item.id,
		});
	};

	return (
		<div className="relative z-10 flex items-center justify-end gap-2">
			<Button
				type="button"
				size="icon"
				variant="ghost"
				className={cn("size-8")}
				onClick={(event) => {
					event.stopPropagation();
					openInvoice();
				}}
			>
				<Icons.FilePenLine className="size-4" />
			</Button>
			<Menu>
				<Menu.Item
					icon="edit"
					onClick={(event) => {
						event.stopPropagation();
						openInvoice();
					}}
				>
					Edit Invoice
				</Menu.Item>
			</Menu>
		</div>
	);
}

export function UnitInvoiceCard({ item }: { item: UnitInvoiceRow }) {
	const { setParams } = useUnitInvoiceParams();

	return (
		<div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
			<div className="flex items-start gap-3">
				<button
					type="button"
					className="min-w-0 flex-1 text-left"
					onClick={() => {
						setParams({
							editUnitInvoiceId: item.id,
						});
					}}
				>
					<div className="flex items-center gap-2">
						<div className="rounded-md bg-emerald-50 p-2 text-emerald-700">
							<Icons.ReceiptText className="size-4" />
						</div>
						<div className="min-w-0">
							<p className="truncate text-base font-semibold text-slate-900">
								{item.lotBlock}
							</p>
							<p className="truncate text-sm text-slate-600">
								{item.modelName}
							</p>
						</div>
					</div>
				</button>
				<Actions item={item} />
			</div>

			<div className="mt-4 rounded-md bg-slate-50 px-3 py-3">
				<p className="text-xs font-semibold uppercase text-muted-foreground">
					Project
				</p>
				<p className="mt-1 text-sm font-semibold text-slate-900">
					{item.project?.title}
				</p>
				<p className="text-xs text-muted-foreground">
					{item.project?.builder?.name}
				</p>
			</div>

			<div className="mt-3 grid grid-cols-2 gap-2">
				<div className="rounded-md border border-slate-200 px-3 py-3">
					<p className="text-xs font-semibold uppercase text-muted-foreground">
						Status
					</p>
					<span
						className={cn(
							"mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
							getStatusTone(
								item.jobCount ? "completed" : item.production?.status,
							),
						)}
					>
						{item.jobCount ? "Installed" : item.production?.status || "Idle"}
					</span>
					<p className="mt-2 text-xs text-muted-foreground">
						{item.production?.date || `${item.jobCount} submissions`}
					</p>
				</div>
				<div className="rounded-md border border-slate-200 px-3 py-3">
					<p className="text-xs font-semibold uppercase text-muted-foreground">
						Updated
					</p>
					<p className="mt-2 text-sm font-semibold text-slate-900">
						{formatDate(item.createdAt)}
					</p>
					<p className="mt-1 text-xs text-muted-foreground">
						{item.invoiceTaskCount || 0} invoice tasks
					</p>
				</div>
			</div>

			<div className="mt-3 grid grid-cols-2 gap-2">
				<div className="rounded-md bg-orange-50 px-3 py-3">
					<p className="text-xs font-semibold uppercase text-orange-700/80">
						Total Due
					</p>
					<Money
						className="mt-2 text-lg font-semibold text-orange-700"
						value={item.invoice?.due}
					/>
				</div>
				<div className="rounded-md bg-emerald-50 px-3 py-3">
					<p className="text-xs font-semibold uppercase text-emerald-700/80">
						Total Paid
					</p>
					<Money
						className="mt-2 text-lg font-semibold text-emerald-700"
						value={item.invoice?.paid}
					/>
				</div>
			</div>

			<Button
				type="button"
				className="mt-4 w-full"
				onClick={() => {
					setParams({
						editUnitInvoiceId: item.id,
					});
				}}
			>
				Open Invoice
			</Button>
		</div>
	);
}

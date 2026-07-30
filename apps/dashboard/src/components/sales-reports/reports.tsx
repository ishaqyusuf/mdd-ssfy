"use client";

import { useAuth } from "@/hooks/use-auth";
import { useSalesDashboardParams } from "@/hooks/use-sales-dashboard-params";
import { downloadSalesPerformanceExcel } from "@/lib/sales-performance-export";
import { useTRPC } from "@/trpc/client";
import type { RouterInputs } from "@api/trpc/routers/_app";
import type {
	SalesPerformanceReportType,
	SalesPerformanceWorkbookReport,
} from "@gnd/sales/performance-reports";
import { Button } from "@gnd/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import {
	Boxes,
	Building2,
	ChevronDown,
	ClipboardList,
	FileSpreadsheet,
	FileText,
	Loader2,
	Users,
	WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export const salesPerformanceReportItems = [
	{
		type: "performance-summary",
		title: "Sales performance summary",
		description: "KPIs, trend, channels, reps, and source orders.",
		Icon: FileSpreadsheet,
	},
	{
		type: "orders-ledger",
		title: "Orders ledger",
		description: "Every filtered order with ownership and booked value.",
		Icon: ClipboardList,
	},
	{
		type: "sales-reps",
		title: "Sales by representative",
		description: "Rep totals, order volume, AOV, and source orders.",
		Icon: Users,
	},
	{
		type: "products",
		title: "Product performance",
		description: "Product quantities, order coverage, and booked sales.",
		Icon: Boxes,
	},
	{
		type: "quote-activity",
		title: "Quote activity",
		description: "Quote value, customer, owner, status, and expiration.",
		Icon: FileText,
	},
	{
		type: "customers",
		title: "Sales by customer",
		description: "Customer totals, order volume, AOV, and source orders.",
		Icon: Building2,
	},
] satisfies Array<{
	type: SalesPerformanceReportType;
	title: string;
	description: string;
	Icon: typeof FileSpreadsheet;
}>;

export function useSalesPerformanceReportMenuState() {
	const auth = useAuth();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { params } = useSalesDashboardParams();
	const [pendingType, setPendingType] =
		useState<SalesPerformanceReportType | null>(null);

	async function downloadReport(reportType: SalesPerformanceReportType) {
		try {
			setPendingType(reportType);
			toast({ variant: "spinner", title: "Preparing Excel report..." });

			const input = {
				from: params.from,
				to: params.to,
				salesRepIds: params.salesRepIds,
				salesChannels: params.salesChannels,
				reportType,
			} satisfies RouterInputs["salesDashboard"]["report"];
			const report = (await queryClient.fetchQuery(
				trpc.salesDashboard.report.queryOptions(input),
			)) as unknown as SalesPerformanceWorkbookReport;

			if (report.rowCount === 0) {
				toast({
					variant: "error",
					title: "No report rows",
					description: "No sales records match the active period and filters.",
				});
				return;
			}

			await downloadSalesPerformanceExcel(report);
			toast({
				title: "Excel report downloaded",
				description: `${report.title} includes ${report.rowCount.toLocaleString()} source record${report.rowCount === 1 ? "" : "s"}.`,
			});
		} catch (error) {
			console.error(error);
			toast({
				variant: "error",
				title: "Unable to generate report",
				description:
					error instanceof Error
						? error.message
						: "Please narrow the period or filters and try again.",
			});
		} finally {
			setPendingType(null);
		}
	}

	return {
		canGenerate: Boolean(auth.can?.generateSalesPerformanceReport),
		downloadReport,
		pendingType,
	};
}

export type SalesPerformanceReportMenuState = ReturnType<
	typeof useSalesPerformanceReportMenuState
>;

export function SalesPerformanceReportMenuItems({
	state,
}: {
	state: SalesPerformanceReportMenuState;
}) {
	if (!state.canGenerate) return null;

	return salesPerformanceReportItems.map(
		({ type, title, description, Icon }) => (
			<DropdownMenuItem
				className="items-start gap-3 py-2.5"
				disabled={state.pendingType !== null}
				key={type}
				onSelect={() => void state.downloadReport(type)}
			>
				<Icon className="mt-0.5 size-4 shrink-0" />
				<span className="min-w-0">
					<span className="block font-medium">{title}</span>
					<span className="mt-0.5 block text-xs text-muted-foreground">
						{description}
					</span>
				</span>
			</DropdownMenuItem>
		),
	);
}

export function SalesPerformanceReports() {
	const state = useSalesPerformanceReportMenuState();

	if (!state.canGenerate) return null;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					aria-label={
						state.pendingType ? "Preparing sales report" : "Sales reports"
					}
					className="h-9 gap-2"
					disabled={state.pendingType !== null}
					type="button"
					variant="outline"
				>
					{state.pendingType ? (
						<Loader2 className="size-4 animate-spin" />
					) : (
						<FileSpreadsheet className="size-4" />
					)}
					<span className="hidden sm:inline">
						{state.pendingType ? "Preparing" : "Reports"}
					</span>
					<ChevronDown className="size-3.5" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				className="w-[min(20rem,calc(100vw-2rem))]"
			>
				<DropdownMenuLabel>
					<p>Sales Excel reports</p>
					<p className="mt-1 text-xs font-normal text-muted-foreground">
						Each workbook uses the active reporting period and filters.
					</p>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<SalesPerformanceReportMenuItems state={state} />
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<Link className="gap-3" href="/sales-book/finance">
						<WalletCards className="size-4 shrink-0" />
						<span>
							<span className="block font-medium">Sales Finance reports</span>
							<span className="mt-0.5 block text-xs text-muted-foreground">
								Payments, applications, refunds, and receivables.
							</span>
						</span>
					</Link>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

"use client";

import { useAuth } from "@/hooks/use-auth";
import { useSalesFinanceFilterParams } from "@/hooks/use-sales-finance-filter-params";
import { downloadSalesFinanceExcel } from "@/lib/sales-finance-export";
import { useTRPC } from "@/trpc/client";
import type { RouterInputs } from "@api/trpc/routers/_app";
import type {
	SalesFinanceReceivableReportType,
	SalesFinanceWorkbookReport,
} from "@gnd/sales/payment-system";
import { Button } from "@gnd/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Icons } from "@gnd/ui/icons";
import { useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { useState } from "react";

const reportItems = [
	{
		type: "receivables-aging",
		title: "Receivables aging",
		description: "Every filtered invoice split into current and overdue aging.",
		Icon: Icons.accounting,
	},
	{
		type: "receivables-customers",
		title: "Balances by customer",
		description: "Customer totals by aging bucket with source invoice detail.",
		Icon: Icons.customers,
	},
] satisfies Array<{
	type: SalesFinanceReceivableReportType;
	title: string;
	description: string;
	Icon: typeof Icons.accounting;
}>;

export function SalesFinanceReceivablesReports() {
	const auth = useAuth();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { receivableFilters } = useSalesFinanceFilterParams();
	const [pendingType, setPendingType] =
		useState<SalesFinanceReceivableReportType | null>(null);

	if (!auth.can?.generateSalesPaymentReport) {
		return null;
	}

	async function downloadReport(reportType: SalesFinanceReceivableReportType) {
		try {
			setPendingType(reportType);
			toast({
				variant: "spinner",
				title: "Preparing Excel report...",
			});

			const input = {
				...receivableFilters,
				reportType,
			} as RouterInputs["salesFinance"]["receivablesReport"];
			const report = (await queryClient.fetchQuery(
				trpc.salesFinance.receivablesReport.queryOptions(input),
			)) as unknown as SalesFinanceWorkbookReport;

			if (report.rowCount === 0) {
				toast({
					variant: "error",
					title: "No report rows",
					description:
						"No receivables match the current filters for this report.",
				});
				return;
			}

			await downloadSalesFinanceExcel(report);
			toast({
				title: "Excel report downloaded",
				description: `${report.title} includes ${report.rowCount.toLocaleString()} invoice${report.rowCount === 1 ? "" : "s"}.`,
			});
		} catch (error) {
			console.error(error);
			toast({
				variant: "error",
				title: "Unable to generate report",
				description:
					error instanceof Error
						? error.message
						: "Please narrow the filters and try again.",
			});
		} finally {
			setPendingType(null);
		}
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="h-8 gap-2"
					disabled={pendingType !== null}
				>
					{pendingType ? (
						<Icons.Loader2 className="size-4 animate-spin" />
					) : (
						<Icons.Export className="size-4" />
					)}
					<span className="hidden lg:inline">
						{pendingType ? "Preparing" : "Reports"}
					</span>
					<Icons.ChevronDown className="size-3.5" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-80">
				<DropdownMenuLabel>
					<p>Receivables Excel reports</p>
					<p className="mt-1 font-normal text-xs text-muted-foreground">
						Each workbook uses the active due-date, aging, and search filters.
					</p>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{reportItems.map(({ type, title, description, Icon }) => (
					<DropdownMenuItem
						key={type}
						disabled={pendingType !== null}
						className="items-start gap-3 py-2.5"
						onSelect={() => void downloadReport(type)}
					>
						<Icon className="mt-0.5 size-4 shrink-0" />
						<span className="min-w-0">
							<span className="block font-medium">{title}</span>
							<span className="mt-0.5 block text-xs text-muted-foreground">
								{description}
							</span>
						</span>
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

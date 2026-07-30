"use client";

import { useAuth } from "@/hooks/use-auth";
import { useSalesFinanceFilterParams } from "@/hooks/use-sales-finance-filter-params";
import { downloadSalesFinanceExcel } from "@/lib/sales-finance-export";
import { useTRPC } from "@/trpc/client";
import type { RouterInputs } from "@api/trpc/routers/_app";
import type {
	SalesFinanceReport,
	SalesFinanceReportType,
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
		type: "payments",
		title: "Payments ledger",
		description: "Every filtered receipt with money and invoice details.",
		Icon: Icons.Receipt,
	},
	{
		type: "payment-methods",
		title: "Collections by method",
		description: "Method totals with source payment detail.",
		Icon: Icons.CreditCardIcon,
	},
	{
		type: "applications",
		title: "Payment applications",
		description: "Applied, unapplied, and overapplied principal.",
		Icon: Icons.accounting,
	},
	{
		type: "exceptions",
		title: "Review exceptions",
		description: "Only payments that need finance attention.",
		Icon: Icons.AlertTriangle,
	},
	{
		type: "customers",
		title: "Collections by customer",
		description: "Customer totals with auditable source payments.",
		Icon: Icons.customers,
	},
] satisfies Array<{
	type: SalesFinanceReportType;
	title: string;
	description: string;
	Icon: typeof Icons.Receipt;
}>;

export function SalesFinanceReports() {
	const auth = useAuth();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { filters } = useSalesFinanceFilterParams();
	const [pendingType, setPendingType] = useState<SalesFinanceReportType | null>(
		null,
	);

	if (!auth.can?.generateSalesPaymentReport) {
		return null;
	}

	async function downloadReport(reportType: SalesFinanceReportType) {
		try {
			setPendingType(reportType);
			toast({
				variant: "spinner",
				title: "Preparing Excel report...",
			});

			const input = {
				...filters,
				reportType,
			} as RouterInputs["salesFinance"]["report"];
			const report = (await queryClient.fetchQuery(
				trpc.salesFinance.report.queryOptions(input),
			)) as unknown as SalesFinanceReport;

			if (report.rowCount === 0) {
				toast({
					variant: "error",
					title: "No report rows",
					description: "No payments match the current filters for this report.",
				});
				return;
			}

			await downloadSalesFinanceExcel(report);
			toast({
				title: "Excel report downloaded",
				description: `${report.title} includes ${report.rowCount.toLocaleString()} payment${report.rowCount === 1 ? "" : "s"}.`,
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
					<p>Finance Excel reports</p>
					<p className="mt-1 font-normal text-xs text-muted-foreground">
						Each workbook uses the active view and filters.
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

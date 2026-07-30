"use client";

import { useContractorAccountingFilterParams } from "@/hooks/use-contractor-accounting-filter-params";
import { hasContractorAccountingReportTrigger } from "@/lib/contractor-accounting-report-trigger";
import { useTRPC } from "@/trpc/client";
import type { RouterInputs } from "@api/trpc/routers/_app";
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
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { useEffect, useState } from "react";

type ReportInput = RouterInputs["contractorAccounting"]["generateReport"];
type ReportKind = ReportInput["kind"];

const reportItems = [
	{
		kind: "CONSOLIDATED",
		format: "XLSX",
		title: "Consolidated ledger",
		description: "Summary, contractor balances, and filtered entry detail.",
		Icon: Icons.accounting,
	},
	{
		kind: "CONTRACTOR_STATEMENT",
		format: "PDF",
		title: "Contractor statement",
		description: "Printable statement for the one selected contractor.",
		Icon: Icons.ReceiptText,
	},
	{
		kind: "AGING",
		format: "XLSX",
		title: "Liability aging",
		description: "Current, 30, 60, 90, and over-90-day balances.",
		Icon: Icons.Calendar,
	},
	{
		kind: "RECONCILIATION",
		format: "CSV",
		title: "Reconciliation register",
		description: "Reviewed differences and open accounting exceptions.",
		Icon: Icons.AlertTriangle,
	},
	{
		kind: "ADJUSTMENT_REGISTER",
		format: "XLSX",
		title: "Adjustment register",
		description: "Bonuses, expenses, deductions, and reversals.",
		Icon: Icons.List,
	},
	{
		kind: "TAX_READINESS",
		format: "CSV",
		title: "Tax readiness",
		description: "W-9 status, contractor identity, and period payouts.",
		Icon: Icons.File,
	},
] satisfies Array<{
	kind: ReportKind;
	format: ReportInput["format"];
	title: string;
	description: string;
	Icon: typeof Icons.accounting;
}>;

export function ContractorAccountingReports() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { filters, hasFilters } = useContractorAccountingFilterParams();
	const [activeRunId, setActiveRunId] = useState<string | null>(null);
	const [pendingKind, setPendingKind] = useState<ReportKind | null>(null);
	const runs = useQuery({
		...trpc.contractorAccounting.reportRuns.queryOptions(),
		enabled: Boolean(activeRunId),
		refetchInterval: activeRunId ? 1_500 : false,
	});
	const generate = useMutation(
		trpc.contractorAccounting.generateReport.mutationOptions({
			onSuccess(result) {
				setActiveRunId(result.run.id);
				void queryClient.invalidateQueries({
					queryKey: trpc.contractorAccounting.reportRuns.queryKey(),
				});
				toast({
					title: "Report queued",
					description:
						"The report uses the complete active filter snapshot and will download when ready.",
				});
			},
			onError(error) {
				setPendingKind(null);
				toast({
					variant: "error",
					title: "Unable to generate report",
					description: error.message,
				});
			},
		}),
	);

	useEffect(() => {
		if (!activeRunId) return;
		const run = runs.data?.find((item) => item.id === activeRunId);
		if (!run || run.status === "PENDING" || run.status === "RUNNING") return;
		setActiveRunId(null);
		setPendingKind(null);
		if (run.status === "COMPLETED" && run.outputUrl) {
			window.open(run.outputUrl, "_blank", "noopener,noreferrer");
			toast({
				title: "Report ready",
				description: "The generated report opened in a new tab.",
			});
			return;
		}
		toast({
			variant: "error",
			title: "Report failed",
			description: run.error || "The report job did not complete.",
		});
	}, [activeRunId, runs.data]);

	if (!hasContractorAccountingReportTrigger(hasFilters)) return null;

	const selectedContractorId =
		filters.contractorIds?.length === 1 ? filters.contractorIds[0] : undefined;

	function requestReport(item: (typeof reportItems)[number]) {
		setPendingKind(item.kind);
		const input = {
			...filters,
			kind: item.kind,
			format: item.format,
			contractorId:
				item.kind === "CONTRACTOR_STATEMENT" ? selectedContractorId : undefined,
		} as ReportInput;
		generate.mutate(input);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="h-8 gap-2"
					disabled={generate.isPending || Boolean(activeRunId)}
				>
					{pendingKind ? (
						<Icons.Loader2 className="size-4 animate-spin" />
					) : (
						<Icons.Export className="size-4" />
					)}
					<span className="hidden lg:inline">
						{pendingKind ? "Preparing" : "Report"}
					</span>
					<Icons.ChevronDown className="size-3.5" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-80">
				<DropdownMenuLabel>
					<p>Contractor accounting reports</p>
					<p className="mt-1 font-normal text-xs text-muted-foreground">
						Every report inherits the active search and filters.
					</p>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{reportItems.map((item) => {
					const disabled =
						item.kind === "CONTRACTOR_STATEMENT" && !selectedContractorId;
					return (
						<DropdownMenuItem
							key={item.kind}
							disabled={disabled || Boolean(pendingKind)}
							className="items-start gap-3 py-2.5"
							onSelect={() => requestReport(item)}
						>
							<item.Icon className="mt-0.5 size-4 shrink-0" />
							<span className="min-w-0">
								<span className="block font-medium">{item.title}</span>
								<span className="mt-0.5 block text-xs text-muted-foreground">
									{disabled
										? "Select exactly one contractor to enable this statement."
										: item.description}
								</span>
							</span>
						</DropdownMenuItem>
					);
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

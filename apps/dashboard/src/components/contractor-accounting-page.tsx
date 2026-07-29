"use client";

import { useContractorAccountingReportParams } from "@/hooks/use-contractor-accounting-report-params";
import { buildContractorAccountingExport } from "@/lib/contractor-accounting-export";
import { openLink } from "@/lib/open-link";
import { useTRPC } from "@/trpc/client";
import type { RouterInputs } from "@api/trpc/routers/_app";
import {
	formatMoneyCents,
	getContractorAdjustmentCents,
} from "@gnd/contractor-accounting";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@gnd/ui/card";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { Skeleton } from "@gnd/ui/skeleton";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import Link from "next/link";
import { useState } from "react";

type PeriodInput = Pick<
	RouterInputs["jobs"]["contractorPeriodReport"],
	"from" | "to" | "timezone"
>;

function currency(cents?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(formatMoneyCents(cents || 0)));
}

export function ContractorAccountingPage({
	initialPeriod,
}: {
	initialPeriod: PeriodInput;
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { filters, setFilters } = useContractorAccountingReportParams();
	const activePeriod = {
		from: filters.from || initialPeriod.from,
		to: filters.to || initialPeriod.to,
		timezone: filters.timezone || initialPeriod.timezone,
	};
	const [draftFrom, setDraftFrom] = useState(activePeriod.from);
	const [draftTo, setDraftTo] = useState(activePeriod.to);
	const [isExporting, setIsExporting] = useState(false);
	const printToken = useMutation(
		trpc.jobs.contractorAccountingPrintToken.mutationOptions(),
	);
	const { data, isPending } = useQuery(
		trpc.jobs.contractorPeriodReport.queryOptions({
			...activePeriod,
			includeEntries: false,
		}),
	);

	async function exportExcel() {
		setIsExporting(true);
		try {
			const report = await queryClient.fetchQuery(
				trpc.jobs.contractorPeriodReport.queryOptions({
					...activePeriod,
					includeEntries: true,
				}),
			);
			const exportData = buildContractorAccountingExport(report, activePeriod);
			const { utils, writeFile } = await import("xlsx-js-style");
			const workbook = utils.book_new();
			const summarySheet = utils.json_to_sheet(exportData.summaryRows);
			const contractorSheet = utils.json_to_sheet(exportData.contractorRows);
			const detailSheet = utils.json_to_sheet(exportData.entryRows);
			summarySheet["!cols"] = [{ wch: 24 }, { wch: 16 }];
			contractorSheet["!cols"] = [
				{ wch: 28 },
				...Array.from({ length: 11 }, () => ({ wch: 16 })),
			];
			detailSheet["!cols"] = [
				{ wch: 12 },
				{ wch: 28 },
				{ wch: 18 },
				{ wch: 38 },
				{ wch: 14 },
				{ wch: 14 },
				{ wch: 24 },
				{ wch: 12 },
				{ wch: 12 },
			];
			for (const sheet of [summarySheet, contractorSheet, detailSheet]) {
				if (sheet["!ref"]) {
					sheet["!autofilter"] = { ref: sheet["!ref"] };
					sheet["!freeze"] = { xSplit: 0, ySplit: 1 };
				}
			}
			utils.book_append_sheet(workbook, summarySheet, "Summary");
			utils.book_append_sheet(workbook, contractorSheet, "Contractors");
			utils.book_append_sheet(workbook, detailSheet, "Transactions");
			writeFile(workbook, exportData.filename);
			toast.success("Contractor accounting report exported.");
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Unable to export contractor accounting report.",
			);
		} finally {
			setIsExporting(false);
		}
	}

	async function printPdf() {
		try {
			const result = await printToken.mutateAsync(activePeriod);
			openLink(
				"p/contractor-accounting",
				{ token: result.token, preview: true },
				true,
			);
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Unable to prepare contractor accounting PDF.",
			);
		}
	}

	return (
		<div className="flex flex-col gap-6 pb-8 pt-2">
			<section className="relative overflow-hidden rounded-3xl border bg-card">
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_34%),radial-gradient(circle_at_bottom_right,hsl(var(--accent)/0.16),transparent_32%)]" />
				<div className="relative grid gap-6 p-6 md:p-8 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
					<div className="max-w-3xl">
						<Badge variant="secondary" className="mb-3">
							Contractor payables
						</Badge>
						<h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
							Contractor accounting
						</h1>
						<p className="mt-2 text-sm text-muted-foreground md:text-base">
							Review earned work, deductions, payouts, reversals, and closing
							contractor liability for an exact accounting period.
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<Button asChild variant="outline">
							<Link href="/contractors/jobs/payment-dashboard">
								<Icons.Wallet data-icon="inline-start" />
								Payment dashboard
							</Link>
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								void printPdf();
							}}
							disabled={isPending || printToken.isPending}
						>
							<Icons.Print data-icon="inline-start" />
							{printToken.isPending ? "Preparing…" : "Print / PDF"}
						</Button>
						<Button
							type="button"
							onClick={exportExcel}
							disabled={isPending || isExporting}
						>
							<Icons.Export data-icon="inline-start" />
							{isExporting ? "Preparing…" : "Export Excel"}
						</Button>
					</div>
				</div>
			</section>

			<Card className="rounded-3xl">
				<CardHeader>
					<CardTitle>Report period</CardTitle>
					<CardDescription>
						Dates are inclusive in {activePeriod.timezone}. For example, January
						1 through August 31 includes the full August 31 business day.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form
						className="grid gap-4 md:grid-cols-[minmax(180px,240px)_minmax(180px,240px)_auto] md:items-end"
						onSubmit={(event) => {
							event.preventDefault();
							void setFilters({
								from: draftFrom,
								to: draftTo,
								timezone: activePeriod.timezone,
							});
						}}
					>
						<div className="grid gap-2">
							<Label htmlFor="contractor-report-from">From</Label>
							<Input
								id="contractor-report-from"
								type="date"
								value={draftFrom}
								max={draftTo}
								onChange={(event) => setDraftFrom(event.target.value)}
								required
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="contractor-report-to">To</Label>
							<Input
								id="contractor-report-to"
								type="date"
								value={draftTo}
								min={draftFrom}
								onChange={(event) => setDraftTo(event.target.value)}
								required
							/>
						</div>
						<Button type="submit">
							<Icons.Calendar data-icon="inline-start" />
							Generate report
						</Button>
					</form>
				</CardContent>
			</Card>

			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				<MetricCard
					label="Opening balance"
					value={currency(data?.summary.openingBalanceCents)}
					icon={Icons.Wallet}
					isPending={isPending}
				/>
				<MetricCard
					label="Earned"
					value={currency(data?.summary.earnedCents)}
					icon={Icons.TrendingUp}
					isPending={isPending}
				/>
				<MetricCard
					label="Paid"
					value={currency(data?.summary.payoutCents)}
					icon={Icons.CreditCard}
					isPending={isPending}
				/>
				<MetricCard
					label="Closing balance"
					value={currency(data?.summary.closingBalanceCents)}
					icon={Icons.ReceiptText}
					isPending={isPending}
				/>
			</div>

			<div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_360px]">
				<Card className="min-w-0 rounded-3xl">
					<CardHeader>
						<CardTitle>Contractor balances</CardTitle>
						<CardDescription>
							Opening balance plus period activity equals each closing balance.
						</CardDescription>
					</CardHeader>
					<CardContent className="overflow-x-auto p-0">
						<table className="w-full min-w-[840px] text-sm">
							<thead className="border-y bg-muted/35 text-left text-xs uppercase tracking-wide text-muted-foreground">
								<tr>
									<th className="px-6 py-3 font-medium">Contractor</th>
									<th className="px-4 py-3 text-right font-medium">Opening</th>
									<th className="px-4 py-3 text-right font-medium">Earned</th>
									<th className="px-4 py-3 text-right font-medium">
										Adjustments
									</th>
									<th className="px-4 py-3 text-right font-medium">Paid</th>
									<th className="px-6 py-3 text-right font-medium">Closing</th>
								</tr>
							</thead>
							<tbody>
								{isPending ? (
									[
										"contractor-skeleton-1",
										"contractor-skeleton-2",
										"contractor-skeleton-3",
										"contractor-skeleton-4",
									].map((skeletonId) => (
										<tr key={skeletonId} className="border-b">
											<td className="px-6 py-4" colSpan={6}>
												<Skeleton className="h-6 w-full" />
											</td>
										</tr>
									))
								) : data?.contractors.length ? (
									data.contractors.map((contractor) => {
										const adjustments =
											getContractorAdjustmentCents(contractor);
										return (
											<tr key={contractor.contractorId} className="border-b">
												<td className="px-6 py-4">
													<p className="font-medium">
														{contractor.contractorName}
													</p>
													<p className="text-xs text-muted-foreground">
														{contractor.jobCount} jobs ·{" "}
														{contractor.payoutCount} payouts
													</p>
												</td>
												<td className="px-4 py-4 text-right tabular-nums">
													{currency(contractor.openingBalanceCents)}
												</td>
												<td className="px-4 py-4 text-right tabular-nums">
													{currency(contractor.earnedCents)}
												</td>
												<td className="px-4 py-4 text-right tabular-nums">
													{currency(adjustments)}
												</td>
												<td className="px-4 py-4 text-right tabular-nums">
													{currency(contractor.payoutCents)}
												</td>
												<td className="px-6 py-4 text-right font-semibold tabular-nums">
													{currency(contractor.closingBalanceCents)}
												</td>
											</tr>
										);
									})
								) : (
									<tr>
										<td
											colSpan={6}
											className="px-6 py-12 text-center text-muted-foreground"
										>
											No contractor accounting activity was found for this
											period.
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</CardContent>
				</Card>

				<Card className="rounded-3xl">
					<CardHeader>
						<CardTitle>Period reconciliation</CardTitle>
						<CardDescription>
							The components used to calculate closing contractor liability.
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-3">
						<ReconciliationRow
							label="Opening balance"
							value={currency(data?.summary.openingBalanceCents)}
						/>
						<ReconciliationRow
							label="Jobs earned"
							value={currency(data?.summary.earnedCents)}
						/>
						<ReconciliationRow
							label="Bonuses + expenses"
							value={currency(
								(data?.summary.bonusCents || 0) +
									(data?.summary.expenseCents || 0),
							)}
						/>
						<ReconciliationRow
							label="Deductions"
							value={`− ${currency(data?.summary.deductionCents)}`}
						/>
						<ReconciliationRow
							label="Payouts"
							value={`− ${currency(data?.summary.payoutCents)}`}
						/>
						<ReconciliationRow
							label="Reversals"
							value={currency(data?.summary.reversalCents)}
						/>
						<div className="h-px bg-border" />
						<ReconciliationRow
							label="Closing balance"
							value={currency(data?.summary.closingBalanceCents)}
							emphasis
						/>
						<div className="rounded-xl border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
							<p className="font-medium text-foreground">Data quality</p>
							<p>
								{data?.dataQuality.legacyJobDateFallbackCount || 0} period job
								{data?.dataQuality.legacyJobDateFallbackCount === 1 ? "" : "s"}{" "}
								use a legacy status or creation date because no approval date
								was recorded.
							</p>
							<p>
								{data?.dataQuality.missingPayoutDateCount || 0} payout
								{data?.dataQuality.missingPayoutDateCount === 1 ? "" : "s"} are
								quarantined because no transaction date was recorded.
							</p>
							<p>
								Summary-to-contractor cross-foot difference:{" "}
								{currency(data?.dataQuality.reconciliationDifferenceCents)}
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

function MetricCard({
	label,
	value,
	icon: Icon,
	isPending,
}: {
	label: string;
	value: string;
	icon: typeof Icons.Wallet;
	isPending: boolean;
}) {
	return (
		<Card className="rounded-2xl">
			<CardContent className="p-5">
				<div className="flex items-center justify-between gap-3">
					<p className="text-sm text-muted-foreground">{label}</p>
					<Icon className="size-4 text-muted-foreground" />
				</div>
				{isPending ? (
					<Skeleton className="mt-3 h-8 w-28" />
				) : (
					<p className="mt-3 text-2xl font-semibold tabular-nums">{value}</p>
				)}
			</CardContent>
		</Card>
	);
}

function ReconciliationRow({
	label,
	value,
	emphasis,
}: {
	label: string;
	value: string;
	emphasis?: boolean;
}) {
	return (
		<div className="flex items-center justify-between gap-4 text-sm">
			<span className="text-muted-foreground">{label}</span>
			<span className={emphasis ? "font-semibold" : "font-medium"}>
				{value}
			</span>
		</div>
	);
}

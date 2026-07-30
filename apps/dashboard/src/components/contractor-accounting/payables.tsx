"use client";

import { useContractorAccountingFilterParams } from "@/hooks/use-contractor-accounting-filter-params";
import { useTRPC } from "@/trpc/client";
import type { RouterInputs, RouterOutputs } from "@api/trpc/routers/_app";
import { formatMoneyCents } from "@gnd/contractor-accounting";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@gnd/ui/table";
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { ArrowUpRight, Eye, FilePlus2 } from "lucide-react";
import Link from "next/link";

type PayableRow =
	RouterOutputs["contractorAccounting"]["payables"]["data"][number];

const currency = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
});

function money(cents: number) {
	return currency.format(Number(formatMoneyCents(cents)));
}

function readinessLabel(value: PayableRow["readiness"]) {
	return {
		READY: "Ready",
		BLOCKED_RECONCILIATION: "Reconciliation",
		BLOCKED_TAX: "Tax profile",
		NOT_PAYABLE: "No balance",
	}[value];
}

export function ContractorPayablesWorkspace() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { filters, setParams } = useContractorAccountingFilterParams();
	const input = {
		...filters,
		includeEntries: false,
	} as RouterInputs["contractorAccounting"]["payables"];
	const { data } = useSuspenseQuery(
		trpc.contractorAccounting.payables.queryOptions(input),
	);
	const createDraft = useMutation(
		trpc.contractorAccounting.createPayoutRun.mutationOptions({
			async onSuccess() {
				toast({
					title: "Draft payout run created",
					description:
						"Review and mark it ready before handing it to Payment Portal.",
				});
				await queryClient.invalidateQueries({
					queryKey: trpc.contractorAccounting.payoutRuns.queryKey(),
				});
				void setParams({ managePayoutRuns: true });
			},
			onError(error) {
				toast({
					variant: "error",
					title: "Draft payout run not created",
					description: error.message,
				});
			},
		}),
	);

	return (
		<>
			<section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				{[
					["Total payable", money(data.summary.totalPayableCents)],
					["Ready contractors", data.summary.readyCount.toLocaleString()],
					["Blocked contractors", data.summary.blockedCount.toLocaleString()],
					["Over 90 days", money(data.summary.over90DaysCents)],
				].map(([label, value]) => (
					<div key={label} className="rounded-xl border bg-card p-4 shadow-sm">
						<p className="text-xs font-medium text-muted-foreground">{label}</p>
						<p className="mt-3 font-mono text-xl font-semibold">{value}</p>
					</div>
				))}
			</section>
			<div className="overflow-hidden rounded-xl border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Contractor</TableHead>
							<TableHead className="text-right">Payable</TableHead>
							<TableHead>Oldest unpaid</TableHead>
							<TableHead>Readiness</TableHead>
							<TableHead className="text-right">Jobs</TableHead>
							<TableHead className="w-[180px] text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{data.data.map((row) => (
							<TableRow key={row.contractorId}>
								<TableCell className="font-medium">
									{row.contractorName}
								</TableCell>
								<TableCell className="text-right font-mono font-semibold">
									{money(row.payableBalanceCents)}
								</TableCell>
								<TableCell>
									{row.oldestUnpaidAt
										? new Date(row.oldestUnpaidAt).toLocaleDateString()
										: "—"}
								</TableCell>
								<TableCell>
									<Badge
										variant={
											row.readiness === "READY" ? "secondary" : "outline"
										}
									>
										{readinessLabel(row.readiness)}
									</Badge>
								</TableCell>
								<TableCell className="text-right">{row.jobCount}</TableCell>
								<TableCell>
									<div className="flex justify-end gap-1">
										<Button
											size="icon"
											variant="ghost"
											aria-label={`Open ${row.contractorName} accounting profile`}
											onClick={() =>
												void setParams({ contractorId: row.contractorId })
											}
										>
											<Eye className="size-4" />
										</Button>
										{row.readiness === "READY" && row.jobIds.length ? (
											<Button
												size="icon"
												variant="ghost"
												aria-label={`Create payout draft for ${row.contractorName}`}
												disabled={createDraft.isPending}
												onClick={() =>
													createDraft.mutate({
														contractorId: row.contractorId,
														jobIds: row.jobIds,
														from: input.from,
														to: input.to,
														timezone: input.timezone,
													})
												}
											>
												<FilePlus2 className="size-4" />
											</Button>
										) : null}
										<Button asChild size="icon" variant="ghost">
											<Link
												href={`/contractors/jobs/payment-portal?contractorId=${row.contractorId}`}
												aria-label={`Open ${row.contractorName} in Payment Portal`}
											>
												<ArrowUpRight className="size-4" />
											</Link>
										</Button>
									</div>
								</TableCell>
							</TableRow>
						))}
						{!data.data.length ? (
							<TableRow>
								<TableCell colSpan={6} className="h-56 text-center">
									No contractor payables match the active filters.
								</TableCell>
							</TableRow>
						) : null}
					</TableBody>
				</Table>
			</div>
		</>
	);
}

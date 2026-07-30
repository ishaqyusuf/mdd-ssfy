"use client";

import { useContractorAccountingFilterParams } from "@/hooks/use-contractor-accounting-filter-params";
import { useTRPC } from "@/trpc/client";
import { formatMoneyCents } from "@gnd/contractor-accounting";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@gnd/ui/sheet";
import { useQuery } from "@gnd/ui/tanstack";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

const currency = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
});

function money(cents: number) {
	return currency.format(Number(formatMoneyCents(cents)));
}

export function ContractorAccountingProfileSheet() {
	const trpc = useTRPC();
	const { params, filters, setParams } = useContractorAccountingFilterParams();
	const open = Boolean(params.contractorId);
	const profile = useQuery({
		...trpc.contractorAccounting.contractorProfile.queryOptions({
			contractorId: params.contractorId || 0,
			from: filters.from,
			to: filters.to,
			timezone: filters.timezone,
		}),
		enabled: open,
	});
	return (
		<Sheet
			open={open}
			onOpenChange={(next) => {
				if (!next) void setParams({ contractorId: null });
			}}
		>
			<SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
				<SheetHeader className="text-left">
					<SheetTitle>
						{profile.data?.contractor.name || "Contractor 360"}
					</SheetTitle>
					<SheetDescription>
						Balance, aging, exceptions, tax readiness, and payout-run history
						for the active reporting period.
					</SheetDescription>
				</SheetHeader>
				{profile.data ? (
					<div className="mt-6 space-y-5">
						<div className="grid gap-3 sm:grid-cols-3">
							<div className="rounded-xl border p-4">
								<p className="text-xs text-muted-foreground">Payable</p>
								<p className="mt-2 font-mono text-lg font-semibold">
									{money(profile.data.payable?.payableBalanceCents ?? 0)}
								</p>
							</div>
							<div className="rounded-xl border p-4">
								<p className="text-xs text-muted-foreground">Open issues</p>
								<p className="mt-2 font-mono text-lg font-semibold">
									{
										profile.data.issues.filter(
											(issue) => issue.resolutionStatus !== "resolved",
										).length
									}
								</p>
							</div>
							<div className="rounded-xl border p-4">
								<p className="text-xs text-muted-foreground">W-9</p>
								<div className="mt-2">
									<Badge variant="outline">
										{profile.data.taxProfile?.w9Status.replaceAll("_", " ") ||
											"NOT REQUESTED"}
									</Badge>
								</div>
							</div>
						</div>
						<div className="rounded-xl border p-4">
							<p className="font-medium text-sm">Liability aging</p>
							<div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
								{[
									["Current", profile.data.payable?.aging.currentCents],
									["1–30", profile.data.payable?.aging.days1To30Cents],
									["31–60", profile.data.payable?.aging.days31To60Cents],
									["61–90", profile.data.payable?.aging.days61To90Cents],
									["90+", profile.data.payable?.aging.over90DaysCents],
								].map(([label, value]) => (
									<div key={String(label)}>
										<p className="text-xs text-muted-foreground">{label}</p>
										<p className="mt-1 font-mono text-sm">
											{money(Number(value ?? 0))}
										</p>
									</div>
								))}
							</div>
						</div>
						<div className="rounded-xl border p-4">
							<p className="font-medium text-sm">Recent payout runs</p>
							<div className="mt-3 space-y-2">
								{profile.data.payoutRuns.map((run) => (
									<div
										key={run.id}
										className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 p-3"
									>
										<div>
											<p className="font-mono text-sm">
												{currency.format(Number(run.proposedAmount))}
											</p>
											<p className="text-xs text-muted-foreground">
												{new Date(run.createdAt).toLocaleString()}
											</p>
										</div>
										<Badge variant="outline">{run.status}</Badge>
									</div>
								))}
								{!profile.data.payoutRuns.length ? (
									<p className="text-sm text-muted-foreground">
										No payout runs for this contractor.
									</p>
								) : null}
							</div>
						</div>
						<Button asChild className="w-full">
							<Link
								href={`/contractors/jobs/payment-portal?contractorId=${profile.data.contractor.id}`}
							>
								Open in Payment Portal
								<ArrowUpRight className="ml-2 size-4" />
							</Link>
						</Button>
					</div>
				) : (
					<div className="mt-6 h-80 animate-pulse rounded-xl bg-muted/40" />
				)}
			</SheetContent>
		</Sheet>
	);
}

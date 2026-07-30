"use client";

import { useContractorAccountingFilterParams } from "@/hooks/use-contractor-accounting-filter-params";
import { useTRPC } from "@/trpc/client";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { useQuery } from "@gnd/ui/tanstack";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

export function ContractorCloseReadiness() {
	const trpc = useTRPC();
	const { filters } = useContractorAccountingFilterParams();
	const input = {
		...filters,
		includeEntries: false,
	} as RouterInputs["contractorAccounting"]["closeReadiness"];
	const query = useQuery(
		trpc.contractorAccounting.closeReadiness.queryOptions(input),
	);
	if (!query.data) return null;
	return (
		<div className="rounded-xl border bg-card p-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<p className="font-medium text-sm">Period-close readiness</p>
					<p className="text-xs text-muted-foreground">
						Reconciliation, evidence, identity, and payout-date controls
					</p>
				</div>
				<Badge variant={query.data.ready ? "secondary" : "destructive"}>
					{query.data.ready
						? "Ready to close"
						: `${query.data.blockerCount} blocker(s)`}
				</Badge>
			</div>
			<div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
				{query.data.checks.map((check) => {
					const Icon =
						check.status === "pass"
							? CheckCircle2
							: check.status === "warning"
								? AlertTriangle
								: XCircle;
					return (
						<div
							key={check.code}
							className="flex gap-2 rounded-lg bg-muted/40 p-3"
						>
							<Icon
								className={
									check.status === "pass"
										? "mt-0.5 size-4 shrink-0 text-emerald-600"
										: check.status === "warning"
											? "mt-0.5 size-4 shrink-0 text-amber-600"
											: "mt-0.5 size-4 shrink-0 text-rose-600"
								}
							/>
							<div className="min-w-0">
								<p className="font-medium text-xs">{check.label}</p>
								<p className="mt-1 text-[11px] text-muted-foreground">
									{check.message}
								</p>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

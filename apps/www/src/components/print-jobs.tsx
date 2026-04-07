"use client";

import { _trpc } from "@/components/static-trpc";
import { useJobsPrintFilter } from "@/hooks/use-jobs-print-filter";
import { useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useEffect, useRef } from "react";

function formatCurrency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));
}

export function PrintJobs() {
	const { filters } = useJobsPrintFilter();
	const { data } = useSuspenseQuery(
		_trpc.print.jobs.queryOptions({
			token: filters.token ?? "",
			preview: filters.preview ?? false,
		}),
	);
	const hasPrintedRef = useRef(false);

	useEffect(() => {
		if (!filters.preview || !data || hasPrintedRef.current) return;
		hasPrintedRef.current = true;
		const timer = window.setTimeout(() => {
			window.print();
		}, 300);
		return () => window.clearTimeout(timer);
	}, [data, filters.preview]);

	if (!data) {
		return (
			<div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center p-10 text-sm text-muted-foreground">
				Print data could not be loaded.
			</div>
		);
	}

	return (
		<div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 bg-background px-6 py-8 print:px-4 print:py-6">
			<header className="border-b border-border pb-4">
				<h1 className="text-2xl font-semibold text-foreground">
					{data.title}
				</h1>
				<div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
					<span>Printed {format(new Date(data.printedAt), "MMMM d, yyyy h:mm a")}</span>
					<span>{data.summary.jobCount} jobs</span>
					<span>{formatCurrency(data.summary.totalAmount)} total</span>
					<span>{data.summary.contractorName}</span>
				</div>
			</header>

			<div className="overflow-hidden rounded-2xl border border-border">
				<table className="min-w-full border-collapse text-sm">
					<thead className="bg-muted/40">
						<tr className="text-left">
							<th className="px-3 py-2 font-medium">Job</th>
							<th className="px-3 py-2 font-medium">Contractor</th>
							<th className="px-3 py-2 font-medium">Project / Unit</th>
							<th className="px-3 py-2 font-medium">Status</th>
							<th className="px-3 py-2 font-medium">Date</th>
							<th className="px-3 py-2 text-right font-medium">Amount</th>
						</tr>
					</thead>
					<tbody>
						{data.jobs.map((job) => (
							<tr key={job.id} className="border-t border-border align-top">
								<td className="px-3 py-3">
									<p className="font-medium text-foreground">
										#{job.id} {job.title}
										{job.subtitle ? ` - ${job.subtitle}` : ""}
									</p>
									{job.description ? (
										<p className="mt-1 text-xs text-muted-foreground">
											{job.description}
										</p>
									) : null}
								</td>
								<td className="px-3 py-3 text-muted-foreground">
									{job.contractorName}
								</td>
								<td className="px-3 py-3 text-muted-foreground">
									<p>{job.projectTitle}</p>
									<p className="mt-1 text-xs">
										{[job.lotBlock, job.modelName].filter(Boolean).join(" • ") ||
											"No unit details"}
									</p>
								</td>
								<td className="px-3 py-3 text-muted-foreground">
									{job.status || "Unknown"}
								</td>
								<td className="px-3 py-3 text-muted-foreground">
									{format(new Date(job.createdAt), "MMM d, yyyy")}
								</td>
								<td className="px-3 py-3 text-right font-medium text-foreground">
									{formatCurrency(job.amount)}
								</td>
							</tr>
						))}
					</tbody>
					<tfoot>
						<tr className="border-t border-border bg-muted/20">
							<td colSpan={5} className="px-3 py-3 text-right font-medium">
								Selected total
							</td>
							<td className="px-3 py-3 text-right font-semibold">
								{formatCurrency(data.summary.totalAmount)}
							</td>
						</tr>
					</tfoot>
				</table>
			</div>
		</div>
	);
}

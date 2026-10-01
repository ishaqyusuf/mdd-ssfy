"use client";

import { formatPaymentAmount } from "@/components/payment-dashboard/payment-format";
import { VirtualRecordList } from "@/components/tables-2/core/virtual-record-list";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import type { Row } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import Link from "next/link";
import { useRef } from "react";
import type { PaymentDashboardContractorRow } from "./columns";

export function ContractorTaskQueues({
	rows,
}: { rows: Row<PaymentDashboardContractorRow>[] }) {
	return (
		<div className="space-y-5">
			<TaskQueue
				rows={rows.filter((row) => row.original.readyToPayCount > 0)}
				review={false}
			/>
			<TaskQueue
				rows={rows.filter((row) => row.original.pendingReviewCount > 0)}
				review
			/>
		</div>
	);
}

function TaskQueue({
	rows,
	review,
}: { rows: Row<PaymentDashboardContractorRow>[]; review: boolean }) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const virtualizer = useVirtualizer<HTMLDivElement, Element>({
		count: rows.length,
		getScrollElement: () => scrollRef.current,
		estimateSize: () => 120,
		getItemKey: (index) => rows[index]?.id || index,
		overscan: 5,
	});
	const count = rows.reduce(
		(total, row) =>
			total +
			(review ? row.original.pendingReviewCount : row.original.readyToPayCount),
		0,
	);
	return (
		<section className="min-w-0 space-y-3">
			<div className="flex items-center gap-3">
				<span
					className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${review ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"}`}
				>
					{review ? (
						<Icons.Clock className="size-4" />
					) : (
						<Icons.CheckCircle2 className="size-4" />
					)}
				</span>
				<div>
					<h2 className="font-semibold">
						{review ? "Needs review" : "Ready to pay"}{" "}
						<span className="ml-2 text-xs font-normal text-muted-foreground">
							{count} jobs
						</span>
					</h2>
					<p className="mt-0.5 text-xs text-muted-foreground">
						{review
							? "Inspect submitted work before you pay."
							: "Approved work, ready for a payout."}
					</p>
				</div>
			</div>
			{!rows.length ? (
				<div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
					{review
						? "No submissions need review."
						: "No approved work is waiting for payment."}
				</div>
			) : (
				<VirtualRecordList
					rows={rows}
					virtualizer={virtualizer}
					scrollRef={scrollRef}
					height={`${Math.min(360, Math.max(130, rows.length * 130))}px`}
					renderRow={(row) => {
						const contractor = row.original;
						return (
							<div className="flex min-w-0 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
								<div className="min-w-0">
									<p className="truncate font-semibold">{contractor.name}</p>
									<div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
										<span>
											{review
												? contractor.pendingReviewCount
												: contractor.readyToPayCount}{" "}
											{review ? "submitted" : "approved"} jobs
										</span>
										<Badge
											variant="outline"
											className={`max-w-full whitespace-normal ${contractor.insurance.state === "valid" ? "text-muted-foreground" : "text-amber-700 dark:text-amber-300"}`}
										>
											{contractor.insurance.message}
										</Badge>
									</div>
								</div>
								<div className="flex shrink-0 items-center justify-between gap-3">
									{!review ? (
										<span className="font-semibold tabular-nums">
											{formatPaymentAmount(contractor.totalPay)}
										</span>
									) : null}
									<Button
										asChild
										size="sm"
										variant={review ? "outline" : "secondary"}
									>
										<Link
											href={`/contractors/jobs/payment-portal?contractorId=${contractor.id}&status=${review ? "pending-review" : "ready-to-pay"}`}
											aria-label={`${review ? "Review jobs" : "Prepare payout"} for ${contractor.name}`}
										>
											{review ? "Review" : "Prepare"}
											<Icons.ArrowRight className="size-3.5" />
										</Link>
									</Button>
								</div>
							</div>
						);
					}}
				/>
			)}
		</section>
	);
}

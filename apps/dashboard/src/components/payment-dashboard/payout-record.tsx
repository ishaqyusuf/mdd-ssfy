"use client";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import Link from "next/link";
import type { ReactNode } from "react";
import { formatPaymentAmount, formatPaymentDate } from "./payment-format";

export function PayoutRecord({
	id,
	name,
	amount,
	createdAt,
	paymentMethod,
	checkNo,
	jobCount,
	isCancelled,
	selection,
}: {
	id: number;
	name: string;
	amount: number;
	createdAt: string | Date;
	paymentMethod: string;
	checkNo?: string | null;
	jobCount: number;
	isCancelled?: boolean;
	selection?: ReactNode;
}) {
	return (
		<div className="flex min-w-0 items-start gap-3 px-4 py-5 sm:items-center sm:gap-4 sm:px-5">
			{selection ? (
				<div className="flex min-h-10 shrink-0 items-center">{selection}</div>
			) : null}
			<div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="min-w-0 flex-1">
					<p className="truncate font-semibold">{name}</p>
					<p className="mt-1 text-xs text-muted-foreground">
						#{id} · {formatPaymentDate(createdAt)}
					</p>
					<div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
						<span>
							{paymentMethod}
							{checkNo ? ` · ${checkNo}` : ""} · {jobCount} jobs
						</span>
						<Badge
							variant="outline"
							className={
								isCancelled
									? "text-amber-700 dark:text-amber-300"
									: "text-emerald-700 dark:text-emerald-300"
							}
						>
							{isCancelled ? "Cancelled" : "Recorded"}
						</Badge>
					</div>
				</div>
				<div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
					<p className="text-lg font-semibold tabular-nums">
						{formatPaymentAmount(amount)}
					</p>
					<Button asChild variant="outline" size="sm">
						<Link
							href={`/contractors/jobs/payments/${id}`}
							aria-label={`View payout ${id}`}
						>
							View
						</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}

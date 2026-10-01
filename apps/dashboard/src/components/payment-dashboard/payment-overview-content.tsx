"use client";

import { DataTable as ContractorPayoutOverviewJobsTable } from "@/components/tables-2/contractor-payout-overview-jobs/data-table";
import type { TableSettings } from "@/utils/table-settings";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { Skeleton } from "@gnd/ui/skeleton";
import dynamic from "next/dynamic";
import { type ReactNode, useState } from "react";
import {
	formatPaymentDate as date,
	formatPaymentAmount as money,
} from "./payment-format";

const ActivityHistory = dynamic(
	() =>
		import("@/components/chat/activity-history").then(
			(module) => module.ActivityHistory,
		),
	{ loading: () => <Skeleton className="h-28" /> },
);
type PaymentOverviewData = RouterOutputs["jobs"]["contractorPayoutOverview"];

export function PaymentOverviewContent({
	data,
	includedJobsInitialSettings,
	isPending,
	actions,
}: {
	data?: PaymentOverviewData | null;
	includedJobsInitialSettings?: Partial<TableSettings>;
	isPending?: boolean;
	actions?: ReactNode;
}) {
	const [activityOpen, setActivityOpen] = useState(false);
	const [adjustmentsOpen, setAdjustmentsOpen] = useState(false);
	if (isPending)
		return (
			<div className="mx-auto w-full max-w-4xl space-y-4">
				<Skeleton className="h-60 rounded-xl" />
				<Skeleton className="h-96 rounded-xl" />
			</div>
		);
	if (!data)
		return (
			<div
				role="alert"
				className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground"
			>
				Payment details could not be loaded.
			</div>
		);
	return (
		<article className="mx-auto w-full min-w-0 max-w-4xl overflow-hidden rounded-2xl border bg-card">
			<header className="px-5 py-8 text-center sm:px-8">
				<div
					className={`mx-auto mb-4 flex size-12 items-center justify-center rounded-full ${data.isCancelled ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200"}`}
				>
					{data.isCancelled ? (
						<Icons.XCircle className="size-6" />
					) : (
						<Icons.CheckCircle2 className="size-6" />
					)}
				</div>
				<p className="text-xs text-muted-foreground">
					Payout #{data.id} · {date(data.createdAt)}
				</p>
				<p className="mt-3 text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
					{money(data.amount)}
				</p>
				<h1 className="mt-3 text-xl font-semibold">
					{data.paidTo?.name || "Unknown contractor"}
				</h1>
				<Badge variant="outline" className="mt-3">
					{data.isCancelled ? "Cancelled" : "Recorded"}
				</Badge>
				<p className="mt-2 text-xs text-muted-foreground">
					{data.isCancelled
						? "Original payment amount"
						: `${data.jobCount} jobs included in this payout`}
				</p>
			</header>
			{data.isCancelled ? (
				<div className="mx-5 mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 sm:mx-8 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
					<p className="font-medium">
						This payout was cancelled. Included jobs are now unpaid.
					</p>
					<p className="mt-1">
						{data.cancelledAt
							? `Cancelled ${date(data.cancelledAt)}`
							: "Cancelled"}
						{data.cancelledBy?.name ? ` by ${data.cancelledBy.name}` : ""}.
					</p>
					{data.cancellationReason ? (
						<p className="mt-1">Reason: {data.cancellationReason}</p>
					) : null}
				</div>
			) : data.reversedAt ? (
				<div className="mx-5 mb-6 rounded-lg border bg-muted/30 p-4 text-sm sm:mx-8">
					<p className="font-medium">
						Restored to active {date(data.reversedAt)}
						{data.reversedBy?.name ? ` by ${data.reversedBy.name}` : ""}.
					</p>
					{data.reversalReason ? (
						<p className="mt-1 text-muted-foreground">
							Reason: {data.reversalReason}
						</p>
					) : null}
				</div>
			) : null}
			<dl className="grid gap-5 border-y bg-muted/20 px-5 py-5 sm:grid-cols-3 sm:px-8">
				<ReceiptFact
					label="Payment method"
					value={`${data.paymentMethod}${data.checkNo ? ` · Check ${data.checkNo}` : ""}`}
				/>
				<ReceiptFact
					label="Authorized by"
					value={data.authorizedBy?.name || "Unknown payer"}
				/>
				<ReceiptFact
					label="Contractor email"
					value={data.paidTo?.email || "No email on file"}
				/>
			</dl>
			<section className="min-w-0 space-y-4 px-4 py-6 sm:px-8">
				<h2 className="font-semibold">
					Included jobs{" "}
					<span className="ml-2 text-xs font-normal text-muted-foreground">
						{data.jobCount}
					</span>
				</h2>
				<ContractorPayoutOverviewJobsTable
					data={data.jobs}
					emptyText="No jobs were attached to this payout."
					initialSettings={includedJobsInitialSettings}
				/>
			</section>
			<section className="space-y-3 border-t px-5 py-6 sm:px-8">
				<ReceiptLine label="Subtotal" value={money(data.subTotal)} />
				<ReceiptLine label="Charges / discounts" value={money(data.charges)} />
				<div className="border-t pt-3">
					<ReceiptLine
						label={data.isCancelled ? "Original payout" : "Total paid"}
						value={money(data.amount)}
						emphasis
					/>
				</div>
			</section>
			<section className="border-t">
				<Button
					variant="ghost"
					className="h-auto w-full justify-between rounded-none px-5 py-4 sm:px-8"
					aria-expanded={adjustmentsOpen}
					aria-controls="payout-adjustments"
					onClick={() => setAdjustmentsOpen(!adjustmentsOpen)}
				>
					Adjustments{" "}
					<span className="flex items-center gap-2 text-xs text-muted-foreground">
						{data.adjustments.length || "None"}
						<Icons.ChevronDown
							className={`size-4 transition-transform ${adjustmentsOpen ? "rotate-180" : ""}`}
						/>
					</span>
				</Button>
				{adjustmentsOpen ? (
					<div id="payout-adjustments" className="space-y-4 px-5 pb-5 sm:px-8">
						{data.adjustments.length ? (
							data.adjustments.map((item) => (
								<div key={item.id} className="space-y-1">
									<ReceiptLine
										label={item.description || item.type}
										value={money(item.amount)}
									/>
									<p className="text-xs text-muted-foreground">
										{item.type} · Added {date(item.createdAt)}
									</p>
								</div>
							))
						) : (
							<p className="text-sm text-muted-foreground">
								No adjustments were recorded.
							</p>
						)}
					</div>
				) : null}
			</section>
			<section className="border-t">
				<Button
					variant="ghost"
					className="h-auto w-full justify-between rounded-none px-5 py-4 sm:px-8"
					aria-expanded={activityOpen}
					aria-controls="payout-activity"
					onClick={() => setActivityOpen(!activityOpen)}
				>
					Activity history{" "}
					<Icons.ChevronDown
						className={`size-4 transition-transform ${activityOpen ? "rotate-180" : ""}`}
					/>
				</Button>
				{activityOpen ? (
					<div id="payout-activity" className="px-5 pb-5 sm:px-8">
						<ActivityHistory
							className="py-0"
							tags={[{ tagName: "paymentId", tagValue: String(data.id) }]}
							emptyText="No payout activity yet"
						/>
					</div>
				) : null}
			</section>
			{actions ? (
				<footer className="flex flex-wrap items-center justify-end gap-2 border-t px-5 py-5 sm:px-8">
					{actions}
				</footer>
			) : null}
		</article>
	);
}
function ReceiptFact({ label, value }: { label: string; value: string }) {
	return (
		<div className="min-w-0">
			<dt className="text-xs text-muted-foreground">{label}</dt>
			<dd className="mt-1 break-words text-sm font-medium">{value}</dd>
		</div>
	);
}
function ReceiptLine({
	label,
	value,
	emphasis,
}: { label: string; value: string; emphasis?: boolean }) {
	return (
		<div className="flex items-start justify-between gap-4">
			<p
				className={emphasis ? "font-semibold" : "text-sm text-muted-foreground"}
			>
				{label}
			</p>
			<p
				className={`shrink-0 tabular-nums ${emphasis ? "text-lg font-semibold" : "text-sm font-medium"}`}
			>
				{value}
			</p>
		</div>
	);
}

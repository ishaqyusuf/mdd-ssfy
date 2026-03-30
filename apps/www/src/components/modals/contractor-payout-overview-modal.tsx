"use client";

import Money from "@/components/_v1/money";
import { useContractorPayoutParams } from "@/hooks/use-contractor-payout-params";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Skeleton } from "@gnd/ui/skeleton";
import { useQuery } from "@gnd/ui/tanstack";
import { formatDate } from "@gnd/utils/dayjs";
import type { ReactNode } from "react";
import { CustomModal } from "./custom-modal";

export function ContractorPayoutOverviewModal() {
	const { openContractorPayoutId, setParams } = useContractorPayoutParams();
	const trpc = useTRPC();
	const { data, isPending } = useQuery(
		trpc.jobs.contractorPayoutOverview.queryOptions(
			{
				paymentId: openContractorPayoutId!,
			},
			{
				enabled: !!openContractorPayoutId,
			},
		),
	);

	return (
		<CustomModal
			open={!!openContractorPayoutId}
			onOpenChange={(open) => {
				if (!open) {
					setParams(null);
				}
			}}
			size="3xl"
			title={data ? `Payout #${data.id}` : "Payout overview"}
			description={
				data
					? `${data.paidTo?.name || "Unknown contractor"} • ${formatDate(data.createdAt)}`
					: "Payout overview"
			}
		>
			<CustomModal.Content className="lg:max-h-[70vh]">
				{isPending || !data ? (
					<div className="grid gap-3">
						<Skeleton className="h-24 rounded-2xl" />
						<Skeleton className="h-64 rounded-2xl" />
					</div>
				) : (
					<div className="space-y-4">
						<div className="grid gap-3 md:grid-cols-4">
							<SummaryCard
								label="Payout"
								value={<Money value={data.amount} />}
							/>
							<SummaryCard label="Jobs" value={String(data.jobCount)} />
							<SummaryCard
								label="Authorized By"
								value={data.authorizedBy?.name || "Unknown"}
							/>
							<SummaryCard
								label="Paid To"
								value={data.paidTo?.name || "Unknown"}
							/>
						</div>

						<div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
							<div className="rounded-2xl border border-slate-200 bg-white">
								<div className="border-b border-slate-200 px-4 py-3">
									<h3 className="text-sm font-semibold text-slate-900">
										Included Jobs
									</h3>
								</div>
								<div className="divide-y divide-slate-100">
									{data.jobs.map((job) => (
										<div
											key={job.id}
											className="flex items-start justify-between gap-3 px-4 py-3"
										>
											<div className="min-w-0">
												<p className="truncate text-sm font-semibold text-slate-900">
													{job.title}
													{job.subtitle ? ` - ${job.subtitle}` : ""}
												</p>
												<p className="text-xs text-muted-foreground">
													#{job.id}
													{job.projectTitle ? ` • ${job.projectTitle}` : ""}
													{job.lotBlock ? ` • ${job.lotBlock}` : ""}
												</p>
											</div>
											<div className="shrink-0 text-right">
												<Badge variant="secondary" className="mb-1">
													{job.status || "Unknown"}
												</Badge>
												<Money className="text-sm font-semibold" value={job.amount} />
											</div>
										</div>
									))}
								</div>
							</div>

							<div className="space-y-4">
								<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
									<h3 className="text-sm font-semibold text-slate-900">
										Payout Details
									</h3>
									<div className="mt-3 space-y-2 text-sm">
										<DetailRow label="Date" value={formatDate(data.createdAt)} />
										<DetailRow label="Method" value={data.paymentMethod} />
										<DetailRow label="Check No" value={data.checkNo || "N/A"} />
										<DetailRow
											label="Subtotal"
											value={<Money value={data.subTotal} />}
										/>
										<DetailRow
											label="Charges"
											value={<Money value={data.charges} />}
										/>
										<DetailRow label="Total" value={<Money value={data.amount} />} />
									</div>
								</div>

								<div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
									<h3 className="text-sm font-semibold text-slate-900">
										Adjustments
									</h3>
									<div className="mt-3 space-y-3">
										{data.adjustments.length ? (
											data.adjustments.map((item) => (
												<div
													key={item.id}
													className="flex items-start justify-between gap-3"
												>
													<div>
														<p className="text-sm font-medium text-slate-900">
															{item.description || item.type}
														</p>
														<p className="text-xs text-muted-foreground">
															{item.type}
														</p>
													</div>
													<Money className="text-sm font-semibold" value={item.amount} />
												</div>
											))
										) : (
											<p className="text-sm text-muted-foreground">
												No adjustments recorded.
											</p>
										)}
									</div>
								</div>
							</div>
						</div>
					</div>
				)}
			</CustomModal.Content>
		</CustomModal>
	);
}

function SummaryCard({
	label,
	value,
}: {
	label: string;
	value: ReactNode;
}) {
	return (
		<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
			<p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
				{label}
			</p>
			<div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
		</div>
	);
}

function DetailRow({
	label,
	value,
}: {
	label: string;
	value: ReactNode;
}) {
	return (
		<div className="flex items-center justify-between gap-3">
			<span className="text-muted-foreground">{label}</span>
			<span className="text-right font-medium text-slate-900">{value}</span>
		</div>
	);
}

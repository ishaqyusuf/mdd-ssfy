"use client";

import { Badge } from "@gnd/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@gnd/ui/card";
import { Separator } from "@gnd/ui/separator";
import { Skeleton } from "@gnd/ui/skeleton";
import { format } from "date-fns";
import { BadgeDollarSign, CreditCard, ShieldCheck, User2 } from "lucide-react";

function formatCurrency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));
}

type PaymentOverviewData = {
	id: number;
	amount: number;
	subTotal: number;
	charges: number;
	paymentMethod: string;
	checkNo: string | null;
	createdAt: Date | string;
	paidTo: {
		id: number;
		name: string;
		email: string | null;
	} | null;
	authorizedBy: {
		id: number;
		name: string;
	} | null;
	jobCount: number;
	adjustments: {
		id: number;
		type: string;
		description: string | null;
		amount: number;
		createdAt: Date | string;
	}[];
	jobs: {
		id: number;
		title: string | null;
		subtitle: string | null;
		amount: number;
		status: string | null;
		createdAt: Date | string;
		projectTitle: string | null;
		lotBlock: string | null;
		modelName: string | null;
	}[];
};

export function PaymentOverviewContent({
	data,
	isPending,
}: {
	data?: PaymentOverviewData | null;
	isPending?: boolean;
}) {
	if (isPending) {
		return (
			<div className="grid gap-6">
				<Skeleton className="h-36 rounded-3xl" />
				<div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_360px]">
					<Skeleton className="h-[420px] rounded-3xl" />
					<Skeleton className="h-[420px] rounded-3xl" />
				</div>
			</div>
		);
	}

	if (!data) {
		return (
			<Card className="rounded-3xl border-dashed">
				<CardContent className="py-12 text-center text-sm text-muted-foreground">
					Payment details could not be loaded.
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="grid gap-6">
			<section className="relative overflow-hidden rounded-3xl border bg-card">
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_34%),radial-gradient(circle_at_bottom_right,hsl(var(--accent)/0.18),transparent_30%)]" />
				<div className="relative flex flex-col gap-6 p-6 md:p-8">
					<div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
						<div className="max-w-3xl">
							<Badge variant="secondary" className="mb-3">
								Payment overview
							</Badge>
							<h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
								Payout #{data.id}
							</h1>
							<p className="mt-2 text-sm text-muted-foreground md:text-base">
								Recorded {format(new Date(data.createdAt), "MMMM d, yyyy")} for{" "}
								{data.paidTo?.name || "Unknown contractor"}.
							</p>
						</div>

						<div className="grid gap-3 sm:grid-cols-2 xl:min-w-[360px]">
							<HeroMetric
								label="Total paid"
								value={formatCurrency(data.amount)}
							/>
							<HeroMetric
								label="Jobs included"
								value={`${data.jobCount} job${data.jobCount === 1 ? "" : "s"}`}
							/>
						</div>
					</div>

					<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
						<InfoPill
							icon={User2}
							label="Paid to"
							value={data.paidTo?.name || "Unknown contractor"}
							description={data.paidTo?.email || "No email on file"}
						/>
						<InfoPill
							icon={ShieldCheck}
							label="Authorized by"
							value={data.authorizedBy?.name || "Unknown payer"}
						/>
						<InfoPill
							icon={CreditCard}
							label="Method"
							value={data.paymentMethod}
							description={
								data.checkNo ? `Check ${data.checkNo}` : "No check number"
							}
						/>
						<InfoPill
							icon={BadgeDollarSign}
							label="Charges"
							value={formatCurrency(data.charges)}
							description={`Subtotal ${formatCurrency(data.subTotal)}`}
						/>
					</div>
				</div>
			</section>

			<div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_360px]">
				<Card className="rounded-3xl">
					<CardHeader>
						<CardTitle>Included jobs</CardTitle>
						<CardDescription>
							Every job bundled into this payout batch.
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-3">
						{data.jobs.length ? (
							data.jobs.map((job) => (
								<div
									key={job.id}
									className="rounded-2xl border bg-background/70 p-4"
								>
									<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
										<div className="min-w-0">
											<p className="truncate font-medium text-foreground">
												#{job.id} {job.title}
												{job.subtitle ? ` - ${job.subtitle}` : ""}
											</p>
											<p className="mt-1 text-sm text-muted-foreground">
												{[job.projectTitle, job.lotBlock, job.modelName]
													.filter(Boolean)
													.join(" • ") || "No location details"}
											</p>
										</div>
										<div className="flex items-center gap-3 md:flex-col md:items-end">
											<Badge variant="secondary">
												{job.status || "Unknown"}
											</Badge>
											<p className="text-sm font-semibold text-foreground">
												{formatCurrency(job.amount)}
											</p>
										</div>
									</div>
									<p className="mt-3 text-xs text-muted-foreground">
										Created {format(new Date(job.createdAt), "MMM d, yyyy")}
									</p>
								</div>
							))
						) : (
							<p className="text-sm text-muted-foreground">
								No jobs were attached to this payout.
							</p>
						)}
					</CardContent>
				</Card>

				<div className="grid gap-6">
					<Card className="rounded-3xl">
						<CardHeader>
							<CardTitle>Payout breakdown</CardTitle>
							<CardDescription>
								Summary of how the batch total was computed.
							</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-3">
							<DetailRow
								label="Subtotal"
								value={formatCurrency(data.subTotal)}
							/>
							<DetailRow
								label="Charges / discounts"
								value={formatCurrency(data.charges)}
							/>
							<DetailRow label="Method" value={data.paymentMethod} />
							<DetailRow label="Check no" value={data.checkNo || "N/A"} />
							<Separator className="my-1" />
							<DetailRow
								label="Total paid"
								value={formatCurrency(data.amount)}
								emphasis
							/>
						</CardContent>
					</Card>

					<Card className="rounded-3xl">
						<CardHeader>
							<CardTitle>Adjustments</CardTitle>
							<CardDescription>
								Any extra payout lines stored with this batch.
							</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-3">
							{data.adjustments.length ? (
								data.adjustments.map((item) => (
									<div
										key={item.id}
										className="rounded-2xl border bg-background/70 p-4"
									>
										<div className="flex items-start justify-between gap-3">
											<div>
												<p className="font-medium text-foreground">
													{item.description || item.type}
												</p>
												<p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
													{item.type}
												</p>
											</div>
											<p className="shrink-0 text-sm font-semibold text-foreground">
												{formatCurrency(item.amount)}
											</p>
										</div>
										<p className="mt-3 text-xs text-muted-foreground">
											Added {format(new Date(item.createdAt), "MMM d, yyyy")}
										</p>
									</div>
								))
							) : (
								<p className="text-sm text-muted-foreground">
									No adjustments were recorded for this payout.
								</p>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}

function HeroMetric({
	label,
	value,
}: {
	label: string;
	value: string;
}) {
	return (
		<div className="rounded-2xl border bg-background/80 p-4 shadow-sm backdrop-blur">
			<p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
				{label}
			</p>
			<p className="mt-2 text-xl font-semibold text-foreground">{value}</p>
		</div>
	);
}

function InfoPill({
	icon: Icon,
	label,
	value,
	description,
}: {
	icon: typeof User2;
	label: string;
	value: string;
	description?: string;
}) {
	return (
		<div className="rounded-2xl border bg-background/80 p-4 shadow-sm backdrop-blur">
			<div className="flex items-center gap-2 text-muted-foreground">
				<Icon className="h-4 w-4" />
				<p className="text-xs uppercase tracking-[0.18em]">{label}</p>
			</div>
			<p className="mt-3 truncate font-medium text-foreground">{value}</p>
			{description ? (
				<p className="mt-1 truncate text-sm text-muted-foreground">
					{description}
				</p>
			) : null}
		</div>
	);
}

function DetailRow({
	label,
	value,
	emphasis = false,
}: {
	label: string;
	value: string;
	emphasis?: boolean;
}) {
	return (
		<div className="flex items-center justify-between gap-3">
			<p
				className={
					emphasis
						? "font-medium text-foreground"
						: "text-sm text-muted-foreground"
				}
			>
				{label}
			</p>
			<p
				className={
					emphasis
						? "text-base font-semibold text-foreground"
						: "text-sm font-medium text-foreground"
				}
			>
				{value}
			</p>
		</div>
	);
}

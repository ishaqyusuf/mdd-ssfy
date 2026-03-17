"use client";

import { Badge } from "@gnd/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Progress } from "@gnd/ui/progress";

import { useSalesOverviewSystem } from "../provider";
import {
	formatAddress,
	formatCurrency,
	formatPercent,
	getPaymentBalance,
	getProgressValue,
	getStatusLabel,
} from "../view-model";

function MetricCard({
	label,
	value,
	meta,
}: {
	label: string;
	value: string;
	meta?: string;
}) {
	return (
		<Card>
			<CardContent className="space-y-2 p-5">
				<p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
					{label}
				</p>
				<p className="text-2xl font-semibold">{value}</p>
				{meta ? <p className="text-sm text-muted-foreground">{meta}</p> : null}
			</CardContent>
		</Card>
	);
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
	return (
		<div className="flex items-start justify-between gap-4 border-b border-border/60 py-3 last:border-b-0">
			<p className="text-sm text-muted-foreground">{label}</p>
			<p className="max-w-[60%] text-right text-sm font-medium">
				{value || "Not provided"}
			</p>
		</div>
	);
}

export function SalesOverviewOverviewTab() {
	const { data } = useSalesOverviewSystem();
	const balance = getPaymentBalance(data?.invoice);
	const paid = Number(data?.invoice?.paid || 0);
	const total = Number(data?.invoice?.total || 0);
	const paymentProgress = total > 0 ? (paid / total) * 100 : 0;
	const assigned = Number(data?.stats?.prodAssigned?.percentage || 0);
	const completed = Number(data?.stats?.prodCompleted?.percentage || 0);

	return (
		<div className="space-y-6">
			<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				<MetricCard
					label="Invoice Total"
					value={formatCurrency(total)}
					meta={`Paid ${formatCurrency(paid)}`}
				/>
				<MetricCard
					label="Balance"
					value={formatCurrency(balance)}
					meta={`Payment progress ${formatPercent(paymentProgress)}`}
				/>
				<MetricCard
					label="Assigned To Production"
					value={`${Number(data?.stats?.prodAssigned?.total || 0)}`}
					meta={`Coverage ${formatPercent(assigned)}`}
				/>
				<MetricCard
					label="Production Completed"
					value={formatPercent(completed)}
					meta={`Delivery ${getStatusLabel(data?.status?.delivery?.status)}`}
				/>
			</section>

			<section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
				<Card className="border-none bg-gradient-to-br from-slate-950 to-slate-800 text-white">
					<CardContent className="space-y-5 p-6">
						<div className="flex flex-wrap items-center gap-3">
							<Badge variant="secondary">{data?.type || "sale"}</Badge>
							<Badge variant="secondary">
								{getStatusLabel(data?.status?.production?.status)}
							</Badge>
							<Badge variant="secondary">
								{getStatusLabel(data?.status?.assignment?.status)}
							</Badge>
						</div>
						<div className="space-y-2">
							<h2 className="text-3xl font-semibold tracking-tight">
								{data?.displayName || "Sales Overview"}
							</h2>
							<p className="max-w-3xl text-sm text-slate-300">
								Order {data?.orderId || "pending"} for{" "}
								{data?.salesRep || "unassigned rep"}. This view brings finance,
								production, fulfillment, and customer context into one place.
							</p>
						</div>
						<div className="grid gap-4 md:grid-cols-2">
							<div className="space-y-2">
								<p className="text-xs uppercase tracking-[0.2em] text-slate-400">
									Payment Progress
								</p>
								<Progress value={getProgressValue(paymentProgress)} />
								<p className="text-sm text-slate-300">
									{formatCurrency(paid)} collected of {formatCurrency(total)}
								</p>
							</div>
							<div className="space-y-2">
								<p className="text-xs uppercase tracking-[0.2em] text-slate-400">
									Production Progress
								</p>
								<Progress value={getProgressValue(completed)} />
								<p className="text-sm text-slate-300">
									Assigned {formatPercent(assigned)} and completed{" "}
									{formatPercent(completed)}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Customer Snapshot</CardTitle>
					</CardHeader>
					<CardContent>
						<InfoRow label="Customer" value={data?.displayName} />
						<InfoRow label="Phone" value={data?.customerPhone} />
						<InfoRow label="Email" value={data?.email} />
						<InfoRow label="Sales Rep" value={data?.salesRep} />
						<InfoRow
							label="Business"
							value={data?.isBusiness ? "Business account" : "Retail customer"}
						/>
					</CardContent>
				</Card>
			</section>

			<section className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Order Details</CardTitle>
					</CardHeader>
					<CardContent>
						<InfoRow label="Order Number" value={data?.orderId} />
						<InfoRow label="P.O Number" value={data?.poNo} />
						<InfoRow label="Sales Type" value={data?.type} />
						<InfoRow
							label="Delivery Option"
							value={data?.deliveryOption || data?.status?.delivery?.status}
						/>
						<InfoRow
							label="Customer ID"
							value={String(data?.customerId || "")}
						/>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Addresses</CardTitle>
					</CardHeader>
					<CardContent>
						<InfoRow
							label="Shipping"
							value={formatAddress(data?.addressData?.shipping)}
						/>
						<InfoRow
							label="Billing"
							value={formatAddress(data?.addressData?.billing)}
						/>
					</CardContent>
				</Card>
			</section>
		</div>
	);
}

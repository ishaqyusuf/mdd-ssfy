"use client";

import { Icons } from "@gnd/ui/icons";

import { SalesPaymentProcessor } from "@/components/widgets/sales-payment-processor/sales-payment-processor";
import { cn } from "@gnd/ui/cn";

import { useSalesOverviewSystem } from "../provider";
import {
	OverviewEmptyState,
	OverviewProgressBar,
	OverviewSectionCard,
	OverviewSectionLabel,
} from "../section-primitives";
import { formatCurrency, getPaymentBalance } from "../view-model";

type CostLine = {
	id?: number | string | null;
	label?: string | null;
	title?: string | null;
	description?: string | null;
	amount?: number | null;
	value?: number | null;
};

function AmountRow({
	label,
	value,
	highlight,
	bold,
}: {
	label: string;
	value: number;
	highlight?: "positive" | "warning" | "neutral";
	bold?: boolean;
}) {
	const highlightClass: Record<string, string> = {
		positive: "text-emerald-600",
		warning: "text-amber-600",
		neutral: "text-foreground",
	};

	return (
		<div
			className={cn(
				"flex items-center justify-between border-b border-border/40 py-3 last:border-b-0",
				bold && "font-semibold",
			)}
		>
			<span className="text-sm text-muted-foreground">{label}</span>
			<span
				className={cn(
					"text-sm",
					bold && "text-base font-bold",
					highlightClass[highlight ?? "neutral"],
				)}
			>
				{formatCurrency(value)}
			</span>
		</div>
	);
}

export function SalesOverviewFinanceTab() {
	const {
		state: { data, isQuote },
	} = useSalesOverviewSystem();
	const costLines = (data?.costLines ?? []) as CostLine[];
	const total = Number(data?.invoice?.total || 0);
	const paid = Number(data?.invoice?.paid || 0);
	const pending = Number(data?.invoice?.pending || 0);
	const balance = getPaymentBalance(data?.invoice);
	const paymentPct = total > 0 ? (paid / total) * 100 : 0;

	return (
		<div className="space-y-5 p-1">
			{/* Payment progress hero */}
			{!isQuote && (
				<OverviewSectionCard>
					<OverviewSectionLabel
						icon={Icons.CreditCard}
						label="Payment Progress"
					/>
					<div className="mb-4 space-y-2">
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">
								{formatCurrency(paid)} collected of {formatCurrency(total)}
							</span>
							<span className="font-semibold">{Math.round(paymentPct)}%</span>
						</div>
						<OverviewProgressBar
							value={paymentPct}
							colorClass={paymentPct >= 100 ? "bg-emerald-500" : "bg-blue-500"}
						/>
					</div>
					<div className="grid grid-cols-3 gap-3">
						{[
							{
								label: "Invoice Total",
								value: total,
								color: "text-foreground",
							},
							{
								label: "Collected",
								value: paid,
								color: "text-emerald-600",
							},
							{
								label: "Balance",
								value: balance,
								color: balance > 0 ? "text-amber-600" : "text-emerald-600",
							},
						].map((stat) => (
							<div
								key={stat.label}
								className="rounded-lg bg-muted/40 p-3 text-center"
							>
								<p className="text-[10px] uppercase tracking-widest text-muted-foreground">
									{stat.label}
								</p>
								<p className={cn("mt-1 text-base font-bold", stat.color)}>
									{formatCurrency(stat.value)}
								</p>
							</div>
						))}
					</div>
				</OverviewSectionCard>
			)}

			{/* Payment action */}
			{!isQuote && balance > 0 && data?.id && (
				<OverviewSectionCard>
					<OverviewSectionLabel
						icon={Icons.DollarSign}
						label="Collect Payment"
					/>
					<SalesPaymentProcessor
						selectedIds={[data.id]}
						phoneNo={data.customerPhone}
						customerId={data?.customerId}
					/>
				</OverviewSectionCard>
			)}

			{/* Invoice details */}
			<OverviewSectionCard>
				<OverviewSectionLabel icon={Icons.FileText} label="Invoice Details" />
				<AmountRow label="Invoice Total" value={total} bold />
				<AmountRow label="Amount Collected" value={paid} highlight="positive" />
				{pending > 0 && (
					<AmountRow
						label="Pending Verification"
						value={pending}
						highlight="warning"
					/>
				)}
				<AmountRow
					label="Outstanding Balance"
					value={balance}
					highlight={balance > 0 ? "warning" : "positive"}
					bold
				/>
			</OverviewSectionCard>

			{/* Cost lines */}
			{costLines.length ? (
				<OverviewSectionCard>
					<OverviewSectionLabel
						icon={Icons.TrendingDown}
						label="Cost Breakdown"
					/>
					<div className="divide-y divide-border/40">
						{costLines.map((line, i) => (
							<div
								key={String(
									line.id ??
										`${line.label ?? line.title ?? "line"}-${line.amount ?? line.value ?? i}`,
								)}
								className="flex items-start justify-between py-3"
							>
								<div>
									<p className="text-sm font-medium">
										{line.label || line.title || `Line ${i + 1}`}
									</p>
									{line.description && (
										<p className="text-xs text-muted-foreground">
											{line.description}
										</p>
									)}
								</div>
								<p className="text-sm font-semibold">
									{formatCurrency(Number(line.amount || line.value || 0))}
								</p>
							</div>
						))}
					</div>
				</OverviewSectionCard>
			) : (
				<OverviewEmptyState className="p-6">
					No cost line breakdown available for this order.
				</OverviewEmptyState>
			)}
		</div>
	);
}

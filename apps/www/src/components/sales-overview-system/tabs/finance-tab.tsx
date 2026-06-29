"use client";

import { Icons } from "@gnd/ui/icons";

import { SalesOverviewPaymentMethodSelect } from "@/components/sales-overview-payment-method-select";
import { SalesPaymentProcessor } from "@/components/widgets/sales-payment-processor/sales-payment-processor";
import { cn } from "@gnd/ui/cn";

import { useSalesOverviewSystem } from "../provider";
import {
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

function sumCostLineAmounts(costLines: CostLine[], targetLabel: string) {
	return costLines.reduce((sum, line) => {
		const label = (line.label || line.title || "").toLowerCase();
		if (label !== targetLabel.toLowerCase()) return sum;
		return sum + Number(line.amount || line.value || 0);
	}, 0);
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
	const cardPending = sumCostLineAmounts(costLines, "Total Due With C.C.C");
	const payableDue = Math.max(balance, cardPending);
	const cccPending = Math.max(payableDue - balance, 0);
	const paymentStatusLabel = payableDue > 0 ? "Due now" : "Settled";

	return (
		<div className="space-y-5 p-1">
			{/* Payment progress hero */}
			{!isQuote && (
				<OverviewSectionCard>
					<OverviewSectionLabel
						icon={Icons.CreditCard}
						label="Payment Progress"
					/>
					<div className="space-y-4">
						<div className="flex flex-wrap items-end justify-between gap-3">
							<div>
								<p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
									{paymentStatusLabel}
								</p>
								<p
									className={cn(
										"mt-1 text-2xl font-bold",
										payableDue > 0 ? "text-amber-600" : "text-emerald-600",
									)}
								>
									{formatCurrency(payableDue)}
								</p>
							</div>
							<div className="text-right">
								<p className="text-sm font-semibold">
									{Math.round(paymentPct)}% settled
								</p>
								<p className="text-xs text-muted-foreground">
									{formatCurrency(paid)} paid of {formatCurrency(total)}
								</p>
							</div>
						</div>
						<OverviewProgressBar
							value={paymentPct}
							colorClass={paymentPct >= 100 ? "bg-emerald-500" : "bg-blue-500"}
						/>
						<p className="text-xs text-muted-foreground">
							{cccPending > 0
								? `${formatCurrency(balance)} order balance + ${formatCurrency(cccPending)} C.C.C`
								: `${formatCurrency(balance)} order balance remaining`}
						</p>
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
				<SalesOverviewPaymentMethodSelect
					salesId={data?.id}
					value={data?.paymentMethod}
					disabled={isQuote || balance <= 0}
				/>
				{costLines.length ? (
					costLines.map((line, i) => {
						const label = line.label || line.title || `Line ${i + 1}`;
						const normalizedLabel = label.toLowerCase();
						const isBalance =
							normalizedLabel.includes("due") ||
							normalizedLabel.includes("balance");
						const isPaid =
							normalizedLabel.includes("paid") ||
							normalizedLabel.includes("charged");
						const isTotal =
							normalizedLabel.includes("total") ||
							normalizedLabel.includes("invoice");
						return (
							<AmountRow
								key={String(
									line.id ?? `${label}-${line.amount ?? line.value ?? i}`,
								)}
								label={label}
								value={Number(line.amount || line.value || 0)}
								highlight={
									isBalance && Number(line.amount || line.value || 0) > 0
										? "warning"
										: isPaid
											? "positive"
											: "neutral"
								}
								bold={isTotal || isBalance}
							/>
						);
					})
				) : (
					<>
						<AmountRow label="Invoice Total" value={total} bold />
						<AmountRow
							label="Amount Collected"
							value={paid}
							highlight="positive"
						/>
					</>
				)}
				{!costLines.length && pending > 0 && (
					<AmountRow
						label="Pending Verification"
						value={pending}
						highlight="warning"
					/>
				)}
				{!costLines.length && (
					<AmountRow
						label="Outstanding Balance"
						value={balance}
						highlight={balance > 0 ? "warning" : "positive"}
						bold
					/>
				)}
			</OverviewSectionCard>
		</div>
	);
}

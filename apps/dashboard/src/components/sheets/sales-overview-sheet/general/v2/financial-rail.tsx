"use client";

import Money from "@/components/_v1/money";
import { SalesOverviewPaymentMethodSelect } from "@/components/sales-overview-payment-method-select";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import { Separator } from "@gnd/ui/separator";
import type { GeneralV2FinancialLine } from "./financial-composer";

function FinancialLine({ line }: { line: GeneralV2FinancialLine }) {
	return (
		<div className="flex items-baseline justify-between gap-4 text-xs">
			<dt
				className={cn(
					"min-w-0 text-muted-foreground",
					line.emphasis === "strong" && "font-semibold text-foreground",
				)}
			>
				{line.label}
			</dt>
			<dd
				className={cn(
					"shrink-0 font-medium tabular-nums",
					line.emphasis === "strong" && "font-semibold",
				)}
			>
				{line.format === "count" ? (
					line.amountCents
				) : (
					<Money value={line.amountCents / 100} />
				)}
			</dd>
		</div>
	);
}

function FinancialLines({ lines }: { lines: GeneralV2FinancialLine[] }) {
	return (
		<dl className="flex flex-col gap-2.5">
			{lines.map((line) => (
				<FinancialLine key={line.key} line={line} />
			))}
		</dl>
	);
}

export function FinancialRail({
	data,
	isQuote,
	invoiceLines,
	cardLines,
	cardHeading,
	invoiceTotalCents,
	invoicePaidCents,
	invoicePendingCents,
	payableDueCents,
	balanceCents,
	paymentStatus,
	paymentMethod,
	onCreatePayment,
}: {
	data: {
		id: number;
		customerId?: number | null;
		customerPhone?: string | null;
		paymentMethod?: string | null;
	};
	isQuote: boolean;
	invoiceLines: GeneralV2FinancialLine[];
	cardLines: GeneralV2FinancialLine[];
	cardHeading: string;
	invoiceTotalCents: number;
	invoicePaidCents: number;
	invoicePendingCents: number;
	payableDueCents: number;
	balanceCents: number;
	paymentPercentage: number;
	paymentStatus: string;
	paymentMethod: string;
	onCreatePayment?: () => void;
}) {
	const detailLines = invoiceLines.filter(
		(line) =>
			!["invoice-total", "invoice-paid", "invoice-net-paid"].includes(line.key),
	);
	return (
		<section
			aria-label="Financial summary"
			className="min-w-0 lg:sticky lg:top-14"
		>
			<header className="flex items-center justify-between gap-3">
				<h2 className="text-xs font-semibold uppercase tracking-wider">
					Invoice
				</h2>
				<Badge variant={payableDueCents > 0 ? "outline" : "secondary"}>
					{isQuote ? "Quote" : paymentStatus}
				</Badge>
			</header>
			<div className="mt-4 flex flex-col gap-4">
				<dl className="space-y-3 text-sm">
					<div className="flex items-center justify-between gap-3">
						<dt className="text-muted-foreground">Total</dt>
						<dd className="font-medium tabular-nums">
							<Money value={invoiceTotalCents / 100} />
						</dd>
					</div>
					{!isQuote ? (
						<>
							<div className="flex items-center justify-between gap-3">
								<dt className="text-muted-foreground">Paid</dt>
								<dd className="font-medium tabular-nums">
									<Money value={invoicePaidCents / 100} />
								</dd>
							</div>
							<div className="flex items-baseline justify-between gap-3 border-y py-4">
								<dt>{balanceCents < 0 ? "Credit balance" : "Balance due"}</dt>
								<dd className="text-2xl font-semibold tabular-nums">
									<Money value={Math.abs(balanceCents) / 100} />
								</dd>
							</div>
							{payableDueCents !== balanceCents ? (
								<div className="flex items-center justify-between gap-3">
									<dt className="text-muted-foreground">Due with card fee</dt>
									<dd className="font-semibold tabular-nums">
										<Money value={payableDueCents / 100} />
									</dd>
								</div>
							) : null}
						</>
					) : null}
				</dl>
				{!isQuote ? (
					<div className="flex items-center justify-between gap-3 text-xs">
						<span className="text-muted-foreground">Payment method</span>
						<SalesOverviewPaymentMethodSelect
							salesId={data.id}
							value={
								invoicePendingCents <= 0 ? paymentMethod : data.paymentMethod
							}
							disabled={invoicePendingCents <= 0}
							variant="inline"
						/>
					</div>
				) : null}
				<details className="text-xs">
					<summary className="cursor-pointer py-2 font-medium">
						View breakdown
					</summary>
					<div className="flex flex-col gap-4 pt-3">
						<FinancialLines lines={detailLines} />
						{cardLines.length ? (
							<>
								<Separator />
								<section className="space-y-3" aria-label={cardHeading}>
									<h3 className="font-semibold">{cardHeading}</h3>
									<FinancialLines lines={cardLines} />
								</section>
							</>
						) : null}
					</div>
				</details>
				{!isQuote && payableDueCents > 0 ? (
					<Button
						type="button"
						disabled={!onCreatePayment}
						onClick={onCreatePayment}
					>
						<Icons.payment className="size-4" />
						Pay
					</Button>
				) : null}
			</div>
		</section>
	);
}

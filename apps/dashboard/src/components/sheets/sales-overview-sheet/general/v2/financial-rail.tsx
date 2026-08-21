"use client";

import Money from "@/components/_v1/money";
import { SalesOverviewPaymentMethodSelect } from "@/components/sales-overview-payment-method-select";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import { Progress } from "@gnd/ui/progress";
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
	paymentPercentage,
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
	return (
		<section
			aria-label="Financial summary"
			className="min-w-0 lg:sticky lg:top-14"
		>
			<header className="flex flex-col gap-2">
				<div className="flex items-center justify-between gap-3">
					<h2 className="text-xs font-semibold uppercase tracking-wider">
						Financial control
					</h2>
					<Badge variant={payableDueCents > 0 ? "outline" : "secondary"}>
						{isQuote ? "Quote" : paymentStatus}
					</Badge>
				</div>
				<p className="text-sm text-muted-foreground">
					{isQuote
						? "Current quoted value"
						: `${paymentPercentage.toFixed(0)}% settled`}
				</p>
			</header>
			<div className="mt-4 flex flex-col gap-4">
				<div className="flex flex-col gap-2 border-y border-foreground/70 py-4">
					<div className="flex items-end justify-between gap-3">
						<strong className="text-3xl tracking-tight">
							<Money
								value={(isQuote ? invoiceTotalCents : payableDueCents) / 100}
							/>
						</strong>
						<span className="pb-1 text-xs text-muted-foreground">
							{isQuote ? "quote total" : "due now"}
						</span>
					</div>
					{!isQuote ? (
						<>
							<p className="text-xs text-muted-foreground">
								<Money value={invoicePaidCents / 100} /> paid of{" "}
								<Money value={invoiceTotalCents / 100} />
							</p>
							<Progress
								value={paymentPercentage}
								aria-label={`Invoice ${paymentPercentage.toFixed(0)} percent settled`}
								className="h-1.5"
							/>
						</>
					) : null}
				</div>

				<section
					className="flex flex-col gap-3"
					aria-labelledby="general-v2-invoice"
				>
					<div className="flex items-center justify-between gap-3">
						<h3
							id="general-v2-invoice"
							className="text-xs font-semibold uppercase tracking-wide"
						>
							Invoice
						</h3>
						<SalesOverviewPaymentMethodSelect
							salesId={data.id}
							value={
								invoicePendingCents <= 0 ? paymentMethod : data.paymentMethod
							}
							disabled={isQuote || invoicePendingCents <= 0}
							variant="inline"
						/>
					</div>
					<FinancialLines lines={invoiceLines} />
				</section>

				{cardLines.length ? (
					<>
						<Separator />
						<section
							className="flex flex-col gap-3"
							aria-labelledby="general-v2-card-settlement"
						>
							<h3
								id="general-v2-card-settlement"
								className="text-xs font-semibold uppercase tracking-wide"
							>
								{cardHeading}
							</h3>
							<FinancialLines lines={cardLines} />
						</section>
					</>
				) : null}

				{!isQuote ? (
					<div className="flex items-center justify-between border px-3 py-2.5 text-sm">
						<span className="text-muted-foreground">Balance</span>
						<strong className="tabular-nums">
							<Money value={balanceCents / 100} />
						</strong>
					</div>
				) : null}

				{!isQuote && payableDueCents > 0 ? (
					<>
						<Separator />
						<Button
							type="button"
							disabled={!onCreatePayment}
							onClick={onCreatePayment}
						>
							<Icons.payment className="size-4" />
							Pay
						</Button>
					</>
				) : null}
			</div>
		</section>
	);
}

"use client";

import { useSalesFinanceFilterParams } from "@/hooks/use-sales-finance-filter-params";
import { formatCurrency } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { ScrollArea } from "@gnd/ui/scroll-area";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@gnd/ui/sheet";
import { useQuery } from "@tanstack/react-query";
import { CircleAlert, CircleCheck } from "lucide-react";

const RECEIVABLE_SHEET_SKELETON_IDS = [
	"balance",
	"identity",
	"aging",
	"reconciliation",
	"payments",
] as const;

function formatDate(value: string | number | Date | null | undefined) {
	if (!value) return "Not set";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "Not set";
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function agingLabel(bucket: string) {
	return (
		{
			current: "Current",
			"1_30": "1–30 days",
			"31_60": "31–60 days",
			"61_90": "61–90 days",
			"90_plus": "90+ days",
		}[bucket] || bucket
	);
}

export function SalesFinanceReceivableSheet() {
	const trpc = useTRPC();
	const { params, setParams } = useSalesFinanceFilterParams();
	const id = params.receivableId;
	const query = useQuery(
		trpc.salesFinance.receivableDetail.queryOptions(
			{ id: id || 0 },
			{ enabled: Boolean(id) },
		),
	);
	const receivable = query.data;

	return (
		<Sheet
			open={Boolean(id)}
			onOpenChange={(open) => {
				if (!open) void setParams({ receivableId: null });
			}}
		>
			<SheetContent
				side="right"
				className="flex w-full flex-col p-0 sm:max-w-xl lg:max-w-2xl"
			>
				<SheetHeader className="border-b px-5 py-4 text-left">
					<div className="flex items-center gap-2">
						<SheetTitle>
							Invoice {receivable ? receivable.orderNo : ""}
						</SheetTitle>
						{receivable ? (
							<Badge variant={receivable.isOverdue ? "outline" : "secondary"}>
								{agingLabel(receivable.agingBucket)}
							</Badge>
						) : null}
					</div>
					<SheetDescription>
						Balance, due date, customer, and payment application evidence.
					</SheetDescription>
				</SheetHeader>
				<ScrollArea className="min-h-0 flex-1">
					{query.isPending ? (
						<div className="space-y-4 p-5">
							{RECEIVABLE_SHEET_SKELETON_IDS.map((skeletonId) => (
								<div
									key={skeletonId}
									className="h-20 animate-pulse rounded-xl bg-muted"
								/>
							))}
						</div>
					) : query.error ? (
						<div className="p-5 text-sm text-destructive">
							{query.error.message}
						</div>
					) : !receivable ? (
						<div className="p-5 text-sm text-muted-foreground">
							Receivable not found.
						</div>
					) : (
						<div className="space-y-5 p-5">
							<div className="grid gap-3 sm:grid-cols-3">
								<MoneyTile label="Invoice" value={receivable.grandTotal} />
								<MoneyTile label="Paid" value={receivable.paidAmount} />
								<MoneyTile
									label="Outstanding"
									value={receivable.amountDue}
									warning={receivable.isOverdue}
								/>
							</div>
							<section className="overflow-hidden rounded-xl border">
								<DetailRow
									label="Customer"
									value={receivable.customerName || "Unnamed customer"}
								/>
								<DetailRow
									label="Invoice date"
									value={formatDate(receivable.createdAt)}
								/>
								<DetailRow
									label="Due date"
									value={formatDate(receivable.dueAt)}
								/>
								<DetailRow
									label="Aging"
									value={
										receivable.daysOverdue == null
											? "Current · due date not set"
											: receivable.daysOverdue
												? `${receivable.daysOverdue} days overdue`
												: "Current"
									}
								/>
								<DetailRow
									label="Payment term"
									value={receivable.paymentTerm || "Not set"}
								/>
								<DetailRow
									label="Sales rep"
									value={receivable.salesRepName || "Not assigned"}
									last
								/>
							</section>
							<section
								className={`rounded-xl border p-4 ${
									receivable.isBalanceReconciled
										? "bg-emerald-50/60 dark:bg-emerald-950/20"
										: "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
								}`}
							>
								<div className="flex items-start gap-3">
									{receivable.isBalanceReconciled ? (
										<CircleCheck className="mt-0.5 size-4 text-emerald-700" />
									) : (
										<CircleAlert className="mt-0.5 size-4 text-amber-700" />
									)}
									<div>
										<p className="font-medium">
											{receivable.isBalanceReconciled
												? "Balance reconciled"
												: "Balance needs review"}
										</p>
										<p className="mt-1 text-sm text-muted-foreground">
											Stored balance:{" "}
											{formatCurrency.format(receivable.storedAmountDue)} ·
											Calculated balance:{" "}
											{formatCurrency.format(receivable.amountDue)}
										</p>
									</div>
								</div>
							</section>
							<section>
								<div className="mb-3 flex items-center justify-between gap-3">
									<h3 className="font-semibold">Payment applications</h3>
									<Badge variant="secondary">
										{receivable.payments.length}
									</Badge>
								</div>
								<div className="overflow-hidden rounded-xl border">
									{receivable.payments.length ? (
										receivable.payments.map((payment, index) => (
											<div
												key={payment.id || `payment-${index}`}
												className="flex items-center justify-between gap-4 border-b px-4 py-3 last:border-b-0"
											>
												<div className="min-w-0">
													<p className="truncate font-mono text-sm font-medium">
														{payment.reference ||
															`Payment ${payment.id || index + 1}`}
													</p>
													<p className="truncate text-xs capitalize text-muted-foreground">
														{formatDate(payment.receivedAt)} ·{" "}
														{payment.paymentMethod || "Method not set"} ·{" "}
														{payment.status}
													</p>
												</div>
												<p className="shrink-0 font-mono text-sm font-semibold">
													{formatCurrency.format(payment.amount)}
												</p>
											</div>
										))
									) : (
										<p className="px-4 py-8 text-center text-sm text-muted-foreground">
											No payments have been applied to this invoice.
										</p>
									)}
								</div>
							</section>
						</div>
					)}
				</ScrollArea>
			</SheetContent>
		</Sheet>
	);
}

function MoneyTile({
	label,
	value,
	warning,
}: {
	label: string;
	value: number;
	warning?: boolean;
}) {
	return (
		<div className="rounded-xl border bg-muted/20 p-3">
			<p className="text-xs text-muted-foreground">{label}</p>
			<p
				className={`mt-1 font-mono text-lg font-semibold ${
					warning ? "text-amber-700" : ""
				}`}
			>
				{formatCurrency.format(value)}
			</p>
		</div>
	);
}

function DetailRow({
	label,
	value,
	last,
}: {
	label: string;
	value: string;
	last?: boolean;
}) {
	return (
		<div
			className={`grid grid-cols-[120px_1fr] gap-4 border-b px-4 py-3 text-sm ${
				last ? "border-b-0" : ""
			}`}
		>
			<span className="text-muted-foreground">{label}</span>
			<span className="min-w-0 break-words font-medium">{value}</span>
		</div>
	);
}

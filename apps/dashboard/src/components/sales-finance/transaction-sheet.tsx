"use client";

import { SalesFinancePaymentResolutionPanel } from "@/components/sales-finance/payment-resolution-panel";
import { SalesFinanceReconciliationPanel } from "@/components/sales-finance/reconciliation-panel";
import { SquarePaymentTransactionSheet } from "@/components/sheets/sales-overview-sheet/transactions-tab";
import { useAuth } from "@/hooks/use-auth";
import { useSalesFinanceFilterParams } from "@/hooks/use-sales-finance-filter-params";
import { formatCurrency } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { ScrollArea } from "@gnd/ui/scroll-area";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@gnd/ui/sheet";
import { useQuery } from "@tanstack/react-query";
import { CircleAlert } from "lucide-react";
import { useState } from "react";

function formatDate(value: string | number | Date | null | undefined) {
	if (!value) return "Not recorded";
	return new Date(value).toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

export function SalesFinanceTransactionSheet() {
	const auth = useAuth();
	const trpc = useTRPC();
	const { params, setParams } = useSalesFinanceFilterParams();
	const id = params.transactionId;
	const query = useQuery(
		trpc.salesFinance.transactionDetail.queryOptions(
			{ id: id || 0 },
			{ enabled: Boolean(id) },
		),
	);
	const transaction = query.data;
	const [squareDetailOpen, setSquareDetailOpen] = useState(false);
	const [squareRefundOpen, setSquareRefundOpen] = useState(false);
	const primaryApplication = transaction?.applications[0];
	const squareOverview = useQuery(
		trpc.salesRefunds.overview.queryOptions(
			{ orderNo: primaryApplication?.orderNo || "" },
			{
				enabled: Boolean(
					transaction?.hasSquarePayment && primaryApplication?.orderNo,
				),
				refetchInterval: 15_000,
			},
		),
	);
	const squareTransaction = squareOverview.data?.transactions.find(
		(item) => item.transactionId === transaction?.id,
	);
	const skeletonIds = [
		"identity",
		"money",
		"customer",
		"audit",
		"applications",
	];

	return (
		<Sheet
			open={Boolean(id)}
			onOpenChange={(open) => {
				if (!open) {
					setSquareDetailOpen(false);
					setSquareRefundOpen(false);
					void setParams({ transactionId: null });
				}
			}}
		>
			<SheetContent
				side="right"
				className="flex w-full flex-col p-0 sm:max-w-xl lg:max-w-2xl"
			>
				<SheetHeader className="border-b px-5 py-4 text-left">
					<div className="flex items-center gap-2">
						<SheetTitle>
							Payment {transaction ? `#${transaction.paymentNo}` : ""}
						</SheetTitle>
						{transaction?.needsReview ? (
							<Badge variant="outline" className="text-amber-700">
								Needs review
							</Badge>
						) : null}
					</div>
					<SheetDescription>
						Canonical receipt, application, refund, and audit details.
					</SheetDescription>
				</SheetHeader>
				<ScrollArea className="min-h-0 flex-1">
					{query.isPending ? (
						<div className="space-y-4 p-5">
							{skeletonIds.map((skeletonId) => (
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
					) : !transaction ? (
						<div className="p-5 text-sm text-muted-foreground">
							Payment not found.
						</div>
					) : (
						<div className="space-y-5 p-5">
							<div className="grid gap-3 sm:grid-cols-3">
								<MoneyTile
									label="Received"
									value={transaction.receivedAmount}
								/>
								<MoneyTile label="Net" value={transaction.netAmount} />
								<MoneyTile
									label="Unapplied"
									value={transaction.unappliedAmount}
									warning={transaction.unappliedAmount > 0}
								/>
							</div>
							<section className="rounded-xl border">
								<DetailRow
									label="Customer"
									value={transaction.customerName || "Unnamed customer"}
								/>
								<DetailRow
									label="Received"
									value={formatDate(transaction.receivedAt)}
								/>
								<DetailRow
									label="Method"
									value={`${transaction.paymentMethod}${transaction.reference ? ` · ${transaction.reference}` : ""}`}
								/>
								<DetailRow label="Status" value={transaction.status} />
								<DetailRow label="Recorded by" value={transaction.recordedBy} />
								<DetailRow
									label="Description"
									value={transaction.description || "No description"}
									last
								/>
							</section>
							{transaction.exceptionCodes.length ? (
								<section className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
									<div className="mb-3 flex items-center gap-2 font-medium text-amber-800 dark:text-amber-300">
										<CircleAlert className="size-4" />
										Review required
									</div>
									<div className="flex flex-wrap gap-2">
										{transaction.exceptionCodes.map((code) => (
											<Badge
												key={code}
												variant="outline"
												className="capitalize"
											>
												{code.replaceAll("_", " ")}
											</Badge>
										))}
									</div>
								</section>
							) : null}
							<SalesFinanceReconciliationPanel transaction={transaction} />
							{transaction.hasSquarePayment ? (
								<section className="space-y-3 rounded-xl border p-4">
									<div>
										<h3 className="font-semibold">Square refund</h3>
										<p className="mt-1 text-sm text-muted-foreground">
											Review provider identity, capacity, history, and
											allocations in the shared Sales refund workflow.
										</p>
									</div>
									{squareOverview.isPending ? (
										<div className="h-10 animate-pulse rounded-lg bg-muted" />
									) : squareTransaction ? (
										<div className="flex flex-wrap items-center justify-between gap-3">
											<div>
												<p className="font-mono text-sm font-semibold">
													{formatCurrency.format(
														squareTransaction.remainingRefundableCents / 100,
													)}{" "}
													available
												</p>
												<p className="text-xs text-muted-foreground">
													{squareTransaction.refunds.length} refund record(s)
												</p>
											</div>
											<Button
												type="button"
												variant="outline"
												onClick={() => setSquareDetailOpen(true)}
											>
												{auth.can?.editRefundSquare
													? "Review / refund"
													: "View refund history"}
											</Button>
										</div>
									) : (
										<p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
											This historical Square payment has no uniquely verified
											tender identity, so GND keeps it read-only.
										</p>
									)}
								</section>
							) : null}
							<SalesFinancePaymentResolutionPanel transaction={transaction} />
							<section>
								<div className="mb-3 flex items-center justify-between gap-3">
									<h3 className="font-semibold">Invoice applications</h3>
									<Badge variant="secondary">
										{transaction.applications.length}
									</Badge>
								</div>
								<div className="overflow-hidden rounded-xl border">
									{transaction.applications.length ? (
										transaction.applications.map((application, index) => (
											<div
												key={application.id}
												className="flex items-center justify-between gap-4 border-b px-4 py-3 last:border-b-0"
											>
												<div className="min-w-0">
													<p className="truncate font-mono text-sm font-medium">
														{application.orderNo}
													</p>
													<p className="truncate text-xs text-muted-foreground">
														{application.customerName || "Unnamed customer"}
													</p>
												</div>
												<p className="shrink-0 font-mono text-sm font-semibold">
													{formatCurrency.format(application.amount)}
												</p>
											</div>
										))
									) : (
										<p className="px-4 py-8 text-center text-sm text-muted-foreground">
											This payment is not applied to an invoice.
										</p>
									)}
								</div>
							</section>
						</div>
					)}
				</ScrollArea>
				{squareTransaction && primaryApplication ? (
					<SquarePaymentTransactionSheet
						transaction={squareTransaction}
						salesOrderId={primaryApplication.orderId}
						open={squareDetailOpen}
						refundOpen={squareRefundOpen}
						onRefundOpenChange={setSquareRefundOpen}
						onOpenChange={setSquareDetailOpen}
						onCreated={async () => {
							await Promise.all([query.refetch(), squareOverview.refetch()]);
						}}
					/>
				) : null}
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

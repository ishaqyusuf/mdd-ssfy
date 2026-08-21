"use client";

import { useAuth } from "@/hooks/use-auth";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { formatCurrency } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import SalesOverviewSheet from "@gnd/ui/custom/sheet-v2";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@gnd/ui/sheet";
import { Skeleton } from "@gnd/ui/skeleton";
import { useMutation, useQuery } from "@gnd/ui/tanstack";
import { Textarea } from "@gnd/ui/textarea";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { syncSingleOrderPrincipalAllocation } from "./refund-form-state";

type Props = {
	salesId?: string;
	onCreatePayment?: () => void;
	onViewTransaction?: (transactionId: string) => void;
};

const money = (cents: number) => formatCurrency.format(cents / 100);

function statusTone(status?: string | null) {
	const value = status?.toLowerCase();
	if (value === "completed" || value === "success" || value === "applied") {
		return "border-emerald-200 bg-emerald-50 text-emerald-800";
	}
	if (
		value === "pending" ||
		value === "not_submitted" ||
		value === "reserved"
	) {
		return "border-amber-200 bg-amber-50 text-amber-800";
	}
	if (value === "failed" || value === "rejected" || value === "apply_failed") {
		return "border-red-200 bg-red-50 text-red-800";
	}
	return "border-border bg-muted/40 text-muted-foreground";
}

function SummaryCard({
	label,
	value,
	tone,
}: {
	label: string;
	value: number;
	tone?: "positive" | "warning" | "negative";
}) {
	return (
		<div className="rounded-xl border bg-card p-3 shadow-xs">
			<p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
				{label}
			</p>
			<p
				className={cn(
					"mt-1 font-mono text-lg font-semibold tabular-nums",
					tone === "positive" && "text-emerald-700",
					tone === "warning" && "text-amber-700",
					tone === "negative" && "text-red-700",
				)}
			>
				{money(value)}
			</p>
		</div>
	);
}

export function TransactionsTab({
	salesId,
	onCreatePayment,
	onViewTransaction,
}: Props) {
	const trpc = useTRPC();
	const route = useSalesOverviewQuery();
	const query = useQuery(
		trpc.salesRefunds.overview.queryOptions(
			{ orderNo: salesId || "" },
			{ enabled: Boolean(salesId), refetchInterval: 15_000 },
		),
	);
	const viewTransaction = (transactionId: string) => {
		if (onViewTransaction) {
			onViewTransaction(transactionId);
			return;
		}
		route.setParams({ salesTransaction: transactionId });
	};

	if (query.isPending) {
		return (
			<div className="p-1" aria-label="Loading sales transactions">
				<div className="flex items-center justify-between border-b py-4">
					<div className="space-y-2">
						<Skeleton className="h-5 w-28" />
						<Skeleton className="h-4 w-52" />
					</div>
					<Skeleton className="h-9 w-32" />
				</div>
				<Skeleton className="my-4 h-14 w-full" />
				<div className="space-y-1 border-y py-2">
					<Skeleton className="h-20 w-full" />
					<Skeleton className="h-20 w-full" />
				</div>
			</div>
		);
	}
	if (query.isError) {
		return (
			<div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
				<p className="font-semibold">Transactions could not be loaded.</p>
				<p className="mt-1">{query.error.message}</p>
				<Button
					className="mt-4"
					size="sm"
					variant="outline"
					onClick={() => query.refetch()}
				>
					Try again
				</Button>
			</div>
		);
	}

	const summary = query.data?.summary;
	const transactions = query.data?.transactions || [];
	const amountDueCents = query.data?.order.amountDueCents || 0;
	const paymentActionDisabled = !onCreatePayment || amountDueCents <= 0;
	const transactionLabel = `${transactions.length} transaction${transactions.length === 1 ? "" : "s"}`;
	return (
		<div className="p-1 pb-24">
			<header className="flex flex-wrap items-center justify-between gap-3 border-b py-4">
				<div>
					<h3 className="text-sm font-semibold">Transactions</h3>
					<p className="mt-1 text-xs text-muted-foreground">
						{transactionLabel} for {query.data?.order.orderNo}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button
						type="button"
						size="icon"
						variant="ghost"
						aria-label="Refresh transactions"
						title="Refresh transactions"
						onClick={() => query.refetch()}
						disabled={query.isFetching}
					>
						<Icons.RotateCcw
							className={cn("size-4", query.isFetching && "animate-spin")}
						/>
					</Button>
					<Button
						type="button"
						size="sm"
						disabled={paymentActionDisabled}
						title={
							amountDueCents <= 0 ? "This order has no balance due" : undefined
						}
						onClick={onCreatePayment}
					>
						<Icons.payment className="size-4" />
						Make payment
					</Button>
				</div>
			</header>

			<section
				aria-label="Order payment summary"
				className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b py-4"
			>
				<div>
					<p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
						Balance due
					</p>
					<p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
						{money(amountDueCents)}
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
					<p>
						<span className="text-muted-foreground">Received</span>{" "}
						<strong className="font-mono tabular-nums text-emerald-700">
							{money(summary?.receivedCents || 0)}
						</strong>
					</p>
					{(summary?.completedRefundCents || 0) > 0 ? (
						<p>
							<span className="text-muted-foreground">Refunded</span>{" "}
							<strong className="font-mono tabular-nums text-red-700">
								{money(summary?.completedRefundCents || 0)}
							</strong>
						</p>
					) : null}
					{(summary?.pendingRefundCents || 0) > 0 ? (
						<p>
							<span className="text-muted-foreground">Pending refund</span>{" "}
							<strong className="font-mono tabular-nums text-amber-700">
								{money(summary?.pendingRefundCents || 0)}
							</strong>
						</p>
					) : null}
				</div>
			</section>

			{transactions.length ? (
				<section aria-label="Payment activity" className="divide-y border-b">
					{transactions.map((item) => {
						const paymentNumber = item.transactionId || item.salesPaymentId;
						const hasRefund = item.completedRefundCents > 0;
						const hasPendingRefund = item.pendingRefundCents > 0;

						return (
							<button
								key={item.id}
								type="button"
								className="group flex w-full items-center gap-3 py-4 text-left transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
								onClick={() => viewTransaction(item.id)}
							>
								<span className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground group-hover:text-foreground">
									<Icons.payment className="size-4" />
								</span>
								<span className="min-w-0 flex-1">
									<span className="flex flex-wrap items-center gap-2">
										<strong className="text-sm">
											Payment #{paymentNumber}
										</strong>
										<Badge
											variant="outline"
											className={cn(
												"text-[10px] uppercase",
												statusTone(item.status),
											)}
										>
											{item.status || "unknown"}
										</Badge>
									</span>
									<span className="mt-1 block text-xs capitalize text-muted-foreground">
										{item.paymentMethod.replaceAll("-", " ")}
										{" · "}
										{item.createdAt
											? format(new Date(item.createdAt), "MMM d, yyyy · h:mm a")
											: "Date unavailable"}
									</span>
								</span>
								<span className="shrink-0 text-right">
									<strong className="block font-mono text-sm tabular-nums">
										{money(item.netCents)}
									</strong>
									<span className="mt-1 block text-[11px] text-muted-foreground">
										{hasRefund
											? `${money(item.completedRefundCents)} refunded`
											: hasPendingRefund
												? `${money(item.pendingRefundCents)} refund pending`
												: "Received"}
									</span>
								</span>
								<Icons.ChevronRight className="size-4 shrink-0 text-muted-foreground" />
							</button>
						);
					})}
				</section>
			) : (
				<section className="flex min-h-[340px] flex-col items-center justify-center px-6 py-12 text-center">
					<span className="flex size-12 items-center justify-center rounded-full border bg-muted/25 text-muted-foreground">
						<Icons.Receipt className="size-5" />
					</span>
					<h3 className="mt-4 text-sm font-semibold">No transactions yet</h3>
					<p className="mt-1 max-w-xs text-sm text-muted-foreground">
						Collect the first payment for this order. It will appear here with
						its receipt and refund history.
					</p>
					<Button
						type="button"
						className="mt-5"
						disabled={paymentActionDisabled}
						onClick={onCreatePayment}
					>
						<Icons.payment className="size-4" />
						Make payment
					</Button>
				</section>
			)}
		</div>
	);
}

type Transaction =
	RouterOutputs["salesRefunds"]["overview"]["transactions"][number];

export function PaymentTransactionPane({
	salesId,
	transactionId,
	onClose,
}: {
	salesId: string;
	transactionId: string;
	onClose: () => void;
}) {
	const trpc = useTRPC();
	const route = useSalesOverviewQuery();
	const query = useQuery(
		trpc.salesRefunds.overview.queryOptions(
			{ orderNo: salesId },
			{ refetchInterval: 15_000 },
		),
	);
	const transaction = query.data?.transactions.find(
		(item) => item.id === transactionId,
	);
	const title = transaction
		? `Payment #${transaction.transactionId || transaction.salesPaymentId}`
		: "Payment details";
	if (transaction && route.salesRefund === "new") {
		return (
			<RefundSheet
				transaction={transaction}
				salesOrderId={query.data?.order.id || 0}
				open
				variant="secondary"
				onOpenChange={(open) =>
					route.setParams({ salesRefund: open ? "new" : null })
				}
				onCreated={() => query.refetch()}
			/>
		);
	}

	return (
		<SalesOverviewSheet.SecondaryContent
			Header={
				<SalesOverviewSheet.SecondaryHeader
					title={title}
					description={
						transaction?.description || "Payment and refund activity."
					}
				/>
			}
			Footer={
				transaction ? (
					<SalesOverviewSheet.SecondaryFooter>
						<PaymentTransactionActions
							transaction={transaction}
							onRefundOpenChange={(open) =>
								route.setParams({ salesRefund: open ? "new" : null })
							}
							onClose={onClose}
						/>
					</SalesOverviewSheet.SecondaryFooter>
				) : null
			}
		>
			{query.isPending ? (
				<div className="space-y-4" aria-label="Loading payment details">
					<div className="grid grid-cols-2 gap-3">
						{["received", "available", "completed", "pending"].map((key) => (
							<Skeleton key={key} className="h-20 rounded-xl" />
						))}
					</div>
					<Skeleton className="h-36 rounded-xl" />
				</div>
			) : query.isError ? (
				<div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
					<p className="font-semibold">Payment details could not be loaded.</p>
					<p className="mt-1">{query.error.message}</p>
					<Button
						className="mt-4"
						size="sm"
						variant="outline"
						onClick={() => query.refetch()}
					>
						Try again
					</Button>
				</div>
			) : transaction ? (
				<PaymentTransactionDetails transaction={transaction} />
			) : (
				<div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
					This payment is no longer available for this sale.
				</div>
			)}
		</SalesOverviewSheet.SecondaryContent>
	);
}

function PaymentTransactionDetails({
	transaction,
}: {
	transaction: Transaction;
}) {
	return (
		<>
			<div className="grid grid-cols-2 gap-3">
				<SummaryCard label="Received" value={transaction.receivedCents} />
				<SummaryCard
					label="Available to refund"
					value={transaction.remainingRefundableCents}
					tone="positive"
				/>
				<SummaryCard
					label="Completed refunds"
					value={transaction.completedRefundCents}
					tone="negative"
				/>
				<SummaryCard
					label="Pending refunds"
					value={transaction.pendingRefundCents}
					tone="warning"
				/>
			</div>
			<div className="rounded-xl border p-4 text-sm">
				<div className="flex justify-between gap-4">
					<span className="text-muted-foreground">Method</span>
					<span className="capitalize">
						{transaction.paymentMethod.replaceAll("-", " ")}
					</span>
				</div>
				<div className="mt-2 flex justify-between gap-4">
					<span className="text-muted-foreground">Provider status</span>
					<Badge variant="outline" className={statusTone(transaction.status)}>
						{transaction.status || "unknown"}
					</Badge>
				</div>
				<div className="mt-2 flex justify-between gap-4">
					<span className="text-muted-foreground">Square identity</span>
					<span className="max-w-[260px] truncate font-mono text-xs">
						{transaction.tender?.providerPaymentId ||
							"Historical identity unavailable"}
					</span>
				</div>
			</div>
			{transaction.refunds.length ? (
				<div>
					<h4 className="mb-2 text-sm font-semibold">Refund history</h4>
					<div className="space-y-2">
						{transaction.refunds.map((refund) => (
							<div key={refund.id} className="rounded-lg border p-3 text-sm">
								<div className="flex items-center justify-between gap-3">
									<span className="font-mono font-semibold">
										-{money(refund.amountCents)}
									</span>
									<Badge
										variant="outline"
										className={statusTone(refund.providerStatus)}
									>
										{refund.providerStatus.replaceAll("_", " ")}
									</Badge>
								</div>
								<p className="mt-1 text-xs text-muted-foreground">
									{refund.reason}
								</p>
								{refund.failureDetail ? (
									<p className="mt-2 text-xs text-red-700">
										{refund.failureDetail}
									</p>
								) : null}
							</div>
						))}
					</div>
				</div>
			) : null}
		</>
	);
}

function PaymentTransactionActions({
	transaction,
	onRefundOpenChange,
	onClose,
}: {
	transaction: Transaction;
	onRefundOpenChange: (open: boolean) => void;
	onClose: () => void;
}) {
	const auth = useAuth();
	return (
		<>
			<Button type="button" variant="outline" onClick={onClose}>
				Close
			</Button>
			<Button
				type="button"
				disabled={!auth.can?.editRefundSquare || !transaction.refundable}
				title={
					!auth.can?.editRefundSquare
						? "Requires Square refund permission"
						: undefined
				}
				onClick={() => onRefundOpenChange(true)}
			>
				<Icons.RotateCcw className="mr-2 size-4" />
				Refund payment
			</Button>
		</>
	);
}

export function SquarePaymentTransactionSheet({
	transaction,
	salesOrderId,
	open,
	refundOpen,
	onRefundOpenChange,
	onOpenChange,
	onCreated,
}: {
	transaction: Transaction | null;
	salesOrderId: number;
	open: boolean;
	refundOpen: boolean;
	onRefundOpenChange: (open: boolean) => void;
	onOpenChange: (open: boolean) => void;
	onCreated: () => Promise<unknown>;
}) {
	if (!transaction) return null;
	return (
		<>
			<Sheet open={open} onOpenChange={onOpenChange}>
				<SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-xl">
					<SheetHeader className="border-b px-5 py-4 pr-12">
						<SheetTitle>
							Payment #{transaction.transactionId || transaction.salesPaymentId}
						</SheetTitle>
						<SheetDescription>{transaction.description}</SheetDescription>
					</SheetHeader>
					<div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
						<PaymentTransactionDetails transaction={transaction} />
					</div>
					<SheetFooter className="border-t bg-background px-5 py-4">
						<PaymentTransactionActions
							transaction={transaction}
							onRefundOpenChange={onRefundOpenChange}
							onClose={() => onOpenChange(false)}
						/>
					</SheetFooter>
				</SheetContent>
			</Sheet>
			<RefundSheet
				transaction={transaction}
				salesOrderId={salesOrderId}
				open={refundOpen}
				onOpenChange={onRefundOpenChange}
				onCreated={onCreated}
			/>
		</>
	);
}

function RefundSheet({
	transaction,
	salesOrderId,
	open,
	onOpenChange,
	onCreated,
	variant = "sheet",
}: {
	transaction: Transaction;
	salesOrderId: number;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreated: () => Promise<unknown>;
	variant?: "secondary" | "sheet";
}) {
	const trpc = useTRPC();
	const [principal, setPrincipal] = useState("");
	const [ccc, setCcc] = useState("0.00");
	const [tip, setTip] = useState("0.00");
	const [reason, setReason] = useState("Customer request");
	const [note, setNote] = useState("");
	const [commercialActionType, setCommercialActionType] = useState<
		"customer_request" | "cancellation" | "duplicate_payment"
	>("customer_request");
	const [commercialActionId, setCommercialActionId] = useState("");
	const eligibleOrders = transaction.tender?.eligibleOrders || [];
	const [allocations, setAllocations] = useState<Record<number, string>>({});
	useEffect(() => {
		if (!open) return;
		const defaultAmount = (transaction.remainingRefundableCents / 100).toFixed(
			2,
		);
		setPrincipal(defaultAmount);
		setCcc("0.00");
		setTip("0.00");
		setCommercialActionType("customer_request");
		setCommercialActionId("");
		setAllocations({ [salesOrderId]: defaultAmount });
	}, [open, salesOrderId, transaction.remainingRefundableCents]);
	const principalCents = Math.round(Number(principal || 0) * 100);
	const cccCents = Math.round(Number(ccc || 0) * 100);
	const tipCents = Math.round(Number(tip || 0) * 100);
	const totalCents = principalCents + cccCents + tipCents;
	const allocatedCents = useMemo(
		() =>
			Object.values(allocations).reduce(
				(sum, value) => sum + Math.round(Number(value || 0) * 100),
				0,
			),
		[allocations],
	);
	const create = useMutation(
		trpc.salesRefunds.create.mutationOptions({
			async onSuccess(result) {
				toast.success(
					result.queued
						? "Refund requested"
						: "Refund saved for automatic retry",
					{
						description:
							"Square is processing the refund. The order balance changes only after completion.",
					},
				);
				onOpenChange(false);
				await onCreated();
			},
			onError(error) {
				toast.error("Refund could not be requested", {
					description: error.message,
				});
			},
		}),
	);
	const valid = Boolean(
		transaction.tender &&
			principalCents >= 0 &&
			totalCents > 0 &&
			totalCents <= transaction.remainingRefundableCents &&
			allocatedCents === principalCents &&
			reason.trim().length >= 3 &&
			(commercialActionType !== "cancellation" ||
				commercialActionId.trim().length > 0),
	);
	const body = (
		<>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<div className="space-y-1.5 sm:col-span-1">
					<Label htmlFor="refund-principal">Principal</Label>
					<Input
						id="refund-principal"
						inputMode="decimal"
						value={principal}
						onChange={(event) => {
							const nextPrincipal = event.target.value;
							setPrincipal(nextPrincipal);
							setAllocations((current) =>
								syncSingleOrderPrincipalAllocation({
									allocations: current,
									eligibleOrderIds: eligibleOrders.map((order) => order.id),
									principal: nextPrincipal,
									salesOrderId,
								}),
							);
						}}
					/>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="refund-ccc">CCC</Label>
					<Input
						id="refund-ccc"
						inputMode="decimal"
						value={ccc}
						onChange={(e) => setCcc(e.target.value)}
					/>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="refund-tip">Tip</Label>
					<Input
						id="refund-tip"
						inputMode="decimal"
						value={tip}
						onChange={(e) => setTip(e.target.value)}
					/>
				</div>
			</div>
			<div className="rounded-lg bg-muted/45 p-3 text-sm">
				<div className="flex justify-between">
					<span>Total to customer</span>
					<strong className="font-mono">{money(totalCents)}</strong>
				</div>
				<p className="mt-1 text-xs text-muted-foreground">
					Partial refunds default to principal. Add CCC or tip only when the
					commercial action requires it.
				</p>
			</div>
			<div className="space-y-2">
				<div>
					<Label>Order allocation</Label>
					<p className="text-xs text-muted-foreground">
						Principal allocations must total {money(principalCents)}.
					</p>
				</div>
				{eligibleOrders.map((order) => (
					<div
						key={order.id}
						className="flex items-center gap-3 rounded-lg border p-3"
					>
						<div className="min-w-0 flex-1">
							<p className="font-medium">{order.orderNo}</p>
							<p className="text-xs text-muted-foreground">
								Invoice {money(order.grandTotalCents)}
							</p>
						</div>
						<Input
							aria-label={`Principal allocated to ${order.orderNo}`}
							className="w-28 text-right font-mono"
							inputMode="decimal"
							value={allocations[order.id] || ""}
							onChange={(e) =>
								setAllocations((current) => ({
									...current,
									[order.id]: e.target.value,
								}))
							}
						/>
					</div>
				))}
				<p
					className={cn(
						"text-xs",
						allocatedCents === principalCents
							? "text-emerald-700"
							: "text-red-700",
					)}
				>
					Allocated {money(allocatedCents)} of {money(principalCents)}
				</p>
			</div>
			<div className="space-y-1.5">
				<Label htmlFor="refund-reason">Reason</Label>
				<Input
					id="refund-reason"
					value={reason}
					maxLength={192}
					onChange={(e) => setReason(e.target.value)}
				/>
			</div>
			<div className="space-y-1.5">
				<Label htmlFor="refund-commercial-action">Authorization basis</Label>
				<Select
					value={commercialActionType}
					onValueChange={(value) =>
						setCommercialActionType(value as typeof commercialActionType)
					}
				>
					<SelectTrigger id="refund-commercial-action">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="customer_request">
							Payment correction / customer request
						</SelectItem>
						<SelectItem value="duplicate_payment">Duplicate payment</SelectItem>
						<SelectItem value="cancellation">Completed cancellation</SelectItem>
					</SelectContent>
				</Select>
			</div>
			{commercialActionType === "cancellation" ? (
				<div className="space-y-1.5">
					<Label htmlFor="refund-commercial-action-id">
						Completed action reference
					</Label>
					<Input
						id="refund-commercial-action-id"
						value={commercialActionId}
						maxLength={191}
						onChange={(event) => setCommercialActionId(event.target.value)}
						placeholder="Cancellation or adjustment ID"
					/>
				</div>
			) : null}
			<div className="space-y-1.5">
				<Label htmlFor="refund-note">Internal note</Label>
				<Textarea
					id="refund-note"
					value={note}
					maxLength={2000}
					onChange={(e) => setNote(e.target.value)}
					placeholder="Optional context for Finance and Sales Activity"
				/>
			</div>
			<div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
				<strong>Provider-first safety:</strong> this request does not reopen the
				invoice until Square reports COMPLETED. Completed refunds cannot be
				edited or deleted.
			</div>
		</>
	);
	const actions = (
		<>
			<Button
				type="button"
				variant="outline"
				onClick={() => onOpenChange(false)}
				disabled={create.isPending}
			>
				Cancel
			</Button>
			<Button
				type="button"
				disabled={!valid || create.isPending}
				onClick={() => {
					const tenderPaymentId = transaction.tender?.id;
					if (!tenderPaymentId) return;
					create.mutate({
						tenderPaymentId,
						principalCents,
						cccCents,
						tipCents,
						reason: reason.trim(),
						note: note.trim() || null,
						commercialActionType,
						commercialActionId: commercialActionId.trim() || null,
						allocations: eligibleOrders
							.map((order) => ({
								salesOrderId: order.id,
								principalCents: Math.round(
									Number(allocations[order.id] || 0) * 100,
								),
								cccCents: order.id === salesOrderId ? cccCents : 0,
								tipCents: order.id === salesOrderId ? tipCents : 0,
							}))
							.filter(
								(item) => item.principalCents || item.cccCents || item.tipCents,
							),
					});
				}}
			>
				{create.isPending ? "Submitting…" : `Refund ${money(totalCents)}`}
			</Button>
		</>
	);
	const description = (
		<>
			Available {money(transaction.remainingRefundableCents)}. Pending refunds
			reserve capacity immediately.
		</>
	);
	if (variant === "secondary") {
		return (
			<SalesOverviewSheet.SecondaryContent
				Header={
					<SalesOverviewSheet.SecondaryHeader
						title="Refund Square payment"
						description={description}
					/>
				}
				Footer={
					<SalesOverviewSheet.SecondaryFooter>
						{actions}
					</SalesOverviewSheet.SecondaryFooter>
				}
			>
				{body}
			</SalesOverviewSheet.SecondaryContent>
		);
	}
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-lg">
				<SheetHeader className="border-b px-5 py-4 pr-12">
					<SheetTitle>Refund Square payment</SheetTitle>
					<SheetDescription>{description}</SheetDescription>
				</SheetHeader>
				<div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">{body}</div>
				<SheetFooter className="border-t bg-background px-5 py-4">
					{actions}
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}

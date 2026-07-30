"use client";

import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@gnd/ui/dialog";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import { Textarea } from "@gnd/ui/textarea";
import { toast } from "@gnd/ui/use-toast";
import type { SalesPaymentMethods, SalesRefundMethods } from "@sales/constants";
import { CircleAlert, Loader2, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

type Transaction = NonNullable<
	RouterOutputs["salesFinance"]["transactionDetail"]
>;

type ResolutionAction = "cancel" | "refund";
type RefundMode = "full" | "part";

const cancellationReasons = [
	{ value: "duplicate", label: "Duplicate payment" },
	{ value: "customer-repay", label: "Customer will repay" },
	{ value: "refund-wallet", label: "Refund to wallet" },
	{ value: "fraud", label: "Fraudulent transaction" },
	{ value: "error", label: "Processing error" },
] as const;

const refundReasons = [
	{ value: "overpayment", label: "Overpayment" },
	{ value: "customer-request", label: "Customer request" },
	{ value: "order-cancelled", label: "Order cancelled" },
	{ value: "duplicate", label: "Duplicate charge" },
] as const;

const refundMethods = [
	{ value: "wallet", label: "Customer wallet" },
	{ value: "check", label: "Check" },
	{ value: "cash", label: "Cash" },
	{ value: "zelle", label: "Zelle" },
	{ value: "wire", label: "Wire transfer" },
] satisfies Array<{ value: SalesRefundMethods; label: string }>;

function paymentMethod(transaction: Transaction): SalesPaymentMethods | null {
	const raw = transaction.rawPaymentMethod?.trim().toLowerCase();
	if (
		raw &&
		[
			"link",
			"terminal",
			"check",
			"cash",
			"zelle",
			"credit-card",
			"wire",
			"wallet",
		].includes(raw)
	) {
		return raw as SalesPaymentMethods;
	}
	if (transaction.paymentMethod === "card") return "credit-card";
	if (["check", "cash", "zelle", "wire"].includes(transaction.paymentMethod)) {
		return transaction.paymentMethod as SalesPaymentMethods;
	}
	return null;
}

export function SalesFinancePaymentResolutionPanel({
	transaction,
}: {
	transaction: Transaction;
}) {
	const auth = useAuth();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const [action, setAction] = useState<ResolutionAction>("cancel");
	const [reason, setReason] = useState("duplicate");
	const [note, setNote] = useState("");
	const [refundMode, setRefundMode] = useState<RefundMode>("full");
	const [refundMethod, setRefundMethod] =
		useState<SalesRefundMethods>("wallet");
	const [refundAmount, setRefundAmount] = useState(
		String(transaction.receivedAmount),
	);
	const sourcePaymentMethod = useMemo(
		() => paymentMethod(transaction),
		[transaction],
	);
	const reasons = action === "cancel" ? cancellationReasons : refundReasons;
	const amount = Number(refundAmount);
	const isAlreadyCancelled = ["cancelled", "canceled"].includes(
		transaction.status.trim().toLowerCase(),
	);
	const hasInvoiceApplication = transaction.applications.length > 0;
	const canResolve = Boolean(auth.can?.editOrderPayment);
	const validRefund =
		action === "cancel" ||
		(Number.isFinite(amount) &&
			amount > 0 &&
			amount <= transaction.receivedAmount);
	const canSubmit =
		canResolve &&
		hasInvoiceApplication &&
		Boolean(sourcePaymentMethod) &&
		!isAlreadyCancelled &&
		note.trim().length >= 10 &&
		validRefund;

	async function invalidateFinance() {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: trpc.salesFinance.transactionDetail.queryKey({
					id: transaction.id,
				}),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.salesFinance.transactions.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.salesFinance.summary.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.salesFinance.analytics.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.salesFinance.resolutions.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.salesFinance.resolutionsSummary.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.salesFinance.receivables.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.salesFinance.receivablesSummary.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.sales.getSalesResolutions.queryKey(),
			}),
		]);
	}

	const resolve = useMutation(
		trpc.salesFinance.resolutionPayment.mutationOptions({
			async onSuccess() {
				setOpen(false);
				setNote("");
				toast({
					variant: "success",
					title: "Payment resolution applied",
					description:
						"Payment history, account balances, and Finance queues were refreshed.",
				});
				await invalidateFinance();
			},
			onError(error) {
				toast({
					variant: "error",
					title: "Unable to resolve payment",
					description: error.message,
				});
			},
		}),
	);

	return (
		<section className="space-y-3 rounded-xl border p-4">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="flex min-w-0 items-start gap-3">
					<ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-700" />
					<div>
						<h3 className="font-semibold">Payment resolution</h3>
						<p className="mt-1 text-sm text-muted-foreground">
							Correct duplicate, cancelled, or refundable receipts with an
							audited account update.
						</p>
					</div>
				</div>
				{canResolve &&
				hasInvoiceApplication &&
				sourcePaymentMethod &&
				!isAlreadyCancelled ? (
					<Dialog open={open} onOpenChange={setOpen}>
						<DialogTrigger asChild>
							<Button type="button" variant="outline">
								Resolve payment
							</Button>
						</DialogTrigger>
						<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
							<DialogHeader>
								<DialogTitle>
									Resolve payment #{transaction.paymentNo}
								</DialogTitle>
								<DialogDescription>
									This changes the payment source and recalculates linked
									invoice balances. Add clear audit evidence before applying.
								</DialogDescription>
							</DialogHeader>
							<div className="space-y-4">
								<div className="grid gap-4 sm:grid-cols-2">
									<div className="space-y-2">
										<Label>Resolution action</Label>
										<Select
											value={action}
											onValueChange={(value) => {
												const nextAction = value as ResolutionAction;
												setAction(nextAction);
												setReason(
													nextAction === "cancel"
														? cancellationReasons[0].value
														: refundReasons[0].value,
												);
											}}
										>
											<SelectTrigger aria-label="Resolution action">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="cancel">Cancel payment</SelectItem>
												<SelectItem value="refund">Process refund</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className="space-y-2">
										<Label>Reason</Label>
										<Select value={reason} onValueChange={setReason}>
											<SelectTrigger aria-label="Resolution reason">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{reasons.map((option) => (
													<SelectItem key={option.value} value={option.value}>
														{option.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								</div>
								{action === "refund" ? (
									<div className="grid gap-4 sm:grid-cols-2">
										<div className="space-y-2">
											<Label>Refund mode</Label>
											<Select
												value={refundMode}
												onValueChange={(value) => {
													const mode = value as RefundMode;
													setRefundMode(mode);
													if (mode === "full") {
														setRefundAmount(String(transaction.receivedAmount));
													}
												}}
											>
												<SelectTrigger aria-label="Refund mode">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="full">Full refund</SelectItem>
													<SelectItem value="part">Partial refund</SelectItem>
												</SelectContent>
											</Select>
										</div>
										<div className="space-y-2">
											<Label>Refund method</Label>
											<Select
												value={refundMethod}
												onValueChange={(value) =>
													setRefundMethod(value as SalesRefundMethods)
												}
											>
												<SelectTrigger aria-label="Refund method">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{refundMethods.map((option) => (
														<SelectItem key={option.value} value={option.value}>
															{option.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
										<div className="space-y-2 sm:col-span-2">
											<Label htmlFor="sales-finance-refund-amount">
												Refund amount
											</Label>
											<Input
												id="sales-finance-refund-amount"
												type="number"
												min="0.01"
												max={transaction.receivedAmount}
												step="0.01"
												disabled={refundMode === "full"}
												value={refundAmount}
												onChange={(event) =>
													setRefundAmount(event.target.value)
												}
											/>
										</div>
									</div>
								) : null}
								<div className="space-y-2">
									<Label htmlFor="sales-finance-resolution-note">
										Audit evidence
									</Label>
									<Textarea
										id="sales-finance-resolution-note"
										value={note}
										onChange={(event) => setNote(event.target.value)}
										placeholder="Explain what was verified and why this correction is required."
										maxLength={1_000}
									/>
									<p className="text-xs text-muted-foreground">
										At least 10 characters. The operator, reason, timestamp, and
										source history are retained.
									</p>
								</div>
							</div>
							<DialogFooter>
								<Button
									type="button"
									variant="outline"
									onClick={() => setOpen(false)}
								>
									Keep payment
								</Button>
								<Button
									type="button"
									disabled={!canSubmit || resolve.isPending}
									onClick={() => {
										if (!sourcePaymentMethod) return;
										resolve.mutate({
											transactionId: transaction.id,
											action,
											reason,
											note: note.trim(),
											refundAmount:
												action === "refund"
													? refundMode === "full"
														? transaction.receivedAmount
														: amount
													: null,
											refundMethod,
											refundMode,
											paymentMethod: sourcePaymentMethod,
											squarePaymentId: null,
										});
									}}
								>
									{resolve.isPending ? (
										<Loader2 className="mr-2 size-4 animate-spin" />
									) : null}
									Apply resolution
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				) : null}
			</div>

			{!canResolve ? (
				<p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
					You can inspect payment evidence, but resolution requires the Order
					Payment permission.
				</p>
			) : !hasInvoiceApplication ? (
				<p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
					<CircleAlert className="mt-0.5 size-3.5 shrink-0" />
					Link this receipt to an invoice before applying a payment correction.
				</p>
			) : !sourcePaymentMethod ? (
				<p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
					<CircleAlert className="mt-0.5 size-3.5 shrink-0" />
					Classify the payment method before applying a correction.
				</p>
			) : isAlreadyCancelled ? (
				<p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
					This payment is already cancelled. Its audit history remains available
					below.
				</p>
			) : null}
		</section>
	);
}

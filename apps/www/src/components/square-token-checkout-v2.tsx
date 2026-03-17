"use client";

import { openLink } from "@/lib/open-link";
import { Alert, AlertDescription, AlertTitle } from "@gnd/ui/alert";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@gnd/ui/card";
import { Separator } from "@gnd/ui/separator";
import { useMutation, useSuspenseQuery } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { resolveReminderPlanLabel } from "@sales/utils/reminder-pay-plan";
import {
	AlertCircle,
	ArrowRight,
	CheckCircle2,
	Clock3,
	CreditCard,
	Loader2,
	RefreshCw,
	ShieldCheck,
	Wallet,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { _trpc } from "./static-trpc";

interface Props {
	token: string;
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
});

const maxVerificationAttempts = 2;

export function SquareTokenCheckoutV2({ token }: Props) {
	const { data } = useSuspenseQuery(
		_trpc.checkout.initializeCheckout.queryOptions(
			{ token },
			{
				enabled: !!token,
			},
		),
	);
	const [verificationAttempt, setVerificationAttempt] = useState(0);
	const payload = data?.payload;
	const paymentId = payload?.paymentId;
	const walletId = payload?.walletId;

	const {
		data: verificationData,
		isPending: isVerifying,
		mutate: verifyPayment,
	} = useMutation(
		_trpc.checkout.verifyPayment.mutationOptions({
			onError(_error) {
				toast({
					title: "Verification delayed",
					description:
						"We could not confirm the payment yet. You can retry in a moment.",
				});
			},
		}),
	);

	const { isPending: isCreatingCheckout, mutate: createCheckout } = useMutation(
		_trpc.checkout.createSalesCheckoutLink.mutationOptions({
			onSuccess(result) {
				if (!result.paymentLink) {
					toast({
						title: "Checkout link unavailable",
						description: "We could not start the payment session.",
						variant: "destructive",
					});
					return;
				}

				openLink(result.paymentLink);
			},
			onError(error) {
				toast({
					title: "Unable to start checkout",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	useEffect(() => {
		if (!paymentId || !walletId || verificationAttempt > 0) return;

		setVerificationAttempt(1);
		verifyPayment({
			paymentId,
			walletId,
			attempts: 1,
		});
	}, [paymentId, verificationAttempt, verifyPayment, walletId]);

	useEffect(() => {
		if (!paymentId || !walletId) return;
		if (verificationData?.status !== "PENDING") return;
		if (verificationAttempt >= maxVerificationAttempts) return;
		if (isVerifying) return;

		const timeoutId = window.setTimeout(() => {
			const nextAttempt = verificationAttempt + 1;
			setVerificationAttempt(nextAttempt);
			verifyPayment({
				paymentId,
				walletId,
				attempts: nextAttempt,
			});
		}, 2500);

		return () => window.clearTimeout(timeoutId);
	}, [
		isVerifying,
		paymentId,
		verificationAttempt,
		verificationData?.status,
		verifyPayment,
		walletId,
	]);

	const orders = data?.sales ?? [];
	const amountDue =
		payload?.amount ??
		orders.reduce((sum, order) => sum + Number(order.due ?? 0), 0);
	const paymentPlanLabel = resolveReminderPlanLabel({
		payPlan: payload?.payPlan,
		percentage: payload?.percentage,
		preferredAmount: payload?.preferredAmount,
		amount: payload?.amount,
	});
	const amountLabel = payload?.amount ? "Requested amount" : "Amount due";
	const merchantName = data?.customerName || "gnd";
	const hasOrders = orders.length > 0;
	const isInvalidToken =
		!hasOrders &&
		!payload?.paymentId &&
		!payload?.walletId &&
		!(payload?.salesIds?.length ?? 0) &&
		!payload?.amount;

	const state = getCheckoutState({
		hasOrders,
		hasPaymentId: !!paymentId,
		isInvalidToken,
		verifyStatus: verificationData?.status,
	});

	const handleStartPayment = () => {
		createCheckout({ token });
	};

	const handleRetryVerification = () => {
		if (!paymentId || !walletId) return;

		setVerificationAttempt(1);
		verifyPayment({
			paymentId,
			walletId,
			attempts: 1,
		});
	};

	return (
		<div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
			<Card className="overflow-hidden border-slate-200 bg-white shadow-[0_24px_80px_-40px_rgba(15,23,42,0.5)]">
				<CardHeader className="border-b border-slate-100 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_32%),linear-gradient(135deg,_#f8fafc,_#ffffff_55%,_#eff6ff)]">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<Badge
								variant="outline"
								className="border-emerald-200 bg-emerald-50 text-emerald-700"
							>
								Secure checkout
							</Badge>
							<CardTitle className="mt-3 text-3xl font-semibold text-slate-950">
								{state.title}
							</CardTitle>
							<CardDescription className="mt-2 max-w-2xl text-sm text-slate-600">
								{state.description}
							</CardDescription>
						</div>
						<StatusBadge state={state.name} />
					</div>
				</CardHeader>

				<CardContent className="space-y-6 p-6">
					<div className="grid gap-4 md:grid-cols-4">
						<SummaryTile
							icon={<Wallet className="h-4 w-4" />}
							label="Merchant"
							value={merchantName}
						/>
						<SummaryTile
							icon={<CreditCard className="h-4 w-4" />}
							label={amountLabel}
							value={currencyFormatter.format(amountDue)}
						/>
						<SummaryTile
							icon={<CreditCard className="h-4 w-4" />}
							label="Payment plan"
							value={paymentPlanLabel}
						/>
						<SummaryTile
							icon={<ShieldCheck className="h-4 w-4" />}
							label="Token"
							value={`${token.slice(0, 10)}...`}
						/>
					</div>

					{payload?.payPlan === "custom" || payload?.preferredAmount ? (
						<Alert className="border-sky-200 bg-sky-50 text-sky-950">
							<CreditCard className="h-4 w-4 text-sky-700" />
							<AlertTitle>Custom payment request</AlertTitle>
							<AlertDescription>
								This reminder asked the customer to pay a preferred amount now.
								Remaining order balances may still exist after this payment.
							</AlertDescription>
						</Alert>
					) : null}

					{state.name === "invalid" ? (
						<Alert variant="destructive">
							<AlertCircle className="h-4 w-4" />
							<AlertTitle>Invalid payment token</AlertTitle>
							<AlertDescription>
								This token could not be decoded. Please request a fresh payment
								link.
							</AlertDescription>
						</Alert>
					) : null}

					{state.name === "expired" ? (
						<Alert className="border-amber-200 bg-amber-50 text-amber-950">
							<Clock3 className="h-4 w-4 text-amber-700" />
							<AlertTitle>Nothing left to charge</AlertTitle>
							<AlertDescription>
								This checkout link no longer has any open balances attached to
								it.
							</AlertDescription>
						</Alert>
					) : null}

					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
								Order summary
							</h3>
							<span className="text-sm text-slate-500">
								{orders.length} {orders.length === 1 ? "order" : "orders"}
							</span>
						</div>

						<div className="overflow-hidden rounded-2xl border border-slate-200">
							<div className="grid grid-cols-[1.2fr_0.7fr_0.7fr] bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
								<span>Order</span>
								<span>Sales rep</span>
								<span className="text-right">Due</span>
							</div>
							{orders.length ? (
								<div className="divide-y divide-slate-100">
									{orders.map((order) => (
										<div
											key={order.id}
											className="grid grid-cols-[1.2fr_0.7fr_0.7fr] items-center px-4 py-4 text-sm"
										>
											<div>
												<p className="font-medium text-slate-900">
													{order.orderId}
												</p>
												<p className="mt-1 text-xs text-slate-500">
													{order.displayName || order.email || "Customer order"}
												</p>
											</div>
											<span className="text-slate-600">
												#{order.salesRepId}
											</span>
											<span className="text-right font-semibold text-slate-900">
												{currencyFormatter.format(Number(order.due ?? 0))}
											</span>
										</div>
									))}
								</div>
							) : (
								<div className="px-4 py-8 text-sm text-slate-500">
									No payable orders were found for this token.
								</div>
							)}
						</div>
					</div>
				</CardContent>

				<CardFooter className="flex flex-col items-stretch gap-3 border-t border-slate-100 bg-slate-50/70 p-6 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
					<div className="flex items-center gap-2">
						<ShieldCheck className="h-4 w-4 text-emerald-600" />
						<span>Secure payment link and verification flow.</span>
					</div>

					{state.name === "ready" ? (
						<Button
							onClick={handleStartPayment}
							disabled={isCreatingCheckout}
							className="bg-slate-950 text-white hover:bg-slate-800"
						>
							{isCreatingCheckout ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin" />
									Creating checkout link
								</>
							) : (
								<>
									Pay now
									<ArrowRight className="h-4 w-4" />
								</>
							)}
						</Button>
					) : null}

					{state.name === "failed" ? (
						<Button onClick={handleRetryVerification} variant="outline">
							<RefreshCw className="h-4 w-4" />
							Retry verification
						</Button>
					) : null}

					{state.name === "processing" ? (
						<Button
							onClick={handleRetryVerification}
							variant="outline"
							disabled={isVerifying}
						>
							{isVerifying ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin" />
									Checking payment
								</>
							) : (
								<>
									<RefreshCw className="h-4 w-4" />
									Check again
								</>
							)}
						</Button>
					) : null}
				</CardFooter>
			</Card>

			<div className="space-y-6">
				<Card className="border-slate-200 bg-white shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)]">
					<CardHeader>
						<CardTitle className="text-lg text-slate-950">
							Payment status
						</CardTitle>
						<CardDescription className="text-slate-600">
							Check the latest payment state and references for this checkout.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<StatusPanel state={state.name} />
						<Separator />
						<div className="space-y-3 text-sm text-slate-600">
							<div className="flex items-center justify-between">
								<span>Verification attempts</span>
								<span className="font-medium text-slate-900">
									{verificationAttempt || 0}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span>Wallet reference</span>
								<span className="font-medium text-slate-900">
									{walletId ?? "N/A"}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span>Payment reference</span>
								<span className="font-medium text-slate-900">
									{paymentId ?? "Pending"}
								</span>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

function SummaryTile({
	icon,
	label,
	value,
}: {
	icon: ReactNode;
	label: string;
	value: string;
}) {
	return (
		<div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
			<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
				{icon}
				<span>{label}</span>
			</div>
			<p className="mt-3 text-base font-semibold text-slate-950">{value}</p>
		</div>
	);
}

function StatusPanel({ state }: { state: CheckoutStateName }) {
	if (state === "paid") {
		return (
			<Alert className="border-emerald-200 bg-emerald-50 text-emerald-950">
				<CheckCircle2 className="h-4 w-4 text-emerald-700" />
				<AlertTitle>Payment received</AlertTitle>
				<AlertDescription>
					Your payment has been confirmed successfully.
				</AlertDescription>
			</Alert>
		);
	}

	if (state === "failed") {
		return (
			<Alert variant="destructive">
				<AlertCircle className="h-4 w-4" />
				<AlertTitle>Verification failed</AlertTitle>
				<AlertDescription>
					We could not confirm the payment after the redirect. You can retry the
					check from this page.
				</AlertDescription>
			</Alert>
		);
	}

	if (state === "processing") {
		return (
			<Alert className="border-sky-200 bg-sky-50 text-sky-950">
				<Loader2 className="h-4 w-4 animate-spin text-sky-700" />
				<AlertTitle>Processing payment</AlertTitle>
				<AlertDescription>
					We are checking the latest settlement status for this payment.
				</AlertDescription>
			</Alert>
		);
	}

	if (state === "expired") {
		return (
			<Alert className="border-amber-200 bg-amber-50 text-amber-950">
				<Clock3 className="h-4 w-4 text-amber-700" />
				<AlertTitle>Link expired</AlertTitle>
				<AlertDescription>
					The token resolves, but there are no unpaid orders left on it.
				</AlertDescription>
			</Alert>
		);
	}

	if (state === "invalid") {
		return (
			<Alert variant="destructive">
				<AlertCircle className="h-4 w-4" />
				<AlertTitle>Token invalid</AlertTitle>
				<AlertDescription>
					We could not load payable data from this token.
				</AlertDescription>
			</Alert>
		);
	}

	return (
		<Alert className="border-slate-200 bg-slate-50 text-slate-900">
			<CreditCard className="h-4 w-4 text-slate-700" />
			<AlertTitle>Ready to pay</AlertTitle>
			<AlertDescription>
				Launching payment will create a fresh Square checkout link.
			</AlertDescription>
		</Alert>
	);
}

type CheckoutStateName =
	| "ready"
	| "processing"
	| "paid"
	| "failed"
	| "expired"
	| "invalid";

function StatusBadge({ state }: { state: CheckoutStateName }) {
	const labelMap: Record<CheckoutStateName, string> = {
		ready: "Ready",
		processing: "Processing",
		paid: "Paid",
		failed: "Failed",
		expired: "Expired",
		invalid: "Invalid",
	};

	const classNameMap: Record<CheckoutStateName, string> = {
		ready: "border-slate-200 bg-slate-100 text-slate-800",
		processing: "border-sky-200 bg-sky-100 text-sky-800",
		paid: "border-emerald-200 bg-emerald-100 text-emerald-800",
		failed: "border-red-200 bg-red-100 text-red-800",
		expired: "border-amber-200 bg-amber-100 text-amber-800",
		invalid: "border-red-200 bg-red-100 text-red-800",
	};

	return (
		<Badge variant="outline" className={classNameMap[state]}>
			{labelMap[state]}
		</Badge>
	);
}

function getCheckoutState({
	hasOrders,
	hasPaymentId,
	isInvalidToken,
	verifyStatus,
}: {
	hasOrders: boolean;
	hasPaymentId: boolean;
	isInvalidToken: boolean;
	verifyStatus?: "COMPLETED" | "FAILED" | "PENDING" | "error";
}) {
	if (isInvalidToken) {
		return {
			name: "invalid" as const,
			title: "Token could not be validated",
			description:
				"This checkout link could not be loaded from the token provided.",
		};
	}

	if (!hasOrders && !hasPaymentId) {
		return {
			name: "expired" as const,
			title: "Checkout link is no longer payable",
			description:
				"All linked orders are already settled or the token has aged out.",
		};
	}

	if (verifyStatus === "COMPLETED") {
		return {
			name: "paid" as const,
			title: "Payment completed",
			description: "The payment has been verified successfully.",
		};
	}

	if (verifyStatus === "FAILED" || verifyStatus === "error") {
		return {
			name: "failed" as const,
			title: "Payment verification needs attention",
			description:
				"The payment attempt returned, but the settlement could not be confirmed automatically.",
		};
	}

	if (hasPaymentId) {
		return {
			name: "processing" as const,
			title: "Verifying your payment",
			description:
				"We detected a payment session on this token and we are checking its latest status.",
		};
	}

	return {
		name: "ready" as const,
		title: "Review and complete payment",
		description:
			"Review the linked orders before continuing to the secure payment page.",
	};
}

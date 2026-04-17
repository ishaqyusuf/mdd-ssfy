"use client";

import { openLink } from "@/lib/open-link";
import { quickPrint } from "@/lib/quick-print";
import { useTRPC } from "@/trpc/client";
import { Alert, AlertDescription, AlertTitle } from "@gnd/ui/alert";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@gnd/ui/card";
import { Icons } from "@gnd/ui/icons";
import { useMutation, useSuspenseQuery } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { parseAsString, useQueryState } from "nuqs";
import { useEffect, useState } from "react";

const currencyFormatter = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
});

type Props = {
	orderId: string;
	token: string;
};

export function QuoteAcceptancePage({ orderId, token }: Props) {
	const trpc = useTRPC();
	const quoteOrderId = orderId;
	const [acceptedQueryOrderId, setAcceptedQueryOrderId] = useQueryState(
		"orderId",
		parseAsString,
	);
	const [acceptedOrder, setAcceptedOrder] = useState<{
		type: "order";
		salesId: number;
		orderId: string;
		originalQuoteOrderId: string;
		customerName: string;
		salesRep: string;
		due: number;
		status: string;
		acceptedAt?: string | null;
		paymentToken?: string | null;
	} | null>(null);

	const { data } = useSuspenseQuery(
		trpc.checkout.initializeQuoteAcceptance.queryOptions({
			orderId: quoteOrderId,
			token,
			acceptedOrderId: acceptedQueryOrderId || undefined,
		}),
	);

	useEffect(() => {
		if (data.sale.type !== "order") return;
		if (acceptedQueryOrderId === data.sale.orderId) return;
		void setAcceptedQueryOrderId(data.sale.orderId);
	}, [
		acceptedQueryOrderId,
		data.sale.orderId,
		data.sale.type,
		setAcceptedQueryOrderId,
	]);

	const acceptQuoteMutation = useMutation(
		trpc.checkout.acceptQuote.mutationOptions({
			onSuccess(result) {
				setAcceptedOrder({
					...result.order,
					type: "order",
				});
				void setAcceptedQueryOrderId(result.order.orderId);
				toast({
					title: result.alreadyAccepted
						? "Quote already accepted"
						: "Quote accepted",
					description: result.alreadyAccepted
						? `Order ${result.order.orderId} is already active.`
						: `Order ${result.order.orderId} is ready for payment.`,
				});
			},
			onError(error) {
				toast({
					title: "Unable to accept quote",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	const paymentLinkMutation = useMutation(
		trpc.checkout.createSalesCheckoutLink.mutationOptions({
			onSuccess(result) {
				if (!result.paymentLink) {
					toast({
						title: "Payment link unavailable",
						description: "We could not open the payment session right now.",
						variant: "destructive",
					});
					return;
				}

				openLink(result.paymentLink);
			},
			onError(error) {
				toast({
					title: "Unable to start payment",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	const sale = data.sale;
	const currentOrder = acceptedOrder || sale;
	const isAccepted = currentOrder.type === "order" || !!acceptedOrder;
	const hasBalance = Number(currentOrder.due || 0) > 0;
	const paymentToken = acceptedOrder?.paymentToken || sale.paymentToken;

	return (
		<div className="mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-5xl items-center px-4 py-8 sm:px-6">
			<div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
				<Card className="overflow-hidden border-slate-200 bg-white shadow-[0_30px_90px_-48px_rgba(15,23,42,0.45)]">
					<CardHeader className="border-b border-slate-100 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_30%),linear-gradient(145deg,_#f8fafc,_#ffffff_58%,_#ecfeff)]">
						<div className="flex flex-wrap items-start justify-between gap-3">
							<div>
								<Badge
									variant="outline"
									className={
										isAccepted
											? "border-emerald-200 bg-emerald-50 text-emerald-700"
											: "border-sky-200 bg-sky-50 text-sky-700"
									}
								>
									{isAccepted ? "Accepted" : "Quote ready"}
								</Badge>
								<CardTitle className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
									{isAccepted
										? "Your order is ready"
										: "Review and accept your quote"}
								</CardTitle>
								<CardDescription className="mt-2 max-w-2xl text-sm text-slate-600">
									{isAccepted
										? "Your quote has been promoted to an active order. You can continue to payment whenever you're ready."
										: "Confirm the quote below to turn it into an active order and unlock payment."}
								</CardDescription>
							</div>
							<div className="rounded-2xl border border-white/70 bg-white/85 px-4 py-3 text-right shadow-sm backdrop-blur">
								<p className="text-xs uppercase tracking-[0.18em] text-slate-500">
									{isAccepted ? "Order No." : "Quote No."}
								</p>
								<p className="mt-1 text-lg font-semibold text-slate-950">
									{isAccepted ? currentOrder.orderId : sale.orderId}
								</p>
							</div>
						</div>
					</CardHeader>

					<CardContent className="space-y-6 p-6">
						<div className="grid gap-4 sm:grid-cols-2">
							<SummaryCard
								label="Customer"
								value={currentOrder.customerName}
								icon={<Icons.User className="h-4 w-4" />}
							/>
							<SummaryCard
								label="Sales Rep"
								value={currentOrder.salesRep}
								icon={<Icons.User className="h-4 w-4" />}
							/>
							<SummaryCard
								label="Quote Total"
								value={currencyFormatter.format(sale.total || 0)}
								icon={<Icons.FileText className="h-4 w-4" />}
							/>
							<SummaryCard
								label="Amount Due"
								value={currencyFormatter.format(currentOrder.due || 0)}
								icon={<Icons.CreditCard className="h-4 w-4" />}
							/>
						</div>

						{isAccepted ? (
							<Alert className="border-emerald-200 bg-emerald-50 text-emerald-950">
								<Icons.Check className="h-4 w-4 text-emerald-700" />
								<AlertTitle>Quote accepted</AlertTitle>
								<AlertDescription>
									Quote {currentOrder.originalQuoteOrderId} is now order{" "}
									<strong>{currentOrder.orderId}</strong>.
								</AlertDescription>
							</Alert>
						) : (
							<Alert className="border-sky-200 bg-sky-50 text-sky-950">
								<Icons.ShieldCheck className="h-4 w-4 text-sky-700" />
								<AlertTitle>What happens next</AlertTitle>
								<AlertDescription>
									Accepting this quote activates the order, notifies your sales
									team, and then unlocks payment.
								</AlertDescription>
							</Alert>
						)}

						<div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
							<div className="flex items-start gap-3">
								<div className="rounded-2xl bg-white p-3 shadow-sm">
									<Icons.CreditCard className="h-5 w-5 text-slate-700" />
								</div>
								<div>
									<p className="text-sm font-semibold text-slate-900">
										Next step
									</p>
									<p className="mt-1 text-sm leading-6 text-slate-600">
										{isAccepted
											? hasBalance
												? "Use Pay Now to generate a secure checkout link for this order."
												: "This order does not have an outstanding balance, so no payment is required."
											: "Tap Accept Quote to confirm the pricing and continue to payment."}
									</p>
								</div>
							</div>
						</div>

						<div className="flex flex-col gap-3 sm:flex-row">
							{isAccepted ? (
								<>
									<Button
										size="lg"
										className="h-12 flex-1"
										disabled={
											!hasBalance ||
											!paymentToken ||
											paymentLinkMutation.isPending
										}
										onClick={() => {
											if (!paymentToken) return;
											paymentLinkMutation.mutate({ token: paymentToken });
										}}
									>
										{paymentLinkMutation.isPending
											? "Opening payment..."
											: "Pay Now"}
									</Button>
									<Button
										size="lg"
										variant="outline"
										className="h-12"
										onClick={() =>
											void quickPrint({
												salesIds: [currentOrder.salesId],
												mode: "invoice",
											})
										}
									>
										View Invoice
									</Button>
								</>
							) : (
								<Button
									size="lg"
									className="h-12 flex-1"
									disabled={acceptQuoteMutation.isPending}
									onClick={() =>
										acceptQuoteMutation.mutate({
											orderId: quoteOrderId,
											token,
										})
									}
								>
									{acceptQuoteMutation.isPending
										? "Accepting..."
										: "Accept Quote"}
								</Button>
							)}

							<Button
								size="lg"
								variant="outline"
								className="h-12"
								onClick={() => window.location.reload()}
							>
								Refresh
							</Button>
						</div>
					</CardContent>
				</Card>

				<div className="grid gap-4">
					<Card className="border-slate-200 bg-white/95 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.45)]">
						<CardHeader>
							<CardTitle className="text-lg text-slate-950">
								Customer summary
							</CardTitle>
							<CardDescription>
								A mobile-friendly confirmation surface built for quick review.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<DetailRow
								label="Quote number"
								value={sale.originalQuoteOrderId || sale.orderId}
							/>
							<DetailRow
								label="Current order"
								value={isAccepted ? currentOrder.orderId : "Not created yet"}
							/>
							<DetailRow
								label="Outstanding balance"
								value={currencyFormatter.format(currentOrder.due || 0)}
							/>
							<DetailRow
								label="Status"
								value={
									isAccepted ? "Accepted and active" : "Awaiting acceptance"
								}
							/>
						</CardContent>
					</Card>

					<Card className="border-slate-200 bg-[linear-gradient(180deg,_#0f172a,_#111827)] text-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.75)]">
						<CardHeader>
							<CardTitle className="text-lg">Need anything changed?</CardTitle>
							<CardDescription className="text-slate-300">
								Reply to the original email if you need adjustments before
								paying.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-2 text-sm text-slate-200">
							<p>
								The acceptance button confirms the current scope and pricing.
							</p>
							<p>Payment opens in a secure Square checkout session.</p>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}

function SummaryCard({
	label,
	value,
	icon,
}: {
	label: string;
	value: string;
	icon: React.ReactNode;
}) {
	return (
		<div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
			<div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
				{icon}
				<span>{label}</span>
			</div>
			<p className="mt-3 text-base font-semibold text-slate-950">{value}</p>
		</div>
	);
}

function DetailRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
			<span className="text-sm text-slate-500">{label}</span>
			<span className="text-sm font-medium text-slate-950">{value}</span>
		</div>
	);
}

export function QuoteAcceptancePageSkeleton() {
	return (
		<div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
			<div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
				<div className="h-[520px] animate-pulse rounded-[28px] border bg-slate-100" />
				<div className="grid gap-4">
					<div className="h-[220px] animate-pulse rounded-[28px] border bg-slate-100" />
					<div className="h-[180px] animate-pulse rounded-[28px] border bg-slate-100" />
				</div>
			</div>
		</div>
	);
}

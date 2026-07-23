"use client";

import {
	getDealerOfficePaymentState,
	getDealerOrderNextStep,
} from "@/lib/dealer-next-step";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/dealership-app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { toast } from "@gnd/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Printer } from "lucide-react";
import Link from "next/link";
import { DealerNextStep } from "./dealer-next-step";

type DealerOrder = RouterOutputs["dealerPortal"]["salesDocument"];

function currency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));
}

function date(value?: Date | string | null) {
	if (!value) return "-";
	return new Intl.DateTimeFormat("en", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(value));
}

function customerName(order?: DealerOrder | null) {
	return (
		order?.customer?.businessName ||
		order?.customer?.name ||
		order?.customer?.email ||
		"Customer"
	);
}

function customerPaymentLabel(order?: DealerOrder | null) {
	const due = Number(order?.amountDue || 0);
	const total = Number(order?.grandTotal || 0);
	if (due <= 0) return "Paid";
	if (due < total) return "Partially paid";
	return "Payment due";
}

function progressItems(order?: DealerOrder | null) {
	const due = Number(order?.amountDue || 0);
	const officePayment = getDealerOfficePaymentState(order?.officeAmountDue);
	const nextStep = getDealerOrderNextStep({
		officeAmountDue: order?.officeAmountDue,
		customerAmountDue: order?.amountDue,
		deliveryOption: order?.deliveryOption,
		status: order?.status,
		fulfillmentStatus: order?.fulfillmentStatus,
	});
	return [
		{
			label: "Order approved",
			value: order?.type === "quote" ? "Pending approval" : "Complete",
			done: order?.type !== "quote",
		},
		{
			label: "Customer payment",
			value: customerPaymentLabel(order),
			done: due <= 0,
		},
		{
			label: "GND payment",
			value:
				officePayment.state === "review"
					? "Balance unavailable — contact GND"
					: officePayment.state === "paid"
						? "Paid"
						: `${currency(officePayment.amount)} due`,
			done: officePayment.state === "paid",
		},
		{
			label: "Fulfillment",
			value: nextStep.title,
			done: nextStep.phase === "fulfilled",
		},
	];
}

export function DealerOrderOverview({ orderId }: { orderId: number }) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const orderQuery = useQuery(
		trpc.dealerPortal.salesDocument.queryOptions({ id: orderId }),
	);
	const printDocument = useMutation(
		trpc.dealerPortal.printDocument.mutationOptions({
			onSuccess: (result) => {
				window.location.assign(result.previewUrl);
			},
			onError: (error) => {
				toast({
					title: "Could not open print preview.",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);
	const createPaymentLink = useMutation(
		trpc.dealerPortal.createPaymentLink.mutationOptions({
			onSuccess: async (result) => {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.dealerPortal.salesDocument.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.dealerPortal.orders.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.dealerPortal.dashboard.pathKey(),
					}),
				]);
				window.location.assign(result.paymentLink);
			},
			onError: (error) => {
				toast({
					title: "Could not create payment link.",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);
	const updateCustomerPayment = useMutation(
		trpc.dealerPortal.updateCustomerPaymentStatus.mutationOptions({
			onSuccess: async (result) => {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.dealerPortal.salesDocument.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.dealerPortal.orders.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.dealerPortal.dashboard.pathKey(),
					}),
				]);
				toast({
					title:
						result.status === "paid"
							? "Customer payment marked paid."
							: "Customer balance reopened.",
				});
			},
			onError: (error) => {
				toast({
					title: "Could not update customer payment.",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);
	const order = orderQuery.data;
	const officePayment = getDealerOfficePaymentState(order?.officeAmountDue);
	const hasOfficeBalance = officePayment.state === "due";
	const customerHasBalance = Number(order?.amountDue || 0) > 0;

	if (orderQuery.isPending) {
		return (
			<div className="rounded-lg border p-6 text-sm text-muted-foreground">
				Loading order...
			</div>
		);
	}

	if (!order) {
		return (
			<div className="rounded-lg border p-6 text-sm text-muted-foreground">
				Order could not be loaded.
			</div>
		);
	}
	const nextStep = getDealerOrderNextStep({
		officeAmountDue: order.officeAmountDue,
		customerAmountDue: order.amountDue,
		deliveryOption: order.deliveryOption,
		status: order.status,
		fulfillmentStatus: order.fulfillmentStatus,
	});

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-start md:justify-between">
				<div className="min-w-0 space-y-2">
					<Button asChild size="sm" variant="ghost">
						<Link href="/orders">Back to orders</Link>
					</Button>
					<div>
						<div className="flex flex-wrap items-center gap-2">
							<h1 className="text-2xl font-semibold tracking-normal">
								{order.orderId}
							</h1>
							<Badge variant="outline">{order.status || "Open"}</Badge>
						</div>
						<p className="text-sm text-muted-foreground">
							{customerName(order)} · Created {date(order.createdAt)}
						</p>
					</div>
				</div>
				<div className="flex flex-wrap gap-2">
					{hasOfficeBalance ? (
						<Button
							disabled={createPaymentLink.isPending}
							onClick={() => createPaymentLink.mutate({ id: order.id })}
							type="button"
						>
							<CreditCard className="mr-2 size-4" />
							Pay GND {currency(order.officeAmountDue)}
						</Button>
					) : null}
					<Button
						disabled={printDocument.isPending}
						onClick={() =>
							printDocument.mutate({
								id: order.id,
								mode: "invoice",
								pricingMode: "customer",
							})
						}
						type="button"
						variant="outline"
					>
						<Printer className="mr-2 size-4" />
						Customer PDF
					</Button>
					<Button
						disabled={printDocument.isPending}
						onClick={() =>
							printDocument.mutate({
								id: order.id,
								mode: "invoice",
								pricingMode: "internal",
							})
						}
						type="button"
						variant="outline"
					>
						<Printer className="mr-2 size-4" />
						Dealer PDF
					</Button>
				</div>
			</div>

			<DealerNextStep guidance={nextStep} />

			<Tabs defaultValue="overview" className="space-y-4">
				<TabsList className="w-full justify-start">
					<TabsTrigger value="overview">Overview</TabsTrigger>
					<TabsTrigger value="payment">Payment</TabsTrigger>
				</TabsList>

				<TabsContent value="overview" className="mt-0 space-y-4">
					<section className="grid gap-3 md:grid-cols-4">
						<Metric label="Customer total" value={currency(order.grandTotal)} />
						<Metric
							label="Customer balance"
							value={currency(order.amountDue)}
						/>
						<Metric
							label="GND balance"
							value={
								officePayment.state === "review"
									? "Unavailable"
									: currency(officePayment.amount)
							}
						/>
						<Metric
							label="Fulfillment"
							value={order.deliveryOption || "pickup"}
						/>
					</section>

					<section className="rounded-lg border p-4">
						<h2 className="mb-3 text-base font-semibold">Progress</h2>
						<div className="space-y-3">
							{progressItems(order).map((item) => (
								<div
									className="flex items-center justify-between gap-3 rounded-md border p-3"
									key={item.label}
								>
									<div>
										<p className="text-sm font-medium">{item.label}</p>
										<p className="text-xs text-muted-foreground">
											{item.value}
										</p>
									</div>
									<Badge variant={item.done ? "default" : "outline"}>
										{item.done ? "Done" : "Open"}
									</Badge>
								</div>
							))}
						</div>
					</section>

					<section className="rounded-lg border p-4">
						<h2 className="mb-3 text-base font-semibold">Line Items</h2>
						<div className="divide-y">
							{(order.lineItems || []).map((line) => (
								<div
									className="grid gap-2 py-3 text-sm md:grid-cols-[1fr_80px_120px]"
									key={line.uid}
								>
									<div>
										<p className="font-medium">{line.title || "Line item"}</p>
										{line.description ? (
											<p className="text-xs text-muted-foreground">
												{line.description}
											</p>
										) : null}
									</div>
									<p className="text-muted-foreground">Qty {line.qty || 0}</p>
									<p className="font-medium md:text-right">
										{currency(line.lineTotal)}
									</p>
								</div>
							))}
						</div>
					</section>
				</TabsContent>

				<TabsContent value="payment" className="mt-0 space-y-4">
					<section className="rounded-lg border p-4">
						<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
							<div>
								<h2 className="text-base font-semibold">Customer payment</h2>
								<p className="text-sm text-muted-foreground">
									{customerPaymentLabel(order)} · Collected{" "}
									{currency(order.customerPaidAmount)} of{" "}
									{currency(order.grandTotal)}
								</p>
							</div>
							<Button
								disabled={updateCustomerPayment.isPending}
								onClick={() =>
									updateCustomerPayment.mutate({
										id: order.id,
										status: customerHasBalance ? "paid" : "unpaid",
									})
								}
								type="button"
								variant={customerHasBalance ? "default" : "outline"}
							>
								{customerHasBalance ? "Mark customer paid" : "Reopen balance"}
							</Button>
						</div>
					</section>

					<section className="rounded-lg border p-4">
						<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
							<div>
								<h2 className="text-base font-semibold">GND payment</h2>
								<p className="text-sm text-muted-foreground">
									{officePayment.state === "review"
										? "Balance unavailable. Contact GND before treating this order as paid."
										: `Outstanding balance: ${currency(officePayment.amount)}`}
								</p>
							</div>
							{hasOfficeBalance ? (
								<Button
									disabled={createPaymentLink.isPending}
									onClick={() => createPaymentLink.mutate({ id: order.id })}
									type="button"
								>
									<CreditCard className="mr-2 size-4" />
									Pay GND balance
								</Button>
							) : officePayment.state === "paid" ? (
								<Badge>Paid</Badge>
							) : (
								<Badge variant="outline">Review with GND</Badge>
							)}
						</div>
					</section>
				</TabsContent>
			</Tabs>
		</div>
	);
}

function Metric({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-lg border p-4">
			<p className="text-sm text-muted-foreground">{label}</p>
			<p className="mt-2 text-xl font-semibold">{value}</p>
		</div>
	);
}

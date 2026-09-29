"use client";

import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { DealerRequestDecisionActions } from "./dealer-request-decision-actions";

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
		hour: "numeric",
		minute: "2-digit",
	}).format(new Date(value));
}

function ageLabel(hours?: number | null) {
	const value = Number(hours || 0);
	if (value < 1) return "<1h old";
	if (value < 48) return `${Math.round(value)}h old`;
	return `${Math.round(value / 24)}d old`;
}

function OfficeDocumentPreviewAction({
	salesId,
	mode,
}: {
	salesId: number;
	mode: "quote" | "invoice";
}) {
	const [isLoading, setIsLoading] = useState(false);

	async function openPreview() {
		if (isLoading) return;
		setIsLoading(true);
		try {
			const { prepareSalesHtmlPreview } = await import(
				"@/modules/sales-print/application/sales-print-service"
			);
			const previewUrl = await prepareSalesHtmlPreview({
				salesIds: [salesId],
				mode,
				pricingMode: "internal",
			});
			window.location.assign(previewUrl);
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Could not open the GND quote.",
			);
			setIsLoading(false);
		}
	}

	return (
		<Button
			disabled={isLoading}
			onClick={openPreview}
			size="sm"
			type="button"
			variant="outline"
		>
			<Icons.Printer className="mr-2 size-4" />
			{isLoading ? "Opening..." : `GND ${mode} preview`}
		</Button>
	);
}

function RequestAnalytics({
	analytics,
}: {
	analytics?: {
		pending: number;
		dueSoon: number;
		overdue: number;
		averageDecisionHours: number;
		approvalRate: number;
		targetHours: number;
	} | null;
}) {
	if (!analytics) return null;
	const metrics = [
		["Pending", analytics.pending],
		["Due soon", analytics.dueSoon],
		["Overdue", analytics.overdue],
		["Avg. decision", `${analytics.averageDecisionHours}h`],
		["Approval rate", `${analytics.approvalRate}%`],
	];

	return (
		<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
			{metrics.map(([label, value]) => (
				<div key={label} className="rounded-lg border bg-card p-4">
					<div className="text-xs text-muted-foreground">{label}</div>
					<div className="mt-1 text-2xl font-semibold">{value}</div>
				</div>
			))}
			<p className="text-xs text-muted-foreground sm:col-span-2 xl:col-span-5">
				Office review SLA: {analytics.targetHours} hours from request
				submission.
			</p>
		</div>
	);
}

function fulfillmentRecipient(value: unknown) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	const record = value as Record<string, unknown>;
	const text = (key: string) =>
		typeof record[key] === "string" ? String(record[key]) : null;
	const address = [
		text("address1"),
		text("address2"),
		text("city"),
		text("state"),
		text("zip_code"),
		text("country"),
	]
		.filter(Boolean)
		.join(", ");
	return {
		name: text("name"),
		email: text("email"),
		phoneNo: text("phoneNo"),
		address,
	};
}

type PaidDealerOrder =
	RouterOutputs["sales"]["dealerPaidOrdersForOffice"]["data"][number];
type DealerFulfillmentException =
	RouterOutputs["sales"]["dealerFulfillmentExceptionsForOffice"]["data"][number];

function DealerFulfillmentExceptions({
	orders,
	count,
	loading,
	error,
	onRetry,
}: {
	orders: DealerFulfillmentException[];
	count: number;
	loading: boolean;
	error?: string | null;
	onRetry: () => void;
}) {
	return (
		<section className="space-y-3 rounded-lg border bg-card p-4">
			<div>
				<h2 className="text-base font-semibold">
					Dealer fulfillment exceptions
				</h2>
				<p className="text-xs text-muted-foreground">
					Open dispatch issues that need office follow-up.
				</p>
			</div>
			{error ? (
				<div
					role="alert"
					className="flex flex-wrap items-center gap-2 text-sm text-destructive"
				>
					<span>Could not load exceptions: {error}</span>
					<Button onClick={onRetry} size="sm" type="button" variant="outline">
						Retry
					</Button>
				</div>
			) : loading ? (
				<p className="text-sm text-muted-foreground">Loading exceptions...</p>
			) : orders.length ? (
				<>
					<div className="grid gap-2 lg:grid-cols-2">
						{orders.map((order) => (
							<div
								className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
								key={order.requestId}
							>
								<div className="min-w-0 text-sm">
									<p className="font-medium">
										{order.orderNo} · {order.dealerName}
									</p>
									<p className="text-xs text-muted-foreground">
										{order.reasonCode} · Owner: {order.ownerName}
									</p>
								</div>
								<Button asChild size="sm" variant="outline">
									<Link
										href={`/sales-form/edit-order/${order.slug}?dealerRequestId=${order.requestId}`}
									>
										Review order
									</Link>
								</Button>
							</div>
						))}
					</div>
					{count > orders.length ? (
						<p className="text-xs text-muted-foreground">
							Showing the latest {orders.length} of {count} exceptions.
						</p>
					) : null}
				</>
			) : (
				<p className="text-sm text-muted-foreground">
					No open dealer fulfillment exceptions.
				</p>
			)}
		</section>
	);
}

function PaidDealerOrders({
	orders,
	count,
	loading,
	error,
	onRetry,
}: {
	orders: PaidDealerOrder[];
	count: number;
	loading: boolean;
	error?: string | null;
	onRetry: () => void;
}) {
	return (
		<section className="space-y-3 rounded-lg border bg-card p-4">
			<div>
				<h2 className="text-base font-semibold">Paid dealer orders</h2>
				<p className="text-xs text-muted-foreground">
					Review fulfillment and any outstanding follow-up with the assigned
					office owner.
				</p>
			</div>
			{error ? (
				<div
					role="alert"
					className="flex flex-wrap items-center gap-2 text-sm text-destructive"
				>
					<span>Could not load paid dealer orders: {error}</span>
					<Button onClick={onRetry} size="sm" type="button" variant="outline">
						Retry
					</Button>
				</div>
			) : loading ? (
				<p className="text-sm text-muted-foreground">Loading paid orders...</p>
			) : orders.length ? (
				<>
					<div className="grid gap-2 lg:grid-cols-2">
						{orders.map((order) => (
							<div
								className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
								key={order.requestId}
							>
								<div className="min-w-0 text-sm">
									<p className="font-medium">
										{order.orderNo} · {order.dealerName}
									</p>
									<p className="text-xs text-muted-foreground">
										{order.customerName} · {order.deliveryOption || "pickup"} ·{" "}
										{order.status || "New"}
									</p>
									<p className="text-xs text-muted-foreground">
										Owner: {order.ownerName} · GND due{" "}
										{currency(order.amountDue)}
									</p>
								</div>
								<Button asChild size="sm" variant="outline">
									<Link
										href={`/sales-form/edit-order/${order.slug}?dealerRequestId=${order.requestId}`}
									>
										Review order
									</Link>
								</Button>
							</div>
						))}
					</div>
					{count > orders.length ? (
						<p className="text-xs text-muted-foreground">
							Showing the latest {orders.length} of {count} paid orders. Use
							Sales Orders for older records.
						</p>
					) : null}
				</>
			) : (
				<p className="text-sm text-muted-foreground">
					No paid dealer orders are awaiting review.
				</p>
			)}
		</section>
	);
}

export function SalesRepDealerRequests() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const requestsQuery = useQuery(
		trpc.sales.dealerOrderRequests.queryOptions({
			status: "all",
			size: 25,
		}),
	);
	const analyticsQuery = useQuery(
		trpc.sales.dealerOrderRequestAnalytics.queryOptions(),
	);
	const paidOrdersQuery = useQuery({
		...trpc.sales.dealerPaidOrdersForOffice.queryOptions(),
		refetchInterval: 30_000,
	});
	const exceptionsQuery = useQuery({
		...trpc.sales.dealerFulfillmentExceptionsForOffice.queryOptions(),
		refetchInterval: 30_000,
	});
	const approve = useMutation(
		trpc.sales.approveDealerSalesRequest.mutationOptions({
			onSuccess: async () => {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.sales.dealerOrderRequests.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.sales.dealerOrderRequestCount.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.sales.dealerOrderRequestAnalytics.pathKey(),
					}),
				]);
				toast.success("Dealer request approved.");
			},
			onError: (error) => toast.error(error.message),
		}),
	);
	const reject = useMutation(
		trpc.sales.rejectDealerSalesRequest.mutationOptions({
			onSuccess: async () => {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.sales.dealerOrderRequests.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.sales.dealerOrderRequestCount.pathKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.sales.dealerOrderRequestAnalytics.pathKey(),
					}),
				]);
				toast.success("Dealer request rejected.");
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const requests = requestsQuery.data?.data || [];
	const paidOrdersSection = (
		<PaidDealerOrders
			orders={paidOrdersQuery.data?.data || []}
			count={paidOrdersQuery.data?.count || 0}
			loading={paidOrdersQuery.isPending}
			error={paidOrdersQuery.error?.message}
			onRetry={() => void paidOrdersQuery.refetch()}
		/>
	);
	const exceptionsSection = (
		<DealerFulfillmentExceptions
			orders={exceptionsQuery.data?.data || []}
			count={exceptionsQuery.data?.count || 0}
			loading={exceptionsQuery.isPending}
			error={exceptionsQuery.error?.message}
			onRetry={() => void exceptionsQuery.refetch()}
		/>
	);
	if (requestsQuery.isPending) {
		return (
			<div className="rounded-lg border p-6 text-sm text-muted-foreground">
				Loading requests...
			</div>
		);
	}

	if (!requests.length) {
		return (
			<div className="space-y-4">
				<RequestAnalytics analytics={analyticsQuery.data} />
				{paidOrdersSection}
				{exceptionsSection}
				<div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
					No dealer order requests yet.
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<RequestAnalytics analytics={analyticsQuery.data} />
			{paidOrdersSection}
			{exceptionsSection}
			{requests.map((request) => {
				const isPending = request.status === "pending";
				const recipient = fulfillmentRecipient(request.fulfillmentRecipient);
				const editor =
					request.orderType === "order" ? "edit-order" : "edit-quote";
				return (
					<div
						key={request.id}
						className="flex flex-col gap-4 rounded-lg border bg-card p-4 lg:flex-row lg:items-center lg:justify-between"
					>
						<div className="min-w-0 space-y-1">
							<div className="flex flex-wrap items-center gap-2">
								<span className="font-semibold">Quote {request.quoteNo}</span>
								<Badge variant={isPending ? "default" : "outline"}>
									{request.status}
								</Badge>
								{isPending ? (
									<Badge
										variant={
											request.sla.status === "overdue"
												? "destructive"
												: request.sla.status === "due_soon"
													? "secondary"
													: "outline"
										}
									>
										{request.sla.status === "overdue"
											? "SLA overdue"
											: request.sla.status === "due_soon"
												? "Due soon"
												: "On track"}
									</Badge>
								) : null}
							</div>
							<div className="text-sm text-muted-foreground">
								{request.dealerName} requested an order for{" "}
								{request.customerName}
							</div>
							<div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
								<span>{currency(request.grandTotal)}</span>
								<span>{date(request.createdAt)}</span>
								{isPending ? (
									<span>{ageLabel(request.sla.ageHours)}</span>
								) : null}
								{request.dealerEmail ? (
									<span>{request.dealerEmail}</span>
								) : null}
							</div>
							{recipient ? (
								<div className="mt-2 rounded-md border bg-muted/30 p-3 text-xs">
									<div className="font-medium text-foreground">
										{request.deliveryOption === "ship"
											? "Shipping recipient"
											: "Delivery recipient"}
										: {recipient.name || request.customerName}
									</div>
									<div className="mt-1 text-muted-foreground">
										{[recipient.phoneNo, recipient.email, recipient.address]
											.filter(Boolean)
											.join(" · ")}
									</div>
								</div>
							) : null}
							{!isPending ? (
								<div className="text-xs text-muted-foreground">
									{request.status === "approved" ? "Approved" : "Rejected"}
									{request.approvedByName
										? ` by ${request.approvedByName}`
										: ""}{" "}
									on {date(request.updatedAt)}
									{request.orderType === "order"
										? ` · Order ${request.quoteNo} · ${currency(request.amountDue)} due`
										: ""}
								</div>
							) : null}
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<Button asChild size="sm" variant="outline">
								<Link
									href={`/sales-form/${editor}/${request.quoteSlug}?dealerRequestId=${request.id}`}
								>
									<Icons.Eye className="mr-2 size-4" />
									Review
								</Link>
							</Button>
							<OfficeDocumentPreviewAction
								mode={request.orderType === "order" ? "invoice" : "quote"}
								salesId={request.salesId}
							/>
							{isPending ? (
								<DealerRequestDecisionActions
									request={request}
									onApprove={(payload) => approve.mutateAsync(payload)}
									onReject={(payload) => reject.mutateAsync(payload)}
									isApproving={approve.isPending}
									isRejecting={reject.isPending}
								/>
							) : null}
						</div>
					</div>
				);
			})}
		</div>
	);
}

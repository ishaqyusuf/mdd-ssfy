"use client";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
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
				<div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
					No dealer order requests yet.
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<RequestAnalytics analytics={analyticsQuery.data} />
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
										Direct-ship recipient:{" "}
										{recipient.name || request.customerName}
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

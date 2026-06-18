"use client";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";

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

function approvalPayload(request: { id: number; deliveryOption?: string | null }) {
	const mode = request.deliveryOption?.toLowerCase();
	if (mode !== "delivery" && mode !== "ship") {
		return { requestId: request.id };
	}

	const value = window.prompt(
		`Enter reviewed ${mode} cost before approving this dealer request.`,
		"0",
	);
	if (value == null) return null;
	const deliveryCost = Number(value);
	if (!Number.isFinite(deliveryCost) || deliveryCost < 0) {
		toast.error("Enter a valid delivery cost.");
		return null;
	}

	return {
		requestId: request.id,
		deliveryCost,
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
			<div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
				No dealer order requests yet.
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{requests.map((request) => {
				const isPending = request.status === "pending";
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
							</div>
							<div className="text-sm text-muted-foreground">
								{request.dealerName} requested an order for{" "}
								{request.customerName}
							</div>
							<div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
								<span>{currency(request.grandTotal)}</span>
								<span>{date(request.createdAt)}</span>
								{request.dealerEmail ? <span>{request.dealerEmail}</span> : null}
							</div>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<Button asChild size="sm" variant="outline">
								<Link
									href={`/sales-form/edit-quote/${request.quoteSlug}?dealerRequestId=${request.id}`}
								>
									<Icons.Eye className="mr-2 size-4" />
									Review
								</Link>
							</Button>
							<Button
								size="sm"
								disabled={!isPending || approve.isPending}
								onClick={() => {
									const payload = approvalPayload(request);
									if (payload) approve.mutate(payload);
								}}
							>
								<Icons.CheckCheck className="mr-2 size-4" />
								Approve
							</Button>
							<Button
								size="sm"
								variant="outline"
								disabled={!isPending || reject.isPending}
								onClick={() =>
									reject.mutate({
										requestId: request.id,
									})
								}
							>
								<Icons.XCircle className="mr-2 size-4" />
								Reject
							</Button>
						</div>
					</div>
				);
			})}
		</div>
	);
}

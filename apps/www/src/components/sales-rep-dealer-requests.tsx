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

function approvalPayload(request: {
	id: number;
	deliveryOption?: string | null;
}) {
	const mode = request.deliveryOption?.toLowerCase();
	if (mode === "pickup") {
		return { requestId: request.id };
	}

	const value = window.prompt(
		mode === "delivery" || mode === "ship"
			? `Enter reviewed ${mode} cost before approving this dealer request.`
			: "Enter the reviewed delivery cost before approving this dealer request. Use 0 when no delivery charge applies.",
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
				const recipient = fulfillmentRecipient(
					request.fulfillmentRecipient,
				);
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
							</div>
							<div className="text-sm text-muted-foreground">
								{request.dealerName} requested an order for{" "}
								{request.customerName}
							</div>
							<div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
								<span>{currency(request.grandTotal)}</span>
								<span>{date(request.createdAt)}</span>
								{request.dealerEmail ? (
									<span>{request.dealerEmail}</span>
								) : null}
							</div>
							{recipient ? (
								<div className="mt-2 rounded-md border bg-muted/30 p-3 text-xs">
									<div className="font-medium text-foreground">
										Direct-ship recipient: {recipient.name || request.customerName}
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
								<Button
									size="sm"
									disabled={approve.isPending}
									onClick={() => {
										const payload = approvalPayload(request);
										if (payload) approve.mutate(payload);
									}}
								>
									<Icons.CheckCheck className="mr-2 size-4" />
									Approve
								</Button>
							) : null}
							{isPending ? (
								<Button
									size="sm"
									variant="outline"
									disabled={reject.isPending}
									onClick={() =>
										reject.mutate({
											requestId: request.id,
										})
									}
								>
									<Icons.XCircle className="mr-2 size-4" />
									Reject
								</Button>
							) : null}
						</div>
					</div>
				);
			})}
		</div>
	);
}

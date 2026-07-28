"use client";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DealerRequestDecisionActions } from "./dealer-request-decision-actions";

export function DealerRequestReviewBanner({
	requestId,
}: {
	requestId: number;
}) {
	const trpc = useTRPC();
	const router = useRouter();
	const queryClient = useQueryClient();
	const requestQuery = useQuery(
		trpc.sales.dealerOrderRequest.queryOptions({ requestId }),
	);
	const approve = useMutation(
		trpc.sales.approveDealerSalesRequest.mutationOptions({
			onSuccess: async () => {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.sales.dealerOrderRequest.pathKey(),
					}),
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
				router.push("/sales-rep?tab=requests");
			},
			onError: (error) => toast.error(error.message),
		}),
	);
	const reject = useMutation(
		trpc.sales.rejectDealerSalesRequest.mutationOptions({
			onSuccess: async () => {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.sales.dealerOrderRequest.pathKey(),
					}),
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
				router.push("/sales-rep?tab=requests");
			},
			onError: (error) => toast.error(error.message),
		}),
	);
	const request = requestQuery.data;
	if (!request) return null;
	const isPending = request.status === "pending";

	return (
		<div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950">
			<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
				<div className="space-y-1">
					<div className="flex flex-wrap items-center gap-2">
						<span className="font-semibold">Dealer order request</span>
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
									? `SLA overdue · ${Math.round(request.sla.ageHours)}h`
									: request.sla.status === "due_soon"
										? `Due soon · ${Math.round(request.sla.ageHours)}h`
										: `On track · ${Math.round(request.sla.ageHours)}h`}
							</Badge>
						) : null}
					</div>
					<p className="text-sm">
						{request.dealerName} requested quote {request.quoteNo} for{" "}
						{request.customerName} to become an order.
					</p>
					{!isPending ? (
						<p className="text-xs text-amber-800">
							{request.status === "approved" ? "Approved" : "Rejected"}
							{request.approvedByName ? ` by ${request.approvedByName}` : ""} on{" "}
							{new Date(request.updatedAt).toLocaleString()}
							{request.orderType === "order"
								? ` · Resulting order ${request.quoteNo} · $${Number(request.amountDue || 0).toFixed(2)} due`
								: ""}
						</p>
					) : null}
				</div>
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
}

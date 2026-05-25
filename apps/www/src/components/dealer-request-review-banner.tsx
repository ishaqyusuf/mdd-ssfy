"use client";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
					</div>
					<p className="text-sm">
						{request.dealerName} requested quote {request.quoteNo} for{" "}
						{request.customerName} to become an order.
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Button
						size="sm"
						disabled={!isPending || approve.isPending}
						onClick={() => approve.mutate({ requestId })}
					>
						<Icons.CheckCheck className="mr-2 size-4" />
						Approve
					</Button>
					<Button
						size="sm"
						variant="outline"
						disabled={!isPending || reject.isPending}
						onClick={() => reject.mutate({ requestId })}
					>
						<Icons.XCircle className="mr-2 size-4" />
						Reject
					</Button>
				</div>
			</div>
		</div>
	);
}

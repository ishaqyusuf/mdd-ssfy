import { useTRPC } from "@/trpc/client";
import { useLoadingToast } from "./use-loading-toast";

import {
	markSalesDispatchAsComplete,
	markSalesProductionAsCompleted,
} from "@/actions/sales-mark-as-completed";
import { useQueryClient } from "@gnd/ui/tanstack";

export function useBatchSales() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const loading = useLoadingToast();
	const invalidateProductionWorkspace = () =>
		Promise.all([
			queryClient.invalidateQueries({
				queryKey: trpc.sales.getOrders.pathKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.sales.productions.pathKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.sales.productionSummary.pathKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.sales.productionCalendar.pathKey(),
			}),
		]);
	const markAsFulfilled = async (...ids) => {
		loading.loading("Marking as fulfilled...");
		for (const id of ids) {
			try {
				await markSalesDispatchAsComplete(id);
				loading.success("Marked as fulfilled");
			} catch (error) {
				loading.error("Unable to mark as complete!");
			}
		}
		await invalidateProductionWorkspace();
	};
	const markAsProductionCompleted = async (...ids) => {
		loading.loading("Marking as production completed...");
		for (const id of ids) {
			try {
				await markSalesProductionAsCompleted(id);
			} catch (error) {}
		}
		loading.success("Marked as production completed");
		await invalidateProductionWorkspace();
	};
	return {
		markAsFulfilled,
		markAsProductionCompleted,
	};
}

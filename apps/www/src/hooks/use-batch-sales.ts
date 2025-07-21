import { useTRPC } from "@/trpc/client";
import { useLoadingToast } from "./use-loading-toast";

import {
    markSalesDispatchAsComplete,
    markSalesProductionAsCompleted,
} from "@/actions/sales-mark-as-completed";
import { useQueryClient } from "@tanstack/react-query";

export function useBatchSales() {
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const loading = useLoadingToast();
    const markAsFulfilled = async (...ids) => {
        loading.loading("Marking as fulfilled...");
        for (const id of ids) {
            try {
                await markSalesDispatchAsComplete(id);
            } catch (error) {}
        }
        loading.success("Marked as fulfilled");
        queryClient.invalidateQueries({
            queryKey: trpc.sales.index.pathKey(),
        });
    };
    const markAsProductionCompleted = async (...ids) => {
        loading.loading("Marking as production completed...");
        for (const id of ids) {
            try {
                await markSalesProductionAsCompleted(id);
            } catch (error) {}
        }
        loading.success("Marked as production completed");
        queryClient.invalidateQueries({
            queryKey: trpc.sales.index.pathKey(),
        });
    };
    return {
        markAsFulfilled,
        markAsProductionCompleted,
    };
}


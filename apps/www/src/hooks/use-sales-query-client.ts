import { useTRPC } from "@/trpc/client";
import { useQueryClient } from "@gnd/ui/tanstack";

export function useSalesQueryClient() {
    const qc = useQueryClient();
    const trpc = useTRPC();
    const _invalidate = (queryKey) =>
        qc.invalidateQueries({
            queryKey,
        });
    const invalidate = {
        salesList: () => _invalidate(trpc.sales.index.infiniteQueryKey()),
        quoteList: () => _invalidate(trpc.sales.quotes.infiniteQueryKey()),
        productionOverview: () =>
            _invalidate(trpc.sales.productionOverview.queryKey()),
        saleOverview: () => _invalidate(trpc.sales.getSaleOverview.queryKey()),
    };
    const events = {
        assignmentUpdated: () => {
            invalidate.salesList();
            invalidate.productionOverview();
            invalidate.saleOverview();
        },
        assignmentSubmissionUpdated: () => {
            events.assignmentUpdated();
        },
        dispatchUpdated: () => {
            events.assignmentUpdated();
        },
        quoteCreated: () => {
            invalidate.salesList();
        },
        salesCreated: () => {
            invalidate.salesList();
        },
        salesPaymentUpdated: () => {
            invalidate.salesList();
            invalidate.saleOverview();
        },
        salesStatReset: () => {
            invalidate.salesList();
            invalidate.saleOverview();
            events.assignmentUpdated();
        },
        productionUpdated: () => {
            invalidate.productionOverview();
            invalidate.salesList();
        },
    };
    return {
        ...events,
        trpc,
        qc,
        events,
        invalidate,
    };
}


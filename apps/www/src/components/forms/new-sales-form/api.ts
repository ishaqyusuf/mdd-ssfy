import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import type {
    NewSalesFormBootstrapInput,
    NewSalesFormDeleteLineItemInput,
    NewSalesFormGetInput,
    NewSalesFormRecalculateInput,
    NewSalesFormResolveCustomerInput,
    NewSalesFormStepRoutingInput,
    NewSalesFormSaveDraftInput,
    NewSalesFormSaveFinalInput,
} from "./schema";

export function useNewSalesFormBootstrapQuery(
    input: NewSalesFormBootstrapInput,
    enabled = true,
) {
    const trpc = useTRPC();
    return useQuery(
        trpc.newSalesForm.bootstrap.queryOptions(input, {
            enabled,
        }),
    );
}

export function useNewSalesFormGetQuery(
    input: NewSalesFormGetInput,
    enabled = true,
) {
    const trpc = useTRPC();
    return useQuery(
        trpc.newSalesForm.get.queryOptions(input, {
            enabled,
        }),
    );
}

export function useNewSalesFormStepRoutingQuery(
    input: NewSalesFormStepRoutingInput = {},
    enabled = true,
) {
    const trpc = useTRPC();
    return useQuery(
        trpc.newSalesForm.getStepRouting.queryOptions(input, {
            enabled,
        }),
    );
}

export function useNewSalesFormSearchCustomersQuery(query?: string | null) {
    const trpc = useTRPC();
    const q = query?.trim();
    return useQuery(
        trpc.newSalesForm.searchCustomers.queryOptions(
            {
                query: q || "",
                limit: 10,
            },
            {
                enabled: !!q,
            },
        ),
    );
}

export function useSalesStepComponentsQuery(
    input: { stepId?: number | null; stepTitle?: string | null },
    enabled = true,
) {
    const trpc = useTRPC();
    return useQuery(
        trpc.sales.getStepComponents.queryOptions(
            {
                stepId: input.stepId || undefined,
                stepTitle: input.stepTitle || undefined,
            },
            {
                enabled: enabled && (!!input.stepId || !!input.stepTitle),
            },
        ),
    );
}

export function useNewSalesFormResolveCustomerQuery(
    input: NewSalesFormResolveCustomerInput,
    enabled = true,
) {
    const trpc = useTRPC();
    return useQuery(
        trpc.newSalesForm.resolveCustomer.queryOptions(input, {
            enabled,
        }),
    );
}

export function useRecalculateNewSalesFormMutation() {
    const trpc = useTRPC();
    return useMutation(trpc.newSalesForm.recalculate.mutationOptions());
}

export function useSaveDraftNewSalesFormMutation() {
    const trpc = useTRPC();
    return useMutation(trpc.newSalesForm.saveDraft.mutationOptions());
}

export function useSaveFinalNewSalesFormMutation() {
    const trpc = useTRPC();
    return useMutation(trpc.newSalesForm.saveFinal.mutationOptions());
}

export function useDeleteNewSalesFormLineItemMutation() {
    const trpc = useTRPC();
    return useMutation(trpc.newSalesForm.deleteLineItem.mutationOptions());
}

export function useNewSalesFormCache() {
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    return {
        async invalidateGet(input: Partial<NewSalesFormGetInput>) {
            if (!input.slug || !input.type) return;
            await queryClient.invalidateQueries({
                queryKey: trpc.newSalesForm.get.queryKey({
                    slug: input.slug,
                    type: input.type,
                }),
            });
        },
        async setGet(
            input: NewSalesFormGetInput,
            updater: (oldData: any) => any,
        ) {
            queryClient.setQueryData(trpc.newSalesForm.get.queryKey(input), updater);
        },
    };
}

export type NewSalesFormApiInputs = {
    bootstrap: NewSalesFormBootstrapInput;
    get: NewSalesFormGetInput;
    saveDraft: NewSalesFormSaveDraftInput;
    saveFinal: NewSalesFormSaveFinalInput;
    recalculate: NewSalesFormRecalculateInput;
    resolveCustomer: NewSalesFormResolveCustomerInput;
    stepRouting: NewSalesFormStepRoutingInput;
    deleteLineItem: NewSalesFormDeleteLineItemInput;
};

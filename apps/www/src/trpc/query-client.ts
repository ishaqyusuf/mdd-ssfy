import { Toast } from "@gnd/ui/toast";
import { toast } from "@gnd/ui/use-toast";
import {
    MutationCache,
    QueryClient,
    defaultShouldDehydrateQuery,
} from "@gnd/ui/tanstack";
import superjson from "superjson";

export function makeQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000,
            },
            dehydrate: {
                serializeData: superjson.serialize,
                shouldDehydrateQuery: (query) =>
                    defaultShouldDehydrateQuery(query) ||
                    query.state.status === "pending",
            },
            hydrate: {
                deserializeData: superjson.deserialize,
            },
        },
        mutationCache: new MutationCache({
            onMutate: async (variables, mutation) => {
                const title =
                    mutation?.meta?.toastTitle?.loading || "Processing...";
                toast({
                    title,
                    variant: "progress",
                });
            },
            onSuccess: async (data, variables, _context, mutation) => {
                const title =
                    mutation?.meta?.toastTitle?.success || "Success ...";
                toast({
                    title,
                    variant: "success",
                });
            },
            onError: async (data, variables, _context, mutation) => {
                const title =
                    mutation?.meta?.toastTitle?.loading || "Error ...";
                toast({
                    title,
                    variant: "error",
                });
            },
        }),
    });
}


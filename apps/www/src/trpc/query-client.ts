import { Toast } from "@gnd/ui/toast";
import { toast } from "@gnd/ui/use-toast";
import {
    MutationCache,
    QueryClient,
    defaultShouldDehydrateQuery,
} from "@gnd/ui/tanstack";
import superjson from "superjson";
import { _trpc } from "@/components/static-trpc";
import { consoleLog } from "@gnd/utils";

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
                if (!mutation?.meta?.toastTitle?.loading) return;
                const title =
                    mutation?.meta?.toastTitle?.loading || "Processing...";
                toast({
                    title,
                    variant: "progress",
                });
            },
            onSuccess: async (data, variables, _context, mutation) => {
                if (!mutation?.meta?.toastTitle?.success) return;
                const title =
                    mutation?.meta?.toastTitle?.success || "Success ...";
                toast({
                    title,
                    variant: "success",
                });
            },
            onError: async (data, variables, _context, mutation) => {
                if (
                    process.env.NODE_ENV === "development" &&
                    mutation?.meta?.debug
                ) {
                    consoleLog("Mutation error", { data, variables, mutation });
                }
                if (!mutation?.meta?.toastTitle?.error) return;
                const title = mutation?.meta?.toastTitle?.error || "Error ...";
                toast({
                    title,
                    variant: "error",
                });
            },
        }),
    });
}

type Join<K, P> = K extends string
    ? P extends string
        ? `${K}.${P}`
        : never
    : never;

type DotPaths<T> = {
    [K in keyof T]: T[K] extends { queryKey: (...args: any) => any }
        ? K & string
        : T[K] extends object
          ? Join<K & string, DotPaths<T[K]>>
          : never;
}[keyof T];

type Routes = DotPaths<typeof _trpc>;

const e: Routes = "jobs.adminAnalytics";


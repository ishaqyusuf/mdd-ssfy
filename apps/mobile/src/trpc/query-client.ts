import { Toast } from "@/components/ui/toast";
import {
  QueryClient,
  MutationCache,
  defaultShouldDehydrateQuery,
} from "@tanstack/react-query";
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
        if (!mutation?.meta?.toastTitle?.show) return;

        const title = mutation?.meta?.toastTitle?.loading || "Processing...";

        Toast.show(title, {
          type: "info",
        });
      },
      onSuccess: async (data, variables, _context, mutation) => {
        const title = mutation?.meta?.toastTitle?.success || "Success ...";
        if (!mutation?.meta?.toastTitle?.show) return;
        Toast.show(title, {
          type: "success",
        });
      },
      onError: async (data, variables, _context, mutation) => {
        const title = mutation?.meta?.toastTitle?.loading || "Error ...";
        if (!mutation?.meta?.toastTitle?.show) return;
        Toast.show(title, {
          type: "error",
        });
      },
    }),
  });
}

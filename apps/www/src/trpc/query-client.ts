import { triggerMutationQueryEvents } from "@/lib/query-events/mutation-trigger";
import {
	MutationCache,
	QueryClient,
	defaultShouldDehydrateQuery,
	isServer,
} from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { consoleLog } from "@gnd/utils";
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
			onMutate: async (_variables, mutation) => {
				const title = mutation?.meta?.toastTitle?.loading;
				if (!title) return;

				toast({
					title,
					variant: "progress",
				});
			},
			onSuccess: (data, variables, _context, mutation) => {
				const title = mutation?.meta?.toastTitle?.success;
				if (title) {
					toast({
						title,
						variant: "success",
					});
				}

				if (isServer) return;

				triggerMutationQueryEvents({
					data,
					metaEvents: mutation.meta?.queryEvents,
					metaScope: mutation.meta?.queryEventScope,
					mutationKey: mutation.options.mutationKey,
					variables,
				});
			},
			onError: async (data, variables, _context, mutation) => {
				if (process.env.NODE_ENV === "development" && mutation?.meta?.debug) {
					consoleLog("Mutation error", { data, variables, mutation });
				}

				const title = mutation?.meta?.toastTitle?.error;
				if (!title) return;

				toast({
					title,
					variant: "error",
				});
			},
		}),
	});
}

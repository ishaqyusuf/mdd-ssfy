import { triggerMutationQueryEvents } from "@/lib/query-events/mutation-trigger";
import {
	formatSpecialOrderOperationWarning,
	getSpecialOrderOperationWarnings,
} from "@/lib/special-order-operation-feedback";
import { getErrorPresentation } from "@gnd/errors";
import {
	MutationCache,
	QueryClient,
	defaultShouldDehydrateQuery,
	isServer,
} from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { consoleLog } from "@gnd/utils";
import { QueryCache } from "@tanstack/react-query";
import superjson from "superjson";

export function makeQueryClient() {
	return new QueryClient({
		queryCache: new QueryCache({
			onError: (error, query) => {
				if (isServer || query.state.data !== undefined) return;
				const presentation = getErrorPresentation(error);
				toast({
					description: `${presentation.description} ${presentation.reference}`,
					title: presentation.title,
					variant: "error",
				});
			},
		}),
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
			onSuccess: async (data, variables, _context, mutation) => {
				const title = mutation?.meta?.toastTitle?.success;
				if (title) {
					toast({
						title,
						variant: "success",
					});
				}

				if (isServer) return;

				for (const warning of getSpecialOrderOperationWarnings(data)) {
					toast({
						...formatSpecialOrderOperationWarning(warning),
						variant: "default",
					});
				}

				await triggerMutationQueryEvents({
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
				if (mutation.options.onError) return;

				const presentation = getErrorPresentation(data);
				const title = mutation?.meta?.toastTitle?.error ?? presentation.title;

				toast({
					description: `${presentation.description} ${presentation.reference}`,
					title,
					variant: "error",
				});
			},
		}),
	});
}

import { Toast } from "@/components/ui/toast";
import { getErrorPresentation } from "@gnd/errors";
import {
	MutationCache,
	QueryCache,
	QueryClient,
	defaultShouldDehydrateQuery,
} from "@tanstack/react-query";
import superjson from "superjson";

export function makeQueryClient() {
	return new QueryClient({
		queryCache: new QueryCache({
			onError: (error, query) => {
				if (query.state.data !== undefined) return;
				const presentation = getErrorPresentation(error);
				Toast.show(
					`${presentation.title}. ${presentation.description} ${presentation.reference}`,
					{ type: "error" },
				);
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
				if (mutation.options.onError) return;
				const presentation = getErrorPresentation(data);
				const title = mutation?.meta?.toastTitle?.error || presentation.title;
				Toast.show(
					`${title}. ${presentation.description} ${presentation.reference}`,
					{
						type: "error",
					},
				);
			},
		}),
	});
}

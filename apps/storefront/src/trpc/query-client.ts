import { getErrorPresentation } from "@gnd/errors";
import { toast } from "@gnd/ui/use-toast";
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
				if (typeof window === "undefined" || query.state.data !== undefined)
					return;
				const presentation = getErrorPresentation(error);
				toast({
					description: `${presentation.description} ${presentation.reference}`,
					title: presentation.title,
					variant: "destructive",
				});
			},
		}),
		mutationCache: new MutationCache({
			onError: (error, _variables, _context, mutation) => {
				if (typeof window === "undefined") return;
				if (mutation.options.onError) return;
				const presentation = getErrorPresentation(error);
				toast({
					description: `${presentation.description} ${presentation.reference}`,
					title: presentation.title,
					variant: "destructive",
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
	});
}

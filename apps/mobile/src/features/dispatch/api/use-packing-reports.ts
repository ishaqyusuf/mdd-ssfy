import { _trpc } from "@/components/static-trpc";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidateDispatchQueries } from "./dispatch-query-invalidation";

export function usePackingReports(dispatchId?: number | null) {
	const queryClient = useQueryClient();
	const context = useQuery(
		_trpc.packingReports.context.queryOptions(
			{ dispatchId: dispatchId || 0 },
			{ enabled: Boolean(dispatchId) },
		),
	);
	const submit = useMutation(
		_trpc.packingReports.submit.mutationOptions({
			async onSuccess() {
				await invalidateDispatchQueries(queryClient);
			},
		}),
	);

	return { context, submit };
}

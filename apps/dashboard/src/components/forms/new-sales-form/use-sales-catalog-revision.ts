import { useTRPC } from "@/trpc/client";
import { useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { useEffect, useRef } from "react";
import { isSalesCatalogCacheEnabled } from "./catalog-rollout";

/** One observer per mounted form keeps long-lived picker snapshots revision-aware. */
export function useSalesCatalogRevision() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const enabled = isSalesCatalogCacheEnabled();
	const observedRevision = useRef<number | null>(null);
	const formRevision = useRef<number | null>(null);
	const revisionQuery = useQuery(
		trpc.newSalesForm.getCatalogRevision.queryOptions(
			{},
			{
				enabled,
				staleTime: 0,
				refetchInterval: 60_000,
				refetchIntervalInBackground: false,
				refetchOnWindowFocus: "always",
				refetchOnReconnect: "always",
			},
		),
	);
	if (formRevision.current == null && revisionQuery.data?.revision != null) {
		formRevision.current = revisionQuery.data.revision;
	}

	useEffect(() => {
		const revision = revisionQuery.data?.revision;
		if (!enabled || revision == null) return;
		const catalogKey = trpc.newSalesForm.getComponentCatalog.queryKey();
		const customKey = trpc.newSalesForm.searchCustomComponents.queryKey();
		const routingKey = trpc.newSalesForm.getStepRouting.queryKey();
		if (observedRevision.current == null) {
			observedRevision.current = revision;
			const cachedCatalog = queryClient.getQueriesData<{
				revision: number;
			}>({ queryKey: catalogKey });
			const staleCatalog = cachedCatalog.some(
				([, data]) => data?.revision != null && data.revision !== revision,
			);
			const routingNeedsProbe =
				!cachedCatalog.length &&
				queryClient.getQueriesData({ queryKey: routingKey }).length > 0;
			if (!staleCatalog && !routingNeedsProbe) return;
		} else {
			if (revision === observedRevision.current) return;
			observedRevision.current = revision;
		}
		void (async () => {
			await Promise.all([
				queryClient.cancelQueries({ queryKey: catalogKey }),
				queryClient.cancelQueries({ queryKey: customKey }),
				queryClient.cancelQueries({ queryKey: routingKey }),
			]);
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: catalogKey }),
				queryClient.invalidateQueries({ queryKey: customKey }),
				queryClient.invalidateQueries({ queryKey: routingKey }),
			]);
		})();
	}, [enabled, queryClient, revisionQuery.data?.revision, trpc]);

	return { ...revisionQuery, formRevision: formRevision.current };
}

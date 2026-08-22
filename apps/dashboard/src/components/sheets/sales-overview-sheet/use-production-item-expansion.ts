import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useEffect, useRef, useState } from "react";

export function useProductionItemExpansion({
	itemUids,
	orderId,
	workerMode,
	legacyTabState = false,
}: {
	itemUids: string[];
	orderId?: number | null;
	workerMode: boolean;
	legacyTabState?: boolean;
}) {
	const queryCtx = useSalesOverviewQuery();
	const requestedItemUid = queryCtx.params["prod-item-view"];
	const expansionScopeKey = `${orderId || "loading"}:${itemUids.join(",")}`;
	const initializedScopeRef = useRef<string | null>(null);
	const requestedItemRef = useRef<string | null>(null);
	const [expandedItemUids, setExpandedItemUids] = useState<string[]>([]);

	useEffect(() => {
		if (!orderId || initializedScopeRef.current === expansionScopeKey) return;
		initializedScopeRef.current = expansionScopeKey;
		requestedItemRef.current = requestedItemUid || null;
		setExpandedItemUids(
			requestedItemUid && itemUids.includes(requestedItemUid)
				? [requestedItemUid]
				: workerMode
					? itemUids.slice(0, 1)
					: [],
		);
	}, [expansionScopeKey, itemUids, orderId, requestedItemUid, workerMode]);

	useEffect(() => {
		if (
			initializedScopeRef.current !== expansionScopeKey ||
			requestedItemRef.current === (requestedItemUid || null)
		) {
			return;
		}
		const previousRequestedItemUid = requestedItemRef.current;
		requestedItemRef.current = requestedItemUid || null;
		setExpandedItemUids((current) => {
			const next = previousRequestedItemUid
				? current.filter((uid) => uid !== previousRequestedItemUid)
				: [...current];
			if (requestedItemUid && itemUids.includes(requestedItemUid)) {
				return next.includes(requestedItemUid)
					? next
					: [...next, requestedItemUid];
			}
			return next;
		});
	}, [expansionScopeKey, itemUids, requestedItemUid]);

	const toggleItem = (itemUid: string) => {
		const isOpen = expandedItemUids.includes(itemUid);
		const next = isOpen
			? expandedItemUids.filter((uid) => uid !== itemUid)
			: [...expandedItemUids, itemUid];
		const nextActiveItemUid = isOpen ? (next.at(-1) ?? null) : itemUid;
		requestedItemRef.current = nextActiveItemUid;
		setExpandedItemUids(next);
		queryCtx.setParams({
			"prod-item-view": nextActiveItemUid,
			...(legacyTabState
				? { "prod-item-tab": nextActiveItemUid ? "details" : null }
				: {}),
		});
	};

	return { expandedItemUids, toggleItem };
}

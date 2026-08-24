import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useEffect, useRef, useState } from "react";

import { getInitialProductionItemExpansion } from "./production-item-expansion-policy";

export function useProductionItemExpansion({
	itemUids,
	orderId,
	workerMode,
	legacyTabState = false,
	singleOpen = false,
}: {
	itemUids: string[];
	orderId?: number | null;
	workerMode: boolean;
	legacyTabState?: boolean;
	singleOpen?: boolean;
}) {
	const queryCtx = useSalesOverviewQuery();
	const setParams = queryCtx.setParams;
	const requestedItemUid = queryCtx.params["prod-item-view"];
	const expansionScopeKey = `${orderId || "loading"}:${itemUids.join(",")}`;
	const initializedScopeRef = useRef<string | null>(null);
	const requestedItemRef = useRef<string | null>(null);
	const [expandedItemUids, setExpandedItemUids] = useState<string[]>([]);

	useEffect(() => {
		if (!orderId || initializedScopeRef.current === expansionScopeKey) return;
		initializedScopeRef.current = expansionScopeKey;
		const next = getInitialProductionItemExpansion({
			itemUids,
			requestedItemUid,
			singleOpen,
			workerMode,
		});
		const nextActiveItemUid = next[0] ?? null;
		requestedItemRef.current = requestedItemUid || null;
		setExpandedItemUids(next);
		if (singleOpen && nextActiveItemUid !== (requestedItemUid || null)) {
			void setParams({ "prod-item-view": nextActiveItemUid });
		}
	}, [
		expansionScopeKey,
		itemUids,
		orderId,
		requestedItemUid,
		setParams,
		singleOpen,
		workerMode,
	]);

	useEffect(() => {
		if (
			initializedScopeRef.current !== expansionScopeKey ||
			requestedItemRef.current === (requestedItemUid || null)
		) {
			return;
		}
		const previousRequestedItemUid = requestedItemRef.current;
		if (singleOpen) {
			const next = getInitialProductionItemExpansion({
				itemUids,
				requestedItemUid,
				singleOpen,
				workerMode,
			});
			const nextActiveItemUid = next[0] ?? null;
			requestedItemRef.current = nextActiveItemUid;
			setExpandedItemUids(next);
			if (nextActiveItemUid !== (requestedItemUid || null)) {
				void setParams({ "prod-item-view": nextActiveItemUid });
			}
			return;
		}
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
	}, [
		expansionScopeKey,
		itemUids,
		requestedItemUid,
		setParams,
		singleOpen,
		workerMode,
	]);

	const toggleItem = (itemUid: string) => {
		if (singleOpen) {
			if (!itemUids.includes(itemUid)) return;
			requestedItemRef.current = itemUid;
			setExpandedItemUids([itemUid]);
			void setParams({ "prod-item-view": itemUid });
			return;
		}
		const isOpen = expandedItemUids.includes(itemUid);
		const next = isOpen
			? expandedItemUids.filter((uid) => uid !== itemUid)
			: [...expandedItemUids, itemUid];
		const nextActiveItemUid = isOpen ? (next.at(-1) ?? null) : itemUid;
		requestedItemRef.current = nextActiveItemUid;
		setExpandedItemUids(next);
		void setParams({
			"prod-item-view": nextActiveItemUid,
			...(legacyTabState
				? { "prod-item-tab": nextActiveItemUid ? "details" : null }
				: {}),
		});
	};

	return { expandedItemUids, toggleItem };
}

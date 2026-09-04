import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useEffect, useRef, useState } from "react";

import {
	getInitialProductionItemExpansion,
	getNextProductionItemExpansion,
} from "./production-item-expansion-policy";

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
		const next = getNextProductionItemExpansion({
			currentItemUids: expandedItemUids,
			itemUid,
			itemUids,
			singleOpen,
		});
		requestedItemRef.current = next.requestedItemUid;
		setExpandedItemUids(next.expandedItemUids);
		void setParams({
			"prod-item-view": next.requestedItemUid,
			...(legacyTabState
				? { "prod-item-tab": next.requestedItemUid ? "details" : null }
				: {}),
		});
	};

	return { expandedItemUids, toggleItem };
}

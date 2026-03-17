"use client";

import { useEffect, useMemo, useRef } from "react";

import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";

type V2Mode =
	| "quote"
	| "sales"
	| "sales-production"
	| "dispatch-modal"
	| "production-tasks"
	| null
	| undefined;

type V2Tab =
	| "general"
	| "production"
	| "transactions"
	| "dispatch"
	| "packing"
	| "notes"
	| null
	| undefined;

function toLegacyTab(tab: V2Tab) {
	if (tab === "transactions") return "transaction";
	return tab;
}

export function useSyncLegacySalesOverviewQuery({
	id,
	salesType,
	mode,
	tab,
	active,
}: {
	id?: string | null;
	salesType?: string | null;
	mode?: V2Mode;
	tab?: V2Tab;
	active: boolean;
}) {
	const legacy = useSalesOverviewQuery();
	const ownsLegacyStateRef = useRef(false);
	const nextLegacyState = useMemo(() => {
		if (!active || !id) return null;

		return {
			"sales-overview-id": id,
			"sales-type":
				(salesType as "quote" | "sales" | null | undefined) || "sales",
			mode: mode || "sales",
			salesTab:
				(toLegacyTab(tab) as typeof legacy.params.salesTab) || "general",
		};
	}, [active, id, mode, salesType, tab]);

	useEffect(() => {
		if (!nextLegacyState) {
			if (ownsLegacyStateRef.current) {
				legacy.setParams(null);
				ownsLegacyStateRef.current = false;
			}
			return;
		}

		const isAlreadySynced =
			legacy.params["sales-overview-id"] ===
				nextLegacyState["sales-overview-id"] &&
			legacy.params["sales-type"] === nextLegacyState["sales-type"] &&
			legacy.params.mode === nextLegacyState.mode &&
			legacy.params.salesTab === nextLegacyState.salesTab;

		if (!isAlreadySynced) {
			ownsLegacyStateRef.current = true;
			legacy.setParams(nextLegacyState);
			return;
		}

		ownsLegacyStateRef.current = true;
	}, [
		legacy.params["sales-overview-id"],
		legacy.params["sales-type"],
		legacy.params.mode,
		legacy.params.salesTab,
		legacy.setParams,
		nextLegacyState,
	]);

	useEffect(() => {
		return () => {
			if (ownsLegacyStateRef.current) {
				legacy.setParams(null);
			}
		};
	}, [legacy.setParams]);
}

import type { NewSalesFormSaveDraftInput } from "./schema";

type SavedSalesFormIdentity = {
	salesId?: number | null;
	slug?: string | null;
	version?: string | null;
};

export function rebaseQueuedSalesFormPayload(
	payload: NewSalesFormSaveDraftInput | null,
	response: SavedSalesFormIdentity | null | undefined,
): NewSalesFormSaveDraftInput | null {
	if (!payload || !response) return payload;
	return {
		...payload,
		salesId: response.salesId ?? payload.salesId,
		slug: response.slug ?? payload.slug,
		version: response.version ?? payload.version,
	};
}

function comparablePayload(payload: NewSalesFormSaveDraftInput | null) {
	if (!payload) return null;
	return {
		type: payload.type,
		inventoryStatus: payload.inventoryStatus,
		meta: payload.meta,
		lineItems: payload.lineItems,
		extraCosts: payload.extraCosts,
		summary: payload.summary,
	};
}

export function hasNewerSalesFormPayload(
	latest: NewSalesFormSaveDraftInput | null,
	saved: NewSalesFormSaveDraftInput,
) {
	return (
		JSON.stringify(comparablePayload(latest)) !==
		JSON.stringify(comparablePayload(saved))
	);
}

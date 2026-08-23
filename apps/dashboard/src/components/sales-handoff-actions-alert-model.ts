export const SALES_HANDOFF_ACTION_BATCH_SIZE = 6;

export function visibleSalesHandoffActions<T>(
	actions: T[],
	visibleCount: number,
) {
	return actions.slice(
		0,
		Math.max(SALES_HANDOFF_ACTION_BATCH_SIZE, visibleCount),
	);
}

export function hiddenSalesHandoffActionCount(
	actions: unknown[],
	visibleCount: number,
) {
	return Math.max(0, actions.length - visibleCount);
}

export function nextSalesHandoffVisibleCount(current: number, total: number) {
	return Math.min(total, current + SALES_HANDOFF_ACTION_BATCH_SIZE);
}

export function groupSalesHandoffActionsByRepresentative<
	T extends { responsibleRepId: number; responsibleRepName: string },
>(actions: T[]) {
	const groups = new Map<
		number,
		{ representativeName: string; actions: T[] }
	>();
	for (const action of actions) {
		const group = groups.get(action.responsibleRepId) ?? {
			representativeName: action.responsibleRepName,
			actions: [],
		};
		group.actions.push(action);
		groups.set(action.responsibleRepId, group);
	}
	return Array.from(groups, ([representativeId, group]) => ({
		representativeId,
		...group,
	}));
}

export type SalesHandoffFocusState = {
	actionId: string;
	orderId: string;
	observedOpen: boolean;
} | null;

export function beginSalesHandoffFocusTracking(input: {
	actionId: string;
	orderId: string;
}): SalesHandoffFocusState {
	return { ...input, observedOpen: false };
}

export function getSalesHandoffFocusRestoreTarget(originAvailable: boolean) {
	return originAvailable ? ("origin" as const) : ("fallback" as const);
}

export function advanceSalesHandoffFocusTracking(
	state: SalesHandoffFocusState,
	openOrderId: string | null,
): {
	state: SalesHandoffFocusState;
	restoreActionId: string | null;
} {
	if (!state) return { state, restoreActionId: null };
	if (openOrderId === state.orderId) {
		return {
			state: { ...state, observedOpen: true },
			restoreActionId: null,
		};
	}
	if (!openOrderId && state.observedOpen) {
		return { state: null, restoreActionId: state.actionId };
	}
	return { state, restoreActionId: null };
}

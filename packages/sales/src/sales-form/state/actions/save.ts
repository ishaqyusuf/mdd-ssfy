import type { SalesFormState, SalesFormStateRecord } from "../types";

export function markSalesFormSaving<TState extends SalesFormState>(
	state: TState,
): TState {
	return {
		...state,
		saveStatus: "saving",
		lastSaveError: null,
	};
}

export function markSalesFormSaved<
	TRecord extends SalesFormStateRecord,
	TState extends SalesFormState<TRecord>,
>(
	state: TState,
	payload: { version?: string; updatedAt?: string | null },
	now = new Date().toISOString(),
): TState {
	return {
		...state,
		record: !state.record
			? state.record
			: ({
					...state.record,
					version: payload.version ?? state.record.version,
					updatedAt: payload.updatedAt ?? state.record.updatedAt,
				} as TRecord),
		saveStatus: "saved",
		dirty: false,
		lastSaveError: null,
		lastSavedAt: payload.updatedAt ?? state.lastSavedAt ?? now,
	};
}

export function markSalesFormError<TState extends SalesFormState>(
	state: TState,
	message: string,
): TState {
	return {
		...state,
		saveStatus: "error",
		lastSaveError: message,
	};
}

export function markSalesFormStale<TState extends SalesFormState>(
	state: TState,
	message = "Your form is out of date.",
): TState {
	return {
		...state,
		saveStatus: "stale",
		lastSaveError: message,
	};
}

export function clearSalesFormDirty<TState extends SalesFormState>(
	state: TState,
): TState {
	return {
		...state,
		dirty: false,
	};
}


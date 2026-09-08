import {
	ROW_ACTIVITY_RETENTION_MS,
	ROW_SUCCESS_MAX_LIFETIME_MS,
} from "@/lib/table-row-activity/timing";
export type RowActivityPhase =
	| "processing"
	| "success"
	| "error"
	| "canceled"
	| "review-required"
	| "unknown";

export type RowActivityToken = {
	ownerId: string;
	tableId: string;
	entityId: number;
	operationId: string;
};
export type RowActivity = RowActivityToken & {
	phase: RowActivityPhase;
	label: string;
	startedAt: number;
	settledAt?: number;
};
export type RowActivityOutcome = {
	phase: Exclude<RowActivityPhase, "processing">;
	label: string;
};

export function rowActivityKey(token: Omit<RowActivityToken, "operationId">) {
	return JSON.stringify([token.ownerId, token.tableId, token.entityId]);
}

/** Non-persisted client presentation ledger. It never owns query invalidation. */
export function createRowActivityStore(now: () => number = Date.now) {
	let activities: ReadonlyMap<string, RowActivity> = new Map();
	const listeners = new Set<() => void>();
	const captures = new Set<(activity: RowActivity) => void>();
	const publish = (next: Map<string, RowActivity>) => {
		activities = next;
		for (const listener of listeners) listener();
	};
	return {
		getSnapshot: () => activities,
		subscribe(listener: () => void) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		onBegin(capture: (activity: RowActivity) => void) {
			captures.add(capture);
			return () => {
				captures.delete(capture);
			};
		},
		get(token: RowActivityToken) {
			const current = activities.get(rowActivityKey(token));
			return current?.operationId === token.operationId ? current : undefined;
		},
		begin(
			input: Omit<RowActivityToken, "operationId"> & {
				label: string;
				startedAt?: number;
			},
		) {
			const activity: RowActivity = {
				...input,
				operationId: crypto.randomUUID(),
				phase: "processing",
				startedAt: input.startedAt ?? now(),
			};
			// Capture before subscribers can render or the caller can start a request.
			for (const capture of captures) capture(activity);
			publish(new Map(activities).set(rowActivityKey(activity), activity));
			return activity as RowActivityToken;
		},
		settle(token: RowActivityToken, outcome: RowActivityOutcome) {
			const key = rowActivityKey(token);
			const current = activities.get(key);
			if (
				!current ||
				current.operationId !== token.operationId ||
				current.phase !== "processing"
			)
				return;
			publish(
				new Map(activities).set(key, {
					...current,
					...outcome,
					settledAt: now(),
				}),
			);
		},
		clear(token: RowActivityToken) {
			const key = rowActivityKey(token);
			if (activities.get(key)?.operationId !== token.operationId) return;
			const next = new Map(activities);
			next.delete(key);
			publish(next);
		},
		clearOwner(ownerId: string) {
			publish(
				new Map(
					[...activities].filter(
						([, activity]) => activity.ownerId !== ownerId,
					),
				),
			);
		},
	};
}

export const tableRowActivity = createRowActivityStore();

// Expire terminal activity even when every table unmounts before its dwell ends.
let cleanupTimer: ReturnType<typeof setTimeout> | undefined;
tableRowActivity.subscribe(() => {
	if (cleanupTimer) clearTimeout(cleanupTimer);
	const terminal = [...tableRowActivity.getSnapshot().values()].filter(
		(a) => a.settledAt !== undefined,
	);
	if (!terminal.length) return;
	const nextExpiry = Math.min(
		...terminal.map((a) => a.settledAt! + ROW_ACTIVITY_RETENTION_MS),
	);
	cleanupTimer = setTimeout(
		() => {
			for (const activity of terminal) {
				if (Date.now() >= activity.settledAt! + ROW_ACTIVITY_RETENTION_MS)
					tableRowActivity.clear(activity);
			}
		},
		Math.max(0, nextExpiry - Date.now()),
	);
});

export function isRowActivityBusy(
	ownerId: string,
	tableId: string,
	entityIds: readonly number[],
) {
	return entityIds.some((entityId) => {
		const activity = tableRowActivity
			.getSnapshot()
			.get(rowActivityKey({ ownerId, tableId, entityId }));
		return (
			activity?.phase === "processing" ||
			(activity?.phase === "success" &&
				Date.now() < (activity.settledAt ?? 0) + ROW_SUCCESS_MAX_LIFETIME_MS)
		);
	});
}

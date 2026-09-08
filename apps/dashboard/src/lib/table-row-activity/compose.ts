import type { RowActivity } from "@/store/table-row-activity";

import {
	ROW_SUCCESS_DWELL_MS,
	ROW_EXIT_FADE_MS,
	ROW_FAILURE_DWELL_MS,
	ROW_SUCCESS_MAX_LIFETIME_MS,
} from "./timing";

export type RowActivitySnapshot<T> = {
	row: T;
	index: number;
	activity: RowActivity;
	presentedAt?: number;
};
export type RowPresentation = {
	phase: RowActivity["phase"];
	label: string;
	retained: boolean;
	exiting: boolean;
	interactionDisabled: boolean;
};

/** Pure presentation composition. Inputs and cached server rows are never mutated. */
export function composeActivityRows<T>({
	serverRows,
	snapshots,
	getEntityId,
	now,
	refresh,
}: {
	serverRows: readonly T[];
	snapshots: readonly RowActivitySnapshot<T>[];
	getEntityId: (row: T) => number;
	now: number;
	refresh?: { completedAt: number; entityIds: ReadonlySet<number> };
}) {
	const displayRows = [...serverRows];
	const present = new Set(serverRows.map(getEntityId));
	const presentationById = new Map<number, RowPresentation>();
	let nextExpiryAt = Infinity;
	for (const snapshot of [...snapshots].sort((a, b) => a.index - b.index)) {
		const { activity } = snapshot;
		const settledAt = activity.settledAt;
		const terminal = settledAt !== undefined;
		const successExpiry = terminal
			? Math.min(
					(snapshot.presentedAt ?? now) +
						ROW_SUCCESS_DWELL_MS +
						ROW_EXIT_FADE_MS,
					settledAt + ROW_SUCCESS_MAX_LIFETIME_MS,
				)
			: Infinity;
		const fadeAt = successExpiry - ROW_EXIT_FADE_MS;
		const expiryAt = terminal
			? activity.phase === "success"
				? successExpiry
				: settledAt + ROW_FAILURE_DWELL_MS
			: Infinity;
		if (now >= expiryAt) continue;
		nextExpiryAt = Math.min(nextExpiryAt, expiryAt);
		const absent = !present.has(activity.entityId);
		const retained =
			absent &&
			activity.phase === "success" &&
			settledAt !== undefined &&
			refresh !== undefined &&
			refresh.completedAt >= settledAt &&
			!refresh.entityIds.has(activity.entityId);
		if (absent && !retained) continue;
		if (retained) {
			displayRows.splice(
				Math.min(snapshot.index, displayRows.length),
				0,
				snapshot.row,
			);
			present.add(activity.entityId);
		}
		const exiting = retained && now >= fadeAt;
		presentationById.set(activity.entityId, {
			phase: activity.phase,
			label: activity.label,
			retained,
			exiting,
			interactionDisabled:
				retained ||
				activity.phase === "processing" ||
				activity.phase === "success",
		});
		nextExpiryAt = Math.min(
			nextExpiryAt,
			retained && now < fadeAt ? fadeAt : expiryAt,
		);
	}
	return { displayRows, presentationById, nextExpiryAt };
}

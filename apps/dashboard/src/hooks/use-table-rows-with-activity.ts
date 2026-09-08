"use client";

import {
	composeActivityRows,
	type RowActivitySnapshot,
} from "@/lib/table-row-activity/compose";
import {
	ROW_SUCCESS_DWELL_MS,
	ROW_EXIT_FADE_MS,
	ROW_FAILURE_DWELL_MS,
	ROW_SUCCESS_MAX_LIFETIME_MS,
} from "@/lib/table-row-activity/timing";
import { tableRowActivity } from "@/store/table-row-activity";
import { useEffect, useLayoutEffect, useReducer, useRef, useMemo } from "react";

/** Each mounted table owns its snapshots; navigation never clears shared jobs. */
export function useTableRowsWithActivity<T>({
	serverRows,
	ownerId,
	tableId,
	scopeKey,
	refresh,
	getEntityId,
	onCapture,
	onCommitted,
}: {
	serverRows: readonly T[];
	ownerId: string;
	tableId: string;
	scopeKey: string;
	refresh?: { completedAt: number; entityIds: ReadonlySet<number> };
	getEntityId: (row: T) => number;
	onCapture?: (row: T) => void;
	onCommitted?: (row: T) => void;
}) {
	const [revision, render] = useReducer((value: number) => value + 1, 0);
	const inputRef = useRef({ serverRows, getEntityId, onCapture, onCommitted });
	const snapshotsRef = useRef(new Map<number, RowActivitySnapshot<T>>());
	const currentScope = JSON.stringify([ownerId, tableId, scopeKey]);
	const scopeRef = useRef(currentScope);
	// Never expose the previous view's snapshots, including before effect cleanup.
	const sameScope = scopeRef.current === currentScope;

	useLayoutEffect(() => {
		inputRef.current = { serverRows, getEntityId, onCapture, onCommitted };
	});
	useLayoutEffect(() => {
		scopeRef.current = currentScope;
		snapshotsRef.current.clear();
		let captured = false;
		const stopCapture = tableRowActivity.onBegin((activity) => {
			if (activity.ownerId !== ownerId || activity.tableId !== tableId) return;
			const { serverRows: rows, getEntityId: identify } = inputRef.current;
			const index = rows.findIndex(
				(row) => identify(row) === activity.entityId,
			);
			const row = rows[index];
			if (row !== undefined) {
				inputRef.current.onCapture?.(row);
				snapshotsRef.current.set(activity.entityId, { row, index, activity });
				captured = true;
			}
		});
		for (const activity of tableRowActivity.getSnapshot().values()) {
			if (
				activity.ownerId !== ownerId ||
				activity.tableId !== tableId ||
				activity.phase !== "processing"
			)
				continue;
			const index = inputRef.current.serverRows.findIndex(
				(row) => inputRef.current.getEntityId(row) === activity.entityId,
			);
			const row = inputRef.current.serverRows[index];
			if (row !== undefined)
				snapshotsRef.current.set(activity.entityId, { row, index, activity });
		}
		if (snapshotsRef.current.size) render();
		const stopSubscribe = tableRowActivity.subscribe(() => {
			let changed = false;
			for (const [id, snapshot] of snapshotsRef.current) {
				const latest = tableRowActivity.get(snapshot.activity);
				if (!latest) {
					snapshotsRef.current.delete(id);
					changed = true;
				} else if (latest !== snapshot.activity) {
					snapshotsRef.current.set(id, { ...snapshot, activity: latest });
					if (
						latest.phase === "success" &&
						snapshot.activity.phase !== "success"
					)
						inputRef.current.onCommitted?.(snapshot.row);
					changed = true;
				}
			}
			// A begin capture is synchronous and already contains the new activity.
			// Notify only this view when one of its captured operations is present.
			if (changed || captured) render();
			captured = false;
		});
		return () => {
			stopCapture();
			stopSubscribe();
			snapshotsRef.current.clear();
		};
	}, [currentScope, ownerId, tableId]);

	const composed = useMemo(
		() =>
			composeActivityRows({
				serverRows,
				snapshots: sameScope ? [...snapshotsRef.current.values()] : [],
				getEntityId,
				refresh,
				now: Date.now(),
			}),
		[serverRows, getEntityId, refresh, sameScope, currentScope, revision],
	);
	useLayoutEffect(() => {
		let changed = false;
		for (const [id, presentation] of composed.presentationById) {
			const snapshot = snapshotsRef.current.get(id);
			if (
				snapshot &&
				presentation.phase === "success" &&
				snapshot.presentedAt === undefined
			) {
				snapshotsRef.current.set(id, { ...snapshot, presentedAt: Date.now() });
				changed = true;
			}
		}
		if (changed) render();
	}, [composed]);
	useEffect(() => {
		if (!Number.isFinite(composed.nextExpiryAt)) return;
		const timer = setTimeout(
			() => {
				for (const [id, snapshot] of snapshotsRef.current) {
					const { activity } = snapshot;
					if (activity.settledAt === undefined) continue;
					const expiryAt =
						activity.phase === "success"
							? Math.min(
									(snapshot.presentedAt ?? Infinity) +
										ROW_SUCCESS_DWELL_MS +
										ROW_EXIT_FADE_MS,
									activity.settledAt + ROW_SUCCESS_MAX_LIFETIME_MS,
								)
							: activity.settledAt + ROW_FAILURE_DWELL_MS;
					if (Date.now() >= expiryAt) {
						snapshotsRef.current.delete(id);
					}
				}
				render();
			},
			Math.max(0, composed.nextExpiryAt - Date.now()),
		);
		return () => clearTimeout(timer);
	}, [composed.nextExpiryAt, currentScope]);
	return composed;
}

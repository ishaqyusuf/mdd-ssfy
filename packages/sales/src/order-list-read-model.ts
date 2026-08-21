export const SALES_ORDER_LIST_PROJECTION_VERSION = 1;

export type SalesOrderListProjectionPayload = Record<string, unknown>;

export type SalesOrderListProjectionEnvelope = {
	salesOrderId: number;
	orderId: string;
	sourceUpdatedAt: string;
	payload: SalesOrderListProjectionPayload;
};

export function isSalesOrderListProjectionFresh(input: {
	state: string;
	version: number;
	sourceUpdatedAt: Date;
	projectionSourceUpdatedAt: Date;
	projectedAt: Date;
	maxAgeMs: number;
	now?: number;
}) {
	return (
		input.state === "ready" &&
		input.version === SALES_ORDER_LIST_PROJECTION_VERSION &&
		input.sourceUpdatedAt.getTime() ===
			input.projectionSourceUpdatedAt.getTime() &&
		input.projectedAt.getTime() >=
			(input.now ?? Date.now()) - input.maxAgeMs
	);
}

const DATE_FIELDS = new Set([
	"createdAt",
	"paymentDueDate",
	"receivedAt",
	"currentRequestExpiresAt",
	"lastSyncedAt",
]);

function jsonSafe(value: unknown): unknown {
	if (value instanceof Date) return value.toISOString();
	if (Array.isArray(value)) {
		return value.map((entry) => (entry === undefined ? null : jsonSafe(entry)));
	}
	if (!value || typeof value !== "object") return value;

	return Object.fromEntries(
		Object.entries(value).flatMap(([key, entry]) =>
			entry === undefined ? [] : [[key, jsonSafe(entry)]],
		),
	);
}

function hydrateDates(value: unknown, key?: string): unknown {
	if (Array.isArray(value)) {
		return value.map((entry) => hydrateDates(entry));
	}
	if (!value || typeof value !== "object") {
		if (key && DATE_FIELDS.has(key) && typeof value === "string") {
			const date = new Date(value);
			return Number.isNaN(date.getTime()) ? value : date;
		}
		return value;
	}

	return Object.fromEntries(
		Object.entries(value).map(([entryKey, entry]) => [
			entryKey,
			hydrateDates(entry, entryKey),
		]),
	);
}

export function serializeSalesOrderListRow(
	row: Record<string, unknown>,
): SalesOrderListProjectionPayload {
	return jsonSafe(row) as SalesOrderListProjectionPayload;
}

export function hydrateSalesOrderListRow<T>(
	payload: SalesOrderListProjectionPayload,
): T {
	return hydrateDates(payload) as T;
}

function stableJson(value: unknown): string {
	if (Array.isArray(value)) {
		return `[${value.map(stableJson).join(",")}]`;
	}
	if (!value || typeof value !== "object") {
		return JSON.stringify(value) ?? "undefined";
	}

	return `{${Object.entries(value)
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
		.join(",")}}`;
}

export function compareSalesOrderListRows(
	legacyRows: Array<Record<string, unknown>>,
	projectionRows: Array<Record<string, unknown>>,
) {
	const legacyIds = legacyRows.map((row) => Number(row.id));
	const projectionIds = projectionRows.map((row) => Number(row.id));
	const mismatchedIds = legacyRows.flatMap((legacyRow, index) => {
		const projectionRow = projectionRows[index];
		if (!projectionRow) return [Number(legacyRow.id)];
		return stableJson(jsonSafe(legacyRow)) === stableJson(jsonSafe(projectionRow))
			? []
			: [Number(legacyRow.id)];
	});

	return {
		matches:
			legacyIds.length === projectionIds.length && mismatchedIds.length === 0,
		legacyIds,
		projectionIds,
		mismatchedIds,
	};
}

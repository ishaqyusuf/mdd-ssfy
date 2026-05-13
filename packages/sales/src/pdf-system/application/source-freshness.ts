const PERSISTED_SOURCE_TIMESTAMP_PRECISION_MS = 1000;

export type SalesSourceFreshness = {
	isStale: boolean;
	sourceUpdatedAtMs: number | null;
	saleUpdatedAtMs: number | null;
	normalizedSourceUpdatedAtMs: number | null;
	normalizedSaleUpdatedAtMs: number | null;
	normalizedDeltaMs: number | null;
	reason:
		| "missing-source-updated-at"
		| "missing-sale-updated-at"
		| "fresh"
		| "stale";
};

function normalizeToPersistedSourcePrecision(value: Date) {
	return (
		Math.floor(value.getTime() / PERSISTED_SOURCE_TIMESTAMP_PRECISION_MS) *
		PERSISTED_SOURCE_TIMESTAMP_PRECISION_MS
	);
}

export function evaluateSalesSourceFreshness(input: {
	sourceUpdatedAt?: Date | null;
	saleUpdatedAt?: Date | null;
}): SalesSourceFreshness {
	const sourceUpdatedAtMs = input.sourceUpdatedAt?.getTime() ?? null;
	const saleUpdatedAtMs = input.saleUpdatedAt?.getTime() ?? null;

	if (!input.saleUpdatedAt) {
		return {
			isStale: false,
			sourceUpdatedAtMs,
			saleUpdatedAtMs,
			normalizedSourceUpdatedAtMs: input.sourceUpdatedAt
				? normalizeToPersistedSourcePrecision(input.sourceUpdatedAt)
				: null,
			normalizedSaleUpdatedAtMs: null,
			normalizedDeltaMs: null,
			reason: "missing-sale-updated-at",
		};
	}

	if (!input.sourceUpdatedAt) {
		return {
			isStale: true,
			sourceUpdatedAtMs,
			saleUpdatedAtMs,
			normalizedSourceUpdatedAtMs: null,
			normalizedSaleUpdatedAtMs: normalizeToPersistedSourcePrecision(
				input.saleUpdatedAt,
			),
			normalizedDeltaMs: null,
			reason: "missing-source-updated-at",
		};
	}

	const normalizedSourceUpdatedAtMs = normalizeToPersistedSourcePrecision(
		input.sourceUpdatedAt,
	);
	const normalizedSaleUpdatedAtMs = normalizeToPersistedSourcePrecision(
		input.saleUpdatedAt,
	);
	const normalizedDeltaMs =
		normalizedSaleUpdatedAtMs - normalizedSourceUpdatedAtMs;
	const isStale = normalizedSourceUpdatedAtMs < normalizedSaleUpdatedAtMs;

	return {
		isStale,
		sourceUpdatedAtMs,
		saleUpdatedAtMs,
		normalizedSourceUpdatedAtMs,
		normalizedSaleUpdatedAtMs,
		normalizedDeltaMs,
		reason: isStale ? "stale" : "fresh",
	};
}

export function isSalesSourceStale(input: {
	sourceUpdatedAt?: Date | null;
	saleUpdatedAt?: Date | null;
}) {
	return evaluateSalesSourceFreshness(input).isStale;
}

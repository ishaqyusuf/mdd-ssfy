export type SalesOrderListReadModelMode = "off" | "shadow" | "read";

type SalesOrdersQuery = Record<string, unknown>;

const QUERY_CONTROL_KEYS = new Set(["cursor", "size", "sort"]);

function roundDuration(value: number) {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizePercentage(value: number) {
	if (!Number.isFinite(value)) return 0;
	return Math.min(Math.max(value, 0), 100);
}

function stableBucket(value: string) {
	let hash = 2_166_136_261;
	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 16_777_619);
	}
	return (hash >>> 0) % 100;
}

export function salesOrderReadModelCohortPercentage() {
	const value = Number(
		process.env.GND_SALES_ORDERS_READ_MODEL_COHORT_PERCENTAGE ?? 0,
	);
	return normalizePercentage(value);
}

export function resolveSalesOrderReadModelCohort(input: {
	configuredMode: SalesOrderListReadModelMode;
	userId?: number;
	percentage: number;
}) {
	const percentage = normalizePercentage(input.percentage);
	if (input.configuredMode !== "read") {
		return {
			configuredMode: input.configuredMode,
			effectiveMode: input.configuredMode,
			percentage,
			included: false,
		};
	}

	const included =
		percentage >= 100 ||
		(Boolean(input.userId) &&
			stableBucket(`sales-orders:${input.userId}`) < percentage);

	return {
		configuredMode: input.configuredMode,
		effectiveMode: included ? ("read" as const) : ("off" as const),
		percentage,
		included,
	};
}

function hasFilterValue(value: unknown) {
	if (value === undefined || value === null || value === "") return false;
	if (Array.isArray(value)) return value.length > 0;
	return true;
}

export function describeSalesOrdersQuery(query: SalesOrdersQuery) {
	const activeFilters = Object.entries(query)
		.filter(
			([key, value]) => !QUERY_CONTROL_KEYS.has(key) && hasFilterValue(value),
		)
		.map(([key]) => key)
		.sort();
	const broadSearch = hasFilterValue(query.q);
	const exactOrderSearch =
		hasFilterValue(query.orderNo) || hasFilterValue(query.salesNo);
	const searchKind = broadSearch
		? "broad"
		: exactOrderSearch
			? "exact_order"
			: activeFilters.length
				? "structured"
				: "none";

	return {
		searchKind,
		activeFilters,
		cursorPresent: hasFilterValue(query.cursor),
		pageSize: Number(query.size) || 20,
		sortCount: Array.isArray(query.sort) ? query.sort.length : 0,
	};
}

export function buildSalesOrdersPerformanceEvent(input: {
	procedure: "sales.getOrders" | "sales.getOrdersSummary";
	requestId?: string;
	configuredMode: SalesOrderListReadModelMode;
	effectiveMode: SalesOrderListReadModelMode;
	cohortPercentage: number;
	cohortIncluded: boolean;
	selectedPath: "projection" | "legacy" | "summary";
	fallbackReason?: string;
	status: "ok" | "error";
	totalDurationMs: number;
	stageDurationsMs: Record<string, number>;
	resultSize?: number;
	query: SalesOrdersQuery;
}) {
	return {
		procedure: input.procedure,
		requestId: input.requestId ?? null,
		configuredMode: input.configuredMode,
		effectiveMode: input.effectiveMode,
		cohortPercentage: normalizePercentage(input.cohortPercentage),
		cohortIncluded: input.cohortIncluded,
		selectedPath: input.selectedPath,
		fallbackReason: input.fallbackReason ?? null,
		status: input.status,
		totalDurationMs: roundDuration(input.totalDurationMs),
		stageDurationsMs: Object.fromEntries(
			Object.entries(input.stageDurationsMs).map(([stage, duration]) => [
				stage,
				roundDuration(duration),
			]),
		),
		resultSize: input.resultSize ?? null,
		...describeSalesOrdersQuery(input.query),
	};
}

function shouldLogPerformanceSample(requestId?: string) {
	const configured = Number(
		process.env.GND_SALES_ORDERS_PERFORMANCE_SAMPLE_RATE ?? 1,
	);
	const rate = Math.min(
		Math.max(Number.isFinite(configured) ? configured : 1, 0),
		1,
	);
	if (rate >= 1) return true;
	if (rate <= 0) return false;
	return stableBucket(requestId ?? crypto.randomUUID()) < rate * 100;
}

export type SalesOrdersPerformanceTracker = ReturnType<
	typeof createSalesOrdersPerformanceTracker
>;

export function createSalesOrdersPerformanceTracker(input: {
	procedure: "sales.getOrders" | "sales.getOrdersSummary";
	requestId?: string;
	configuredMode: SalesOrderListReadModelMode;
	effectiveMode: SalesOrderListReadModelMode;
	cohortPercentage: number;
	cohortIncluded: boolean;
	query: SalesOrdersQuery;
}) {
	const startedAt = performance.now();
	const stageDurationsMs: Record<string, number> = {};

	return {
		async measure<T>(stage: string, operation: () => Promise<T>) {
			const stageStartedAt = performance.now();
			try {
				return await operation();
			} finally {
				stageDurationsMs[stage] =
					(stageDurationsMs[stage] ?? 0) + (performance.now() - stageStartedAt);
			}
		},
		finish(result: {
			selectedPath: "projection" | "legacy" | "summary";
			fallbackReason?: string;
			status: "ok" | "error";
			resultSize?: number;
		}) {
			const event = buildSalesOrdersPerformanceEvent({
				...input,
				...result,
				totalDurationMs: performance.now() - startedAt,
				stageDurationsMs,
			});
			if (shouldLogPerformanceSample(input.requestId)) {
				console.info("[sales-orders-performance]", event);
			}
			return event;
		},
	};
}

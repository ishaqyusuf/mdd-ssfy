import {
	type AssistantAnalyticsQueryIntent,
	assistantAnalyticsQueryIntentSchema,
	getAssistantAnalyticsMetric,
} from "./analytics-contract";

const MAX_SCOPE_IDS = 2_000;
const MAX_QUERY_ROWS = 5_000;
const MAX_QUERY_BYTES = 2_000_000;
const MAX_QUERY_COST = 20_000;
export const ASSISTANT_ANALYTICS_TIMEOUT_MS = 8_000;

type AnalyticsGrant =
	| "viewOrders"
	| "viewOrderPayment"
	| "viewProduction"
	| "viewInventory"
	| "viewCommunity";

export type AssistantAnalyticsAuthority = {
	grants: Partial<Record<AnalyticsGrant, boolean>>;
	salesOrderIds?: readonly number[];
	projectIds?: readonly number[];
	timezone: string;
};

export type AssistantAnalyticsQueryPlan = {
	version: "assistant-analytics-query-plan-v1";
	metric: AssistantAnalyticsQueryIntent["metric"];
	statementId:
		| "sales-revenue-v1"
		| "sales-pipeline-input-v1"
		| "fulfillment-pipeline-input-v1"
		| "production-throughput-v1"
		| "inventory-projection-input-v1"
		| "community-progress-v1";
	text: string;
	values: readonly (string | number)[];
	postProcessor:
		| "none"
		| "sales-pipeline-status"
		| "sales-pipeline-blockers"
		| "sales-inventory-overview";
	bounds: {
		maxQueryCount: number;
		maxRows: number;
		maxBytes: number;
		timeoutMs: number;
		estimatedCost: number;
	};
	metadata: {
		requiredGrant: string;
		scopeKind: "sales-order-ids" | "project-ids";
		scopeCount: number;
		timezone: string;
		dateRange: AssistantAnalyticsQueryIntent["dateRange"];
	};
	result: Pick<
		AssistantAnalyticsQueryIntent,
		"filters" | "groupBy" | "presentation" | "sort" | "limit" | "cursor"
	>;
};

function assertTimezone(timezone: string) {
	try {
		new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
	} catch {
		throw new Error("Invalid analytics actor timezone");
	}
}

function normalizeScopeIds(ids: readonly number[] | undefined, kind: string) {
	if (!ids?.length) throw new Error(`Analytics ${kind} scope is empty`);
	const normalized = [...new Set(ids)];
	if (normalized.length > MAX_SCOPE_IDS) {
		throw new Error(`Analytics ${kind} scope exceeds ${MAX_SCOPE_IDS} IDs`);
	}
	if (!normalized.every((id) => Number.isSafeInteger(id) && id > 0)) {
		throw new Error(`Analytics ${kind} scope contains an invalid ID`);
	}
	return normalized.sort((left, right) => left - right);
}

function sqlList(size: number) {
	return Array.from({ length: size }, () => "?").join(", ");
}

function periodExpression(
	groupBy: AssistantAnalyticsQueryIntent["groupBy"],
	field: string,
) {
	switch (groupBy) {
		case "day":
			return `DATE_FORMAT(CONVERT_TZ(${field}, 'UTC', ?), '%Y-%m-%d')`;
		case "week":
			return `DATE_FORMAT(CONVERT_TZ(${field}, 'UTC', ?), '%x-W%v')`;
		case "month":
			return `DATE_FORMAT(CONVERT_TZ(${field}, 'UTC', ?), '%Y-%m')`;
		default:
			return "'all'";
	}
}

function appendFilter(
	clauses: string[],
	values: (string | number)[],
	filter: AssistantAnalyticsQueryIntent["filters"][number],
	columns: Partial<
		Record<AssistantAnalyticsQueryIntent["filters"][number]["field"], string>
	>,
	timezone: string,
) {
	const column = columns[filter.field];
	if (!column) return;
	const filterValues = Array.isArray(filter.value)
		? filter.value
		: [filter.value];
	if (filter.field === "createdAt") {
		const boundary = `${filterValues[0]} ${filter.operator === "lte" ? "23:59:59" : "00:00:00"}`;
		clauses.push(
			`${column} ${filter.operator === "lte" ? "<=" : ">="} CONVERT_TZ(?, ?, 'UTC')`,
		);
		values.push(boundary, timezone);
		return;
	}
	if (filter.operator === "in") {
		clauses.push(`${column} IN (${sqlList(filterValues.length)})`);
		values.push(...filterValues);
		return;
	}
	clauses.push(`${column} = ?`);
	values.push(filterValues[0] as string | number);
}

function compileStatement(
	intent: AssistantAnalyticsQueryIntent,
	scopeIds: number[],
	timezone: string,
) {
	const scope = sqlList(scopeIds.length);
	const from = `${intent.dateRange.from} 00:00:00`;
	const through = `${intent.dateRange.to} 23:59:59`;
	const clauses: string[] = [];
	const values: (string | number)[] = [];
	const resultOrder = intent.sort.field === "value" ? "value" : "label";
	const resultDirection = intent.sort.direction === "desc" ? "DESC" : "ASC";

	if (intent.metric === "sales.revenueByPeriod") {
		const period =
			intent.groupBy === "salesRepId"
				? "CAST(so.salesRepId AS CHAR)"
				: periodExpression(intent.groupBy, "so.createdAt");
		if (["day", "week", "month"].includes(intent.groupBy))
			values.push(timezone);
		clauses.push(
			`so.id IN (${scope})`,
			"so.deletedAt IS NULL",
			"so.archivedAt IS NULL",
			"so.type = 'order'",
			"so.createdAt >= CONVERT_TZ(?, ?, 'UTC')",
			"so.createdAt <= CONVERT_TZ(?, ?, 'UTC')",
		);
		values.push(...scopeIds, from, timezone, through, timezone);
		for (const filter of intent.filters) {
			appendFilter(
				clauses,
				values,
				filter,
				{
					createdAt: "so.createdAt",
					salesRepId: "so.salesRepId",
					customerId: "so.customerId",
				},
				timezone,
			);
		}
		return {
			statementId: "sales-revenue-v1" as const,
			postProcessor: "none" as const,
			text: `SELECT ${period} AS label, 'USD' AS currency, COALESCE(SUM(so.grandTotal), 0) AS value FROM SalesOrders so WHERE ${clauses.join(" AND ")} GROUP BY label, currency ORDER BY ${resultOrder} ${resultDirection} LIMIT ?`,
			values: [...values, intent.limit],
		};
	}

	if (intent.metric === "production.throughputByPeriod") {
		const period =
			intent.groupBy === "salesRepId"
				? "CAST(so.salesRepId AS CHAR)"
				: periodExpression(intent.groupBy, "ops.createdAt");
		if (["day", "week", "month"].includes(intent.groupBy))
			values.push(timezone);
		clauses.push(
			`so.id IN (${scope})`,
			"so.deletedAt IS NULL",
			"so.archivedAt IS NULL",
			"ops.deletedAt IS NULL",
			"(ops.materialReviewId IS NULL OR review.status = 'APPROVED')",
			"ops.createdAt >= CONVERT_TZ(?, ?, 'UTC')",
			"ops.createdAt <= CONVERT_TZ(?, ?, 'UTC')",
		);
		values.push(...scopeIds, from, timezone, through, timezone);
		for (const filter of intent.filters) {
			appendFilter(
				clauses,
				values,
				filter,
				{
					createdAt: "ops.createdAt",
					salesRepId: "so.salesRepId",
				},
				timezone,
			);
		}
		return {
			statementId: "production-throughput-v1" as const,
			postProcessor: "none" as const,
			text: `SELECT ${period} AS label, COALESCE(SUM(ops.qty), 0) AS value FROM OrderProductionSubmissions ops INNER JOIN SalesOrderItems soi ON soi.id = ops.salesOrderItemId AND soi.deletedAt IS NULL INNER JOIN SalesOrders so ON so.id = soi.salesOrderId AND so.id IN (${scope}) LEFT JOIN SalesProductionSubmissionMaterialReview review ON review.id = ops.materialReviewId WHERE ${clauses.join(" AND ")} GROUP BY label ORDER BY ${resultOrder} ${resultDirection} LIMIT ?`,
			// Scope is deliberately bound in both the join and aggregate predicate.
			values: [
				...values.slice(
					0,
					["day", "week", "month"].includes(intent.groupBy) ? 1 : 0,
				),
				...scopeIds,
				...values.slice(
					["day", "week", "month"].includes(intent.groupBy) ? 1 : 0,
				),
				intent.limit,
			],
		};
	}

	if (intent.metric === "community.progressByProject") {
		const dimension =
			intent.groupBy === "projectId"
				? {
						select: "p.id AS projectId",
						group: "projectId",
						order: "projectId",
					}
				: intent.groupBy === "status"
					? { select: "h.status AS status", group: "status", order: "status" }
					: { select: "'all' AS label", group: "label", order: "label" };
		clauses.push(
			`p.id IN (${scope})`,
			"p.deletedAt IS NULL",
			"COALESCE(p.archived, 0) = 0",
			"p.createdAt >= CONVERT_TZ(?, ?, 'UTC')",
			"p.createdAt <= CONVERT_TZ(?, ?, 'UTC')",
		);
		values.push(...scopeIds, from, timezone, through, timezone);
		for (const filter of intent.filters) {
			appendFilter(
				clauses,
				values,
				filter,
				{
					createdAt: "p.createdAt",
					projectId: "p.id",
					status: "h.status",
				},
				timezone,
			);
		}
		return {
			statementId: "community-progress-v1" as const,
			postProcessor: "none" as const,
			text: `SELECT ${dimension.select}, COUNT(DISTINCT h.id) AS value FROM Projects p LEFT JOIN Homes h ON h.projectId = p.id AND p.id IN (${scope}) AND h.deletedAt IS NULL AND COALESCE(h.archived, 0) = 0 WHERE ${clauses.join(" AND ")} GROUP BY ${dimension.group} ORDER BY ${intent.sort.field === "value" ? "value" : dimension.order} ${resultDirection} LIMIT ?`,
			values: [...scopeIds, ...values, intent.limit],
		};
	}

	clauses.push(
		`so.id IN (${scope})`,
		"so.deletedAt IS NULL",
		"so.archivedAt IS NULL",
		"so.type = 'order'",
		"so.createdAt >= CONVERT_TZ(?, ?, 'UTC')",
		"so.createdAt <= CONVERT_TZ(?, ?, 'UTC')",
	);
	values.push(...scopeIds, from, timezone, through, timezone);
	const columns = {
		createdAt: "so.createdAt",
		type: "so.type",
		salesRepId: "so.salesRepId",
		customerId: "so.customerId",
	} as const;
	for (const filter of intent.filters)
		appendFilter(clauses, values, filter, columns, timezone);
	const projection =
		intent.metric === "sales.orderCountByStatus"
			? ["sales-pipeline-input-v1", "sales-pipeline-status"]
			: intent.metric === "fulfillment.blockersByReason"
				? ["fulfillment-pipeline-input-v1", "sales-pipeline-blockers"]
				: ["inventory-projection-input-v1", "sales-inventory-overview"];
	return {
		statementId: projection[0] as AssistantAnalyticsQueryPlan["statementId"],
		postProcessor:
			projection[1] as AssistantAnalyticsQueryPlan["postProcessor"],
		text: `SELECT so.id, so.createdAt, so.type, so.salesRepId, so.customerId FROM SalesOrders so WHERE ${clauses.join(" AND ")} ORDER BY so.id LIMIT ${MAX_QUERY_ROWS}`,
		values,
	};
}

export function compileAssistantAnalyticsQueryPlan(
	rawIntent: unknown,
	authority: AssistantAnalyticsAuthority,
): AssistantAnalyticsQueryPlan {
	const intent = assistantAnalyticsQueryIntentSchema.parse(rawIntent);
	const metric = getAssistantAnalyticsMetric(intent.metric);
	const grant = metric.requiredGrant as AnalyticsGrant;
	if (authority.grants[grant] !== true) {
		throw new Error(`Missing required analytics grant: ${grant}`);
	}
	if (
		intent.metric === "sales.revenueByPeriod" &&
		authority.grants.viewOrderPayment !== true
	) {
		throw new Error("Missing required analytics grant: viewOrderPayment");
	}
	if (intent.cursor) {
		throw new Error(
			"Analytics cursor requires a reviewed keyset pagination adapter",
		);
	}
	assertTimezone(authority.timezone);
	const scopeKind =
		intent.domain === "community" ? "project-ids" : "sales-order-ids";
	const scopeIds = normalizeScopeIds(
		scopeKind === "project-ids"
			? authority.projectIds
			: authority.salesOrderIds,
		scopeKind,
	);
	const statement = compileStatement(intent, scopeIds, authority.timezone);
	const days =
		(Date.parse(`${intent.dateRange.to}T00:00:00Z`) -
			Date.parse(`${intent.dateRange.from}T00:00:00Z`)) /
			86_400_000 +
		1;
	const estimatedCost = Math.ceil(scopeIds.length * Math.max(1, days / 30));
	if (estimatedCost > MAX_QUERY_COST) {
		throw new Error(
			`Analytics query cost ${estimatedCost} exceeds ${MAX_QUERY_COST}`,
		);
	}
	return {
		version: "assistant-analytics-query-plan-v1",
		metric: intent.metric,
		...statement,
		bounds: {
			maxQueryCount:
				statement.postProcessor === "none"
					? intent.domain === "production"
						? 3
						: 2
					: statement.postProcessor === "sales-inventory-overview"
						? 3
						: 3 + 4 * Math.ceil(scopeIds.length / 50),
			maxRows: MAX_QUERY_ROWS,
			maxBytes: MAX_QUERY_BYTES,
			timeoutMs: ASSISTANT_ANALYTICS_TIMEOUT_MS,
			estimatedCost,
		},
		metadata: {
			requiredGrant: grant,
			scopeKind,
			scopeCount: scopeIds.length,
			timezone: authority.timezone,
			dateRange: intent.dateRange,
		},
		result: {
			filters: intent.filters,
			groupBy: intent.groupBy,
			presentation: intent.presentation,
			sort: intent.sort,
			limit: intent.limit,
			cursor: intent.cursor,
		},
	};
}

export type AssistantAnalyticsQueryRunner = (input: {
	text: string;
	values: readonly (string | number)[];
	signal: AbortSignal;
}) => Promise<readonly unknown[]>;

export type AssistantAnalyticsCanonicalAdapter = (input: {
	plan: AssistantAnalyticsQueryPlan;
	scopedRows: readonly unknown[];
	signal: AbortSignal;
}) => Promise<{ rows: readonly unknown[]; queryCount: number }>;

function measureRows(rows: readonly unknown[]) {
	const serialized = JSON.stringify(rows, (_key, value) =>
		typeof value === "bigint" ? value.toString() : value,
	);
	return new TextEncoder().encode(serialized).byteLength;
}

export async function executeAssistantAnalyticsQueryPlan(
	plan: AssistantAnalyticsQueryPlan,
	run: AssistantAnalyticsQueryRunner,
	options: {
		signal?: AbortSignal;
		canonicalAdapter?: AssistantAnalyticsCanonicalAdapter;
		initialQueryCount?: number;
	} = {},
) {
	const initialQueryCount = options.initialQueryCount ?? 0;
	if (!Number.isSafeInteger(initialQueryCount) || initialQueryCount < 0) {
		throw new Error("Analytics initial query count is invalid");
	}
	if (options.signal?.aborted) throw new Error("Analytics query cancelled");
	const controller = new AbortController();
	const cancel = () => controller.abort(options.signal?.reason);
	options.signal?.addEventListener("abort", cancel, { once: true });
	const timeout = setTimeout(
		() => controller.abort("analytics-timeout"),
		plan.bounds.timeoutMs,
	);
	let rejectOnAbort: (() => void) | undefined;
	const aborted = new Promise<never>((_resolve, reject) => {
		rejectOnAbort = () =>
			reject(new Error("Analytics query cancelled or timed out"));
		controller.signal.addEventListener("abort", rejectOnAbort, { once: true });
	});
	try {
		const scopedRows = await Promise.race([
			run({
				text: plan.text,
				values: plan.values,
				signal: controller.signal,
			}),
			aborted,
		]);
		if (scopedRows.length > plan.bounds.maxRows)
			throw new Error("Analytics scoped query row limit exceeded");
		if (measureRows(scopedRows) > plan.bounds.maxBytes)
			throw new Error("Analytics scoped query byte limit exceeded");
		const projected =
			plan.postProcessor === "none"
				? { rows: scopedRows, queryCount: 0 }
				: await Promise.race([
						options.canonicalAdapter?.({
							plan,
							scopedRows,
							signal: controller.signal,
						}) ??
							Promise.reject(
								new Error(
									"Analytics canonical projection adapter is unavailable",
								),
							),
						aborted,
					]);
		if (
			!Number.isSafeInteger(projected.queryCount) ||
			projected.queryCount < 0 ||
			(plan.postProcessor !== "none" &&
				scopedRows.length > 0 &&
				projected.queryCount === 0)
		) {
			throw new Error("Analytics adapter query count is invalid");
		}
		const queryCount = initialQueryCount + 1 + projected.queryCount;
		if (queryCount > plan.bounds.maxQueryCount)
			throw new Error("Analytics query count limit exceeded");
		const rows = projected.rows;
		if (controller.signal.aborted)
			throw new Error("Analytics query cancelled or timed out");
		if (rows.length > plan.bounds.maxRows)
			throw new Error("Analytics query row limit exceeded");
		const bytes = measureRows(rows);
		if (bytes > plan.bounds.maxBytes)
			throw new Error("Analytics query byte limit exceeded");
		return {
			rows,
			rowCount: rows.length,
			bytes,
			queryCount,
		};
	} finally {
		clearTimeout(timeout);
		if (rejectOnAbort)
			controller.signal.removeEventListener("abort", rejectOnAbort);
		options.signal?.removeEventListener("abort", cancel);
	}
}

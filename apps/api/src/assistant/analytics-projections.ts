import { z } from "zod";
import type {
	AssistantAnalyticsCanonicalAdapter,
	AssistantAnalyticsQueryPlan,
} from "./analytics-query-plan";

const scopedSalesRowSchema = z
	.object({
		id: z.number().int().positive(),
		type: z.string().nullable(),
		salesRepId: z.number().int().positive().nullable(),
	})
	.passthrough();

const projectionCodeSchema = z.string().regex(/^[A-Za-z][A-Za-z0-9_-]{0,63}$/);
const pipelineProjectionSchema = z.object({
	headline: z.object({ code: projectionCodeSchema }),
	blockers: z
		.array(
			z.object({ code: projectionCodeSchema, dimension: projectionCodeSchema }),
		)
		.max(50),
});
const inventoryProjectionLineSchema = z.object({
	id: z.string().min(1).max(128),
	salesOrderId: z.number().int().positive(),
	inventoryCategoryId: z.number().int().positive().nullable(),
	qtyPending: z.number().finite().nonnegative(),
});

type PipelineProjection = z.infer<typeof pipelineProjectionSchema>;
type InventoryProjectionLine = z.infer<typeof inventoryProjectionLineSchema>;

export type AssistantAnalyticsProjectionLoaders = {
	loadPipelineSnapshots: (
		salesOrderIds: readonly number[],
		signal: AbortSignal,
		budget: AssistantAnalyticsLoaderBudget,
	) => Promise<ReadonlyMap<number, PipelineProjection>>;
	loadInventoryLines: (
		salesOrderIds: readonly number[],
		signal: AbortSignal,
		budget: AssistantAnalyticsLoaderBudget,
	) => Promise<readonly InventoryProjectionLine[]>;
};

export type AssistantAnalyticsLoaderBudget = {
	maxRows: number;
	maxBytes: number;
	maxQueries: number;
	readonly usedQueries: number;
	claimQuery: (count?: number) => void;
};

function createLoaderBudget(
	plan: AssistantAnalyticsQueryPlan,
): AssistantAnalyticsLoaderBudget {
	let usedQueries = 0;
	return {
		maxRows: plan.bounds.maxRows,
		maxBytes: plan.bounds.maxBytes,
		maxQueries: plan.bounds.maxQueryCount - 1,
		get usedQueries() {
			return usedQueries;
		},
		claimQuery(count = 1) {
			if (!Number.isSafeInteger(count) || count <= 0)
				throw new Error(
					"Analytics loader query claim must be a positive safe integer",
				);
			if (usedQueries + count > this.maxQueries)
				throw new Error("Analytics query count limit exceeded");
			usedQueries += count;
		},
	};
}

function valuesForFilter(plan: AssistantAnalyticsQueryPlan, field: string) {
	return plan.result.filters
		.filter((filter) => filter.field === field)
		.flatMap((filter) =>
			Array.isArray(filter.value) ? filter.value : [filter.value],
		);
}

function allowedByFilter(
	plan: AssistantAnalyticsQueryPlan,
	field: "status" | "reason" | "categoryId",
	value: string | number | null,
) {
	const values = valuesForFilter(plan, field);
	return values.length === 0 || (value != null && values.includes(value));
}

function aggregate(
	plan: AssistantAnalyticsQueryPlan,
	items: readonly { label: string; value: number }[],
) {
	const totals = new Map<string, number>();
	for (const item of items) {
		totals.set(item.label, (totals.get(item.label) ?? 0) + item.value);
	}
	const rows = [...totals].map(([label, value]) => ({ label, value }));
	rows.sort((left, right) => {
		const comparison =
			plan.result.sort.field === "value"
				? left.value - right.value
				: left.label.localeCompare(right.label);
		return plan.result.sort.direction === "desc" ? -comparison : comparison;
	});
	return rows.slice(0, plan.result.limit);
}

function groupLabel(
	plan: AssistantAnalyticsQueryPlan,
	row: z.infer<typeof scopedSalesRowSchema>,
	dimension: string,
) {
	if (plan.result.groupBy === "none") return "all";
	if (plan.result.groupBy === "type") return row.type ?? "unknown";
	if (plan.result.groupBy === "salesRepId")
		return row.salesRepId == null ? "unassigned" : String(row.salesRepId);
	return dimension;
}

export function createAssistantAnalyticsCanonicalAdapter(
	loaders: AssistantAnalyticsProjectionLoaders,
): AssistantAnalyticsCanonicalAdapter {
	return async ({ plan, scopedRows, signal }) => {
		const parsedRows = z.array(scopedSalesRowSchema).parse(scopedRows);
		const uniqueRows = new Map<number, z.infer<typeof scopedSalesRowSchema>>();
		for (const row of parsedRows) {
			const existing = uniqueRows.get(row.id);
			if (existing && JSON.stringify(existing) !== JSON.stringify(row))
				throw new Error("Conflicting scoped Sales order identity");
			uniqueRows.set(row.id, row);
		}
		const rows = [...uniqueRows.values()];
		const ids = rows.map((row) => row.id);
		const rowById = new Map(rows.map((row) => [row.id, row]));
		const budget = createLoaderBudget(plan);
		if (ids.length === 0) return { rows: [], queryCount: 0 };

		if (plan.postProcessor === "sales-inventory-overview") {
			const loaded = await loaders.loadInventoryLines(ids, signal, budget);
			if (budget.usedQueries === 0)
				throw new Error("Analytics canonical loader did not claim query work");
			const lines = z
				.array(inventoryProjectionLineSchema)
				.max(plan.bounds.maxRows)
				.parse(loaded);
			const distinct = new Map<string, InventoryProjectionLine>();
			for (const line of lines) {
				const existing = distinct.get(line.id);
				if (existing && JSON.stringify(existing) !== JSON.stringify(line)) {
					throw new Error(
						"Conflicting canonical inventory projection identity",
					);
				}
				distinct.set(line.id, line);
			}
			return {
				queryCount: budget.usedQueries,
				rows: aggregate(
					plan,
					[...distinct.values()]
						.filter(
							(line) =>
								rowById.has(line.salesOrderId) &&
								line.qtyPending > 0 &&
								allowedByFilter(plan, "categoryId", line.inventoryCategoryId),
						)
						.map((line) => ({
							label:
								plan.result.groupBy === "none"
									? "all"
									: line.inventoryCategoryId == null
										? "uncategorized"
										: String(line.inventoryCategoryId),
							value: line.qtyPending,
						})),
				),
			};
		}

		const loadedSnapshots = await loaders.loadPipelineSnapshots(
			ids,
			signal,
			budget,
		);
		if (budget.usedQueries === 0)
			throw new Error("Analytics canonical loader did not claim query work");
		const missingIds = ids.filter((id) => !loadedSnapshots.has(id));
		if (missingIds.length) {
			throw new Error("Canonical Sales pipeline snapshot set is incomplete");
		}
		const snapshots = new Map(
			ids.flatMap((id) => {
				const snapshot = loadedSnapshots.get(id);
				return snapshot
					? ([[id, pipelineProjectionSchema.parse(snapshot)]] as const)
					: [];
			}),
		);
		if (plan.postProcessor === "sales-pipeline-status") {
			return {
				queryCount: budget.usedQueries,
				rows: aggregate(
					plan,
					rows.flatMap((row) => {
						const status = snapshots.get(row.id)?.headline.code;
						if (!status || !allowedByFilter(plan, "status", status)) return [];
						return [{ label: groupLabel(plan, row, status), value: 1 }];
					}),
				),
			};
		}

		const seen = new Set<string>();
		return {
			queryCount: budget.usedQueries,
			rows: aggregate(
				plan,
				rows.flatMap((row) =>
					(snapshots.get(row.id)?.blockers ?? [])
						.filter((blocker) => {
							if (
								blocker.dimension === "payment" ||
								!allowedByFilter(plan, "reason", blocker.code)
							)
								return false;
							const key = `${row.id}:${blocker.code}`;
							if (seen.has(key)) return false;
							seen.add(key);
							return true;
						})
						.map((blocker) => ({
							label: groupLabel(plan, row, blocker.code),
							value: 1,
						})),
				),
			),
		};
	};
}

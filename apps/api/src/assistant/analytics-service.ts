import type { Database } from "@gnd/db";
import {
	assistantSalesScopeWhere,
	getAssistantProductionAccessibleOrderIds,
} from "@gnd/db/queries";
import {
	type SalesInventoryOverviewLineItemLike,
	buildSalesOverviewInventoryGroups,
} from "@gnd/sales/sales-inventory-overview";
import { getSalesPipelineSnapshots } from "@gnd/sales/sales-pipeline-order";

import {
	type AssistantAnalyticsQueryIntent,
	getAssistantAnalyticsMetric,
} from "./analytics-contract";
import { createAssistantAnalyticsCanonicalAdapter } from "./analytics-projections";
import {
	ASSISTANT_ANALYTICS_TIMEOUT_MS,
	compileAssistantAnalyticsQueryPlan,
	executeAssistantAnalyticsQueryPlan,
} from "./analytics-query-plan";
import {
	ASSISTANT_ANALYTICS_RESULT_VERSION,
	type AssistantAnalyticsResult,
	assistantAnalyticsResultSchema,
} from "./analytics-result-contract";
import type { AssistantToolActor } from "./registry";

const MAX_ANALYTICS_SCOPE_IDS = 2_000;

type AnalyticsDatabase = Pick<
	Database,
	| "salesOrders"
	| "projects"
	| "orderProductionSubmissions"
	| "lineItemComponents"
	| "$queryRawUnsafe"
>;

function assertNotAborted(signal: AbortSignal) {
	if (signal.aborted) throw new Error("Analytics query cancelled");
}

function serializedByteLength(value: unknown) {
	return new TextEncoder().encode(
		JSON.stringify(value, (_key, item) =>
			typeof item === "bigint" ? item.toString() : item,
		),
	).byteLength;
}

function coarseUtcDateBounds(intent: AssistantAnalyticsQueryIntent) {
	const from = new Date(`${intent.dateRange.from}T00:00:00.000Z`);
	const through = new Date(`${intent.dateRange.to}T23:59:59.999Z`);
	from.setUTCDate(from.getUTCDate() - 1);
	through.setUTCDate(through.getUTCDate() + 1);
	return { gte: from, lte: through };
}

async function resolveScopeIds(
	db: AnalyticsDatabase,
	actor: AssistantToolActor,
	intent: AssistantAnalyticsQueryIntent,
	signal: AbortSignal,
) {
	assertNotAborted(signal);
	if (intent.domain === "community") {
		if (actor.scopeType !== "organization") {
			throw new Error("Assistant Community requires organization scope");
		}
		const orgId = Number(actor.scopeId);
		if (!Number.isSafeInteger(orgId) || orgId <= 0) {
			throw new Error("Assistant organization scope is invalid");
		}
		const projects = await db.projects.findMany({
			where: {
				orgId,
				deletedAt: null,
				createdAt: coarseUtcDateBounds(intent),
				OR: [{ archived: false }, { archived: null }],
			},
			orderBy: { id: "asc" },
			take: MAX_ANALYTICS_SCOPE_IDS + 1,
			select: { id: true },
		});
		assertNotAborted(signal);
		if (projects.length > MAX_ANALYTICS_SCOPE_IDS) {
			throw new Error("Analytics project scope exceeds 2000 IDs");
		}
		return projects.map(({ id }) => id);
	}
	if (intent.domain === "production") {
		const submissionWindow = {
			deletedAt: null,
			createdAt: coarseUtcDateBounds(intent),
		};
		const orders = await db.salesOrders.findMany({
			where: {
				...assistantSalesScopeWhere(actor),
				deletedAt: null,
				archivedAt: null,
				type: "order",
				items: {
					some: {
						deletedAt: null,
						productions: { some: submissionWindow },
					},
				},
			},
			orderBy: { id: "asc" },
			take: MAX_ANALYTICS_SCOPE_IDS + 1,
			select: { id: true },
		});
		assertNotAborted(signal);
		if (orders.length > MAX_ANALYTICS_SCOPE_IDS) {
			throw new Error("Analytics Production scope exceeds 2000 IDs");
		}
		const ids = orders.map(({ id }) => id);
		const accessibleIds = await getAssistantProductionAccessibleOrderIds(
			db as Database,
			actor,
			ids,
		);
		assertNotAborted(signal);
		return accessibleIds;
	}

	const orders = await db.salesOrders.findMany({
		where: {
			...assistantSalesScopeWhere(actor),
			deletedAt: null,
			archivedAt: null,
			type: "order",
			createdAt: coarseUtcDateBounds(intent),
		},
		orderBy: { id: "asc" },
		take: MAX_ANALYTICS_SCOPE_IDS + 1,
		select: { id: true },
	});
	assertNotAborted(signal);
	if (orders.length > MAX_ANALYTICS_SCOPE_IDS) {
		throw new Error("Analytics Sales order scope exceeds 2000 IDs");
	}
	return orders.map(({ id }) => id);
}

function analyticsLabel(row: Record<string, unknown>) {
	for (const key of ["label", "status", "projectId", "categoryId"]) {
		const value = row[key];
		if (typeof value === "string" || typeof value === "number") {
			return String(value);
		}
	}
	return "all";
}

function drilldownForIntent(intent: AssistantAnalyticsQueryIntent) {
	const dateRange = encodeURIComponent(
		`${intent.dateRange.from},${intent.dateRange.to}`,
	);
	if (intent.domain === "community") {
		return { label: "View projects", href: "/community/projects" } as const;
	}
	if (intent.domain === "production") {
		return {
			label: "View production",
			href: `/sales-book/productions?dateRange=${dateRange}`,
		} as const;
	}
	return {
		label: "View orders",
		href: `/sales-book/orders?dateRange=${dateRange}`,
	} as const;
}

function normalizeRows(
	rows: readonly unknown[],
	intent: AssistantAnalyticsQueryIntent,
) {
	const drilldown = drilldownForIntent(intent);
	return rows.map((raw) => {
		if (!raw || typeof raw !== "object") {
			throw new Error("Analytics database returned an invalid row");
		}
		const row = raw as Record<string, unknown>;
		const value = Number(row.value);
		if (!Number.isFinite(value)) {
			throw new Error("Analytics database returned an invalid value");
		}
		return {
			label: analyticsLabel(row),
			value,
			drilldown,
			...(typeof row.currency === "string"
				? { secondaryLabel: row.currency }
				: {}),
		};
	});
}

function resolvePresentation(intent: AssistantAnalyticsQueryIntent) {
	if (intent.presentation !== "auto") return intent.presentation;
	if (intent.groupBy === "none") return "kpi" as const;
	if (["day", "week", "month"].includes(intent.groupBy)) return "area" as const;
	return "bar" as const;
}

const inventoryComponentSelect = {
	id: true,
	required: true,
	qty: true,
	qtyAllocated: true,
	qtyReceived: true,
	qtyInbound: true,
	status: true,
	inventoryId: true,
	inventoryVariantId: true,
	inventoryCategoryId: true,
	subComponent: { select: { inventoryCategoryId: true } },
	parent: { select: { id: true, saleId: true } },
} as const;

async function runAssistantAnalyticsWithinDeadline(
	db: AnalyticsDatabase,
	actor: AssistantToolActor,
	intent: AssistantAnalyticsQueryIntent,
	signal: AbortSignal,
): Promise<AssistantAnalyticsResult> {
	const metric = getAssistantAnalyticsMetric(intent.metric);
	if (actor.grants[metric.requiredGrant] !== true) {
		throw new Error(
			`Missing required analytics grant: ${metric.requiredGrant}`,
		);
	}
	if (
		intent.metric === "sales.revenueByPeriod" &&
		actor.grants.viewOrderPayment !== true
	) {
		throw new Error("Missing required analytics grant: viewOrderPayment");
	}
	const scopeIds = await resolveScopeIds(db, actor, intent, signal);
	const observedAt = new Date().toISOString();
	const baseResult = {
		version: ASSISTANT_ANALYTICS_RESULT_VERSION,
		metric: metric.id,
		title: metric.title,
		definition: metric.definition,
		presentation: resolvePresentation(intent),
		dateRange: { ...intent.dateRange, timezone: actor.timezone ?? "UTC" },
		unit: metric.unit,
		currency: metric.currency,
		freshness: { observedAt, label: "Live" },
		sources: metric.sourceAuthorities.slice(0, 8).map((source) => ({
			id: `${source.name}@${source.revision}`,
			label: source.name,
		})),
	};
	if (scopeIds.length === 0) {
		return assistantAnalyticsResultSchema.parse({ ...baseResult, rows: [] });
	}

	const plan = compileAssistantAnalyticsQueryPlan(intent, {
		grants: actor.grants,
		salesOrderIds: intent.domain === "community" ? undefined : scopeIds,
		projectIds: intent.domain === "community" ? scopeIds : undefined,
		timezone: actor.timezone ?? "UTC",
	});
	const canonicalAdapter = createAssistantAnalyticsCanonicalAdapter({
		loadPipelineSnapshots: async (ids, loaderSignal, budget) => {
			assertNotAborted(loaderSignal);
			const snapshots = new Map();
			for (let index = 0; index < ids.length; index += 50) {
				assertNotAborted(loaderSignal);
				budget.claimQuery(4);
				const batch = await getSalesPipelineSnapshots(
					db as Database,
					ids.slice(index, index + 50),
				);
				for (const [id, snapshot] of batch) snapshots.set(id, snapshot);
				if (serializedByteLength([...snapshots]) > budget.maxBytes) {
					throw new Error("Analytics canonical pipeline byte limit exceeded");
				}
			}
			budget.claimQuery(1);
			const current = await db.salesOrders.findMany({
				where: {
					...assistantSalesScopeWhere(actor),
					id: { in: [...ids] },
					deletedAt: null,
					archivedAt: null,
					type: "order",
				},
				select: { id: true },
			});
			assertNotAborted(loaderSignal);
			if (current.length !== ids.length) {
				throw new Error(
					"Analytics Sales scope changed during canonical loading",
				);
			}
			return snapshots;
		},
		loadInventoryLines: async (ids, loaderSignal, budget) => {
			assertNotAborted(loaderSignal);
			budget.claimQuery(1);
			const components = await db.lineItemComponents.findMany({
				where: {
					parent: {
						saleId: { in: [...ids] },
						deletedAt: null,
						lineItemType: "SALE",
						sale: {
							...assistantSalesScopeWhere(actor),
							deletedAt: null,
							archivedAt: null,
							type: "order",
						},
					},
				},
				orderBy: { id: "asc" },
				take: budget.maxRows + 1,
				select: inventoryComponentSelect,
			});
			assertNotAborted(loaderSignal);
			if (components.length > budget.maxRows) {
				throw new Error("Analytics canonical inventory row limit exceeded");
			}
			if (serializedByteLength(components) > budget.maxBytes) {
				throw new Error("Analytics canonical inventory byte limit exceeded");
			}
			return components.flatMap((component) => {
				const salesOrderId = component.parent.saleId;
				if (!salesOrderId) return [];
				const [group] = buildSalesOverviewInventoryGroups([
					{
						id: component.parent.id,
						components: [component],
					} as SalesInventoryOverviewLineItemLike,
				]);
				const row = group?.rows[0];
				return row
					? [
							{
								id: row.id,
								salesOrderId,
								inventoryCategoryId: row.inventoryCategoryId,
								qtyPending: row.qtyPending,
							},
						]
					: [];
			});
		},
	});
	const executed = await executeAssistantAnalyticsQueryPlan(
		plan,
		async ({ text, values, signal: querySignal }) => {
			assertNotAborted(querySignal);
			const rows = await db.$queryRawUnsafe<unknown[]>(text, ...values);
			assertNotAborted(querySignal);
			return rows;
		},
		{
			signal,
			canonicalAdapter,
			initialQueryCount: intent.domain === "production" ? 2 : 1,
		},
	);
	return assistantAnalyticsResultSchema.parse({
		...baseResult,
		rows: normalizeRows(executed.rows, intent),
	});
}

export async function runAssistantAnalytics(
	db: AnalyticsDatabase,
	actor: AssistantToolActor,
	intent: AssistantAnalyticsQueryIntent,
	signal: AbortSignal,
	timeoutMs = ASSISTANT_ANALYTICS_TIMEOUT_MS,
): Promise<AssistantAnalyticsResult> {
	if (signal.aborted) throw new Error("Analytics query cancelled");
	const controller = new AbortController();
	const cancel = () => controller.abort(signal.reason);
	signal.addEventListener("abort", cancel, { once: true });
	const timeout = setTimeout(
		() => controller.abort("analytics-timeout"),
		timeoutMs,
	);
	let rejectOnAbort: (() => void) | undefined;
	const aborted = new Promise<never>((_resolve, reject) => {
		rejectOnAbort = () =>
			reject(new Error("Analytics query cancelled or timed out"));
		controller.signal.addEventListener("abort", rejectOnAbort, { once: true });
	});
	try {
		return await Promise.race([
			runAssistantAnalyticsWithinDeadline(db, actor, intent, controller.signal),
			aborted,
		]);
	} finally {
		clearTimeout(timeout);
		if (rejectOnAbort) {
			controller.signal.removeEventListener("abort", rejectOnAbort);
		}
		signal.removeEventListener("abort", cancel);
	}
}

import { z } from "zod";

export const ASSISTANT_ANALYTICS_CATALOG_VERSION =
	"assistant-analytics-catalog-v1";

export const assistantAnalyticsDomains = [
	"sales",
	"fulfillment",
	"production",
	"inventory",
	"community",
] as const;

export const assistantAnalyticsOperators = ["eq", "in", "gte", "lte"] as const;

const filterFieldSchema = z.enum([
	"createdAt",
	"status",
	"type",
	"salesRepId",
	"customerId",
	"reason",
	"categoryId",
	"projectId",
]);

const groupFieldSchema = z.enum([
	"none",
	"day",
	"week",
	"month",
	"status",
	"type",
	"salesRepId",
	"reason",
	"categoryId",
	"projectId",
]);

const metricIdSchema = z.enum([
	"sales.revenueByPeriod",
	"sales.orderCountByStatus",
	"fulfillment.blockersByReason",
	"production.throughputByPeriod",
	"inventory.shortageExposureByCategory",
	"community.progressByProject",
]);

export type AssistantAnalyticsMetricId = z.infer<typeof metricIdSchema>;
export type AssistantAnalyticsFilterField = z.infer<typeof filterFieldSchema>;
export type AssistantAnalyticsGroupField = z.infer<typeof groupFieldSchema>;

type AssistantAnalyticsMetric = {
	id: AssistantAnalyticsMetricId;
	domain: (typeof assistantAnalyticsDomains)[number];
	title: string;
	definition: string;
	entity: string;
	sourceModels: readonly string[];
	sourceAuthorities: readonly {
		kind: "prisma-model" | "canonical-projection";
		name: string;
		path: string;
		revision: string;
	}[];
	stableIdFields: readonly string[];
	deduplicateBy: readonly string[];
	safeOutputFields: readonly string[];
	dateField: string;
	measureField: string;
	currencyField: string | null;
	lifecycleAuthority: string;
	scopePolicy: string;
	requiredGrant: string;
	queryOwner: string;
	sourceRevision: string;
	softDeletePolicy: string;
	deletedPolicy: "exclude";
	archivePolicy: "exclude" | "include";
	unit: "count" | "currency" | "quantity" | "percent";
	currency: "USD" | null;
	timezone: "actor";
	freshness: "transactional-primary";
	filterContracts: readonly {
		field: AssistantAnalyticsFilterField;
		sourceField: string;
		operators: readonly (typeof assistantAnalyticsOperators)[number][];
		valueType: "date" | "enum" | "id" | "code";
		allowedValues?: readonly string[];
	}[];
	allowedGroups: readonly AssistantAnalyticsGroupField[];
	allowedJoins: readonly {
		from: string;
		to: string;
		cardinality: "one-to-one" | "many-to-one" | "pre-aggregated-one-to-many";
	}[];
};

export const assistantAnalyticsCatalog = {
	version: ASSISTANT_ANALYTICS_CATALOG_VERSION,
	metrics: [
		{
			id: "sales.revenueByPeriod",
			domain: "sales",
			title: "Sales revenue by period",
			definition:
				"Current non-deleted order totals grouped by the actor's calendar period; currencies remain separate.",
			entity: "SalesOrders",
			sourceModels: ["SalesOrders"],
			sourceAuthorities: [
				{
					kind: "prisma-model",
					name: "SalesOrders",
					path: "packages/db/src/schema/sales.prisma",
					revision: "sales-orders-v1",
				},
			],
			stableIdFields: ["SalesOrders.id"],
			deduplicateBy: ["SalesOrders.id"],
			safeOutputFields: ["period", "currency", "value"],
			dateField: "SalesOrders.createdAt",
			measureField: "SalesOrders.grandTotal",
			currencyField: null,
			lifecycleAuthority: "Sales order type and deletedAt",
			scopePolicy: "existing Sales order visibility predicate",
			requiredGrant: "viewOrders",
			queryOwner: "sales",
			sourceRevision: "sales-orders-v1",
			softDeletePolicy: "exclude deletedAt and archivedAt",
			deletedPolicy: "exclude",
			archivePolicy: "exclude",
			unit: "currency",
			currency: "USD",
			timezone: "actor",
			freshness: "transactional-primary",
			filterContracts: [
				{
					field: "createdAt",
					sourceField: "SalesOrders.createdAt",
					operators: ["gte", "lte"],
					valueType: "date",
				},
				{
					field: "salesRepId",
					sourceField: "SalesOrders.salesRepId",
					operators: ["eq", "in"],
					valueType: "id",
				},
				{
					field: "customerId",
					sourceField: "SalesOrders.customerId",
					operators: ["eq", "in"],
					valueType: "id",
				},
			],
			allowedGroups: ["none", "day", "week", "month", "salesRepId"],
			allowedJoins: [],
		},
		{
			id: "sales.orderCountByStatus",
			domain: "sales",
			title: "Order count by status",
			definition:
				"Authorized current orders counted once by canonical Sales pipeline headline.",
			entity: "SalesPipelineSnapshot",
			sourceModels: ["SalesOrders"],
			sourceAuthorities: [
				{
					kind: "prisma-model",
					name: "SalesOrders",
					path: "packages/db/src/schema/sales.prisma",
					revision: "sales-orders-v1",
				},
				{
					kind: "canonical-projection",
					name: "SalesPipelineSnapshot",
					path: "packages/sales/src/sales-pipeline-order.ts",
					revision: "sales-pipeline-v1",
				},
			],
			stableIdFields: ["SalesOrders.id"],
			deduplicateBy: ["SalesOrders.id"],
			safeOutputFields: ["status", "value"],
			dateField: "SalesOrders.createdAt",
			measureField: "SalesPipelineSnapshot.headline.code",
			currencyField: null,
			lifecycleAuthority: "SalesPipelineSnapshot.headline.code",
			scopePolicy: "existing Sales order visibility predicate",
			requiredGrant: "viewOrders",
			queryOwner: "sales",
			sourceRevision: "sales-pipeline-v1",
			softDeletePolicy: "exclude deletedAt",
			deletedPolicy: "exclude",
			archivePolicy: "exclude",
			unit: "count",
			currency: null,
			timezone: "actor",
			freshness: "transactional-primary",
			filterContracts: [
				{
					field: "createdAt",
					sourceField: "SalesOrders.createdAt",
					operators: ["gte", "lte"],
					valueType: "date",
				},
				{
					field: "status",
					sourceField: "SalesPipelineSnapshot.headline.code",
					operators: ["eq", "in"],
					valueType: "code",
				},
				{
					field: "salesRepId",
					sourceField: "SalesOrders.salesRepId",
					operators: ["eq", "in"],
					valueType: "id",
				},
			],
			allowedGroups: ["none", "status", "salesRepId"],
			allowedJoins: [
				{
					from: "SalesOrders",
					to: "SalesPipelineSnapshot",
					cardinality: "one-to-one",
				},
			],
		},
		{
			id: "fulfillment.blockersByReason",
			domain: "fulfillment",
			title: "Fulfillment blockers by reason",
			definition:
				"Canonical Sales pipeline blocker projections counted once per order and reason.",
			entity: "SalesPipelineSnapshot",
			sourceModels: ["SalesOrders"],
			sourceAuthorities: [
				{
					kind: "prisma-model",
					name: "SalesOrders",
					path: "packages/db/src/schema/sales.prisma",
					revision: "sales-orders-v1",
				},
				{
					kind: "canonical-projection",
					name: "SalesPipelineSnapshot",
					path: "packages/sales/src/sales-pipeline-order.ts",
					revision: "sales-pipeline-v1",
				},
			],
			stableIdFields: ["SalesOrders.id", "SalesPipelineSnapshot.blockers.code"],
			deduplicateBy: ["SalesOrders.id", "SalesPipelineSnapshot.blockers.code"],
			safeOutputFields: ["reason", "value"],
			dateField: "SalesOrders.createdAt",
			measureField: "SalesPipelineSnapshot.blockers.code",
			currencyField: null,
			lifecycleAuthority: "canonical Sales pipeline projection",
			scopePolicy:
				"authorized Sales IDs are selected before pipeline hydration",
			requiredGrant: "viewOrders",
			queryOwner: "sales-pipeline",
			sourceRevision: "sales-pipeline-v1",
			softDeletePolicy: "exclude deleted Sales and delivery rows",
			deletedPolicy: "exclude",
			archivePolicy: "exclude",
			unit: "count",
			currency: null,
			timezone: "actor",
			freshness: "transactional-primary",
			filterContracts: [
				{
					field: "createdAt",
					sourceField: "SalesOrders.createdAt",
					operators: ["gte", "lte"],
					valueType: "date",
				},
				{
					field: "reason",
					sourceField: "SalesPipelineSnapshot.blockers.code",
					operators: ["eq", "in"],
					valueType: "code",
				},
				{
					field: "salesRepId",
					sourceField: "SalesOrders.salesRepId",
					operators: ["eq", "in"],
					valueType: "id",
				},
			],
			allowedGroups: ["none", "reason", "salesRepId"],
			allowedJoins: [
				{
					from: "SalesOrders",
					to: "SalesPipelineSnapshot",
					cardinality: "one-to-one",
				},
			],
		},
		{
			id: "production.throughputByPeriod",
			domain: "production",
			title: "Production throughput",
			definition:
				"Canonical completed production quantity by completion period.",
			entity: "OrderProductionSubmissions",
			sourceModels: [
				"OrderProductionSubmissions",
				"SalesOrderItems",
				"SalesOrders",
				"SalesProductionSubmissionMaterialReview",
			],
			sourceAuthorities: [
				{
					kind: "prisma-model",
					name: "OrderProductionSubmissions",
					path: "packages/db/src/schema/sales.prisma",
					revision: "production-submissions-v1",
				},
				{
					kind: "prisma-model",
					name: "SalesOrderItems",
					path: "packages/db/src/schema/sales.prisma",
					revision: "sales-items-v1",
				},
				{
					kind: "prisma-model",
					name: "SalesOrders",
					path: "packages/db/src/schema/sales.prisma",
					revision: "sales-orders-v1",
				},
				{
					kind: "prisma-model",
					name: "SalesProductionSubmissionMaterialReview",
					path: "packages/db/src/schema/sales.prisma",
					revision: "production-material-review-v1",
				},
			],
			stableIdFields: ["OrderProductionSubmissions.id"],
			deduplicateBy: ["OrderProductionSubmissions.id"],
			safeOutputFields: ["period", "value"],
			dateField: "OrderProductionSubmissions.createdAt",
			measureField: "OrderProductionSubmissions.qty",
			currencyField: null,
			lifecycleAuthority: "accepted production submissions",
			scopePolicy: "production-accessible Sales IDs in every aggregate",
			requiredGrant: "viewProduction",
			queryOwner: "production",
			sourceRevision: "production-submissions-v1",
			softDeletePolicy: "exclude deleted submissions and Sales rows",
			deletedPolicy: "exclude",
			archivePolicy: "exclude",
			unit: "quantity",
			currency: null,
			timezone: "actor",
			freshness: "transactional-primary",
			filterContracts: [
				{
					field: "createdAt",
					sourceField: "OrderProductionSubmissions.createdAt",
					operators: ["gte", "lte"],
					valueType: "date",
				},
				{
					field: "salesRepId",
					sourceField: "SalesOrders.salesRepId",
					operators: ["eq", "in"],
					valueType: "id",
				},
			],
			allowedGroups: ["none", "day", "week", "month", "salesRepId"],
			allowedJoins: [
				{
					from: "OrderProductionSubmissions",
					to: "SalesOrderItems",
					cardinality: "many-to-one",
				},
				{
					from: "SalesOrderItems",
					to: "SalesOrders",
					cardinality: "many-to-one",
				},
				{
					from: "OrderProductionSubmissions",
					to: "SalesProductionSubmissionMaterialReview",
					cardinality: "many-to-one",
				},
			],
		},
		{
			id: "inventory.shortageExposureByCategory",
			domain: "inventory",
			title: "Inventory shortage exposure",
			definition:
				"Remaining canonical material demand grouped by inventory category.",
			entity: "SalesOrderItems",
			sourceModels: ["SalesOrders", "SalesOrderItems", "Inventory"],
			sourceAuthorities: [
				{
					kind: "prisma-model",
					name: "SalesOrders",
					path: "packages/db/src/schema/sales.prisma",
					revision: "sales-orders-v1",
				},
				{
					kind: "prisma-model",
					name: "SalesOrderItems",
					path: "packages/db/src/schema/sales.prisma",
					revision: "sales-items-v1",
				},
				{
					kind: "prisma-model",
					name: "Inventory",
					path: "packages/db/src/schema/inventory.prisma",
					revision: "inventory-v1",
				},
				{
					kind: "canonical-projection",
					name: "SalesOverviewInventoryLine",
					path: "packages/sales/src/sales-inventory-overview.ts",
					revision: "sales-inventory-overview-v1",
				},
			],
			stableIdFields: ["SalesOverviewInventoryLine.id"],
			deduplicateBy: ["SalesOverviewInventoryLine.id"],
			safeOutputFields: ["categoryId", "value"],
			dateField: "SalesOrders.createdAt",
			measureField: "SalesOverviewInventoryLine.qtyPending",
			currencyField: null,
			lifecycleAuthority: "inventory demand and inbound projections",
			scopePolicy:
				"authorized demand rows constrained before category aggregation",
			requiredGrant: "viewInventory",
			queryOwner: "inventory",
			sourceRevision: "inventory-demand-v1",
			softDeletePolicy: "exclude deleted product, demand, and Sales rows",
			deletedPolicy: "exclude",
			archivePolicy: "exclude",
			unit: "quantity",
			currency: null,
			timezone: "actor",
			freshness: "transactional-primary",
			filterContracts: [
				{
					field: "createdAt",
					sourceField: "SalesOrders.createdAt",
					operators: ["gte", "lte"],
					valueType: "date",
				},
				{
					field: "categoryId",
					sourceField: "SalesOverviewInventoryLine.inventoryCategoryId",
					operators: ["eq", "in"],
					valueType: "id",
				},
			],
			allowedGroups: ["none", "categoryId"],
			allowedJoins: [
				{
					from: "SalesOrders",
					to: "SalesOrderItems",
					cardinality: "pre-aggregated-one-to-many",
				},
				{
					from: "SalesOrderItems",
					to: "Inventory",
					cardinality: "many-to-one",
				},
				{
					from: "SalesOrderItems",
					to: "SalesOverviewInventoryLine",
					cardinality: "pre-aggregated-one-to-many",
				},
			],
		},
		{
			id: "community.progressByProject",
			domain: "community",
			title: "Community progress by project",
			definition:
				"Project unit lifecycle counts from Homes aggregated before joining Projects.",
			entity: "Projects",
			sourceModels: ["Projects", "Homes"],
			sourceAuthorities: [
				{
					kind: "prisma-model",
					name: "Projects",
					path: "packages/db/src/schema/community.prisma",
					revision: "community-projects-v1",
				},
				{
					kind: "prisma-model",
					name: "Homes",
					path: "packages/db/src/schema/community.prisma",
					revision: "community-homes-v1",
				},
			],
			stableIdFields: ["Projects.id", "Homes.id"],
			deduplicateBy: ["Homes.id"],
			safeOutputFields: ["projectId", "status", "value"],
			dateField: "Projects.createdAt",
			measureField: "Homes.id",
			currencyField: null,
			lifecycleAuthority: "Homes.status",
			scopePolicy: "authorized Community project IDs in each child aggregate",
			requiredGrant: "viewCommunity",
			queryOwner: "community",
			sourceRevision: "community-progress-v1",
			softDeletePolicy: "exclude deleted or archived projects and homes",
			deletedPolicy: "exclude",
			archivePolicy: "exclude",
			unit: "count",
			currency: null,
			timezone: "actor",
			freshness: "transactional-primary",
			filterContracts: [
				{
					field: "createdAt",
					sourceField: "Projects.createdAt",
					operators: ["gte", "lte"],
					valueType: "date",
				},
				{
					field: "projectId",
					sourceField: "Projects.id",
					operators: ["eq", "in"],
					valueType: "id",
				},
				{
					field: "status",
					sourceField: "Homes.status",
					operators: ["eq", "in"],
					valueType: "code",
				},
			],
			allowedGroups: ["none", "projectId", "status"],
			allowedJoins: [
				{
					from: "Projects",
					to: "Homes",
					cardinality: "pre-aggregated-one-to-many",
				},
			],
		},
	] satisfies readonly AssistantAnalyticsMetric[],
} as const;

function isCalendarDate(value: string) {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) return false;
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(Date.UTC(year, month - 1, day));
	return (
		date.getUTCFullYear() === year &&
		date.getUTCMonth() === month - 1 &&
		date.getUTCDate() === day
	);
}

const dateSchema = z.string().refine(isCalendarDate, "Invalid calendar date");
const idSchema = z.number().int().positive().safe();
const codeSchema = z
	.string()
	.trim()
	.regex(/^[A-Za-z][A-Za-z0-9_-]{0,63}$/);
const categoricalOperatorSchema = z.enum(["eq", "in"]);
const idValueSchema = z.union([idSchema, z.array(idSchema).min(1).max(50)]);
const codeValueSchema = z.union([
	codeSchema,
	z.array(codeSchema).min(1).max(50),
]);

const analyticsFilterSchema = z.discriminatedUnion("field", [
	z
		.object({
			field: z.literal("createdAt"),
			operator: z.enum(["gte", "lte"]),
			value: dateSchema,
		})
		.strict(),
	z
		.object({
			field: z.literal("status"),
			operator: categoricalOperatorSchema,
			value: codeValueSchema,
		})
		.strict(),
	z
		.object({
			field: z.literal("type"),
			operator: categoricalOperatorSchema,
			value: z.union([
				z.enum(["order", "quote"]),
				z
					.array(z.enum(["order", "quote"]))
					.min(1)
					.max(2),
			]),
		})
		.strict(),
	...(["salesRepId", "customerId", "categoryId", "projectId"] as const).map(
		(field) =>
			z
				.object({
					field: z.literal(field),
					operator: categoricalOperatorSchema,
					value: idValueSchema,
				})
				.strict(),
	),
	z
		.object({
			field: z.literal("reason"),
			operator: categoricalOperatorSchema,
			value: codeValueSchema,
		})
		.strict(),
]);

function filterValueMatchesContract(
	contract: AssistantAnalyticsMetric["filterContracts"][number],
	value: string | number | (string | number)[],
) {
	const values = Array.isArray(value) ? value : [value];
	if (contract.valueType === "id") {
		return values.every(
			(item) =>
				typeof item === "number" && Number.isSafeInteger(item) && item > 0,
		);
	}
	if (contract.valueType === "date") {
		return (
			values.length === 1 &&
			typeof values[0] === "string" &&
			isCalendarDate(values[0])
		);
	}
	if (!values.every((item) => typeof item === "string")) return false;
	if (contract.valueType === "enum") {
		return values.every((item) =>
			contract.allowedValues?.includes(String(item)),
		);
	}
	return values.every((item) =>
		/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(String(item)),
	);
}

export const assistantAnalyticsQueryIntentSchema = z
	.object({
		catalogVersion: z.literal(ASSISTANT_ANALYTICS_CATALOG_VERSION),
		domain: z.enum(assistantAnalyticsDomains),
		metric: metricIdSchema,
		dateRange: z.object({ from: dateSchema, to: dateSchema }).strict(),
		filters: z.array(analyticsFilterSchema).max(12).default([]),
		groupBy: groupFieldSchema,
		presentation: z
			.enum(["auto", "kpi", "table", "bar", "line", "area"])
			.default("auto"),
		sort: z
			.object({
				field: z.enum(["label", "value"]),
				direction: z.enum(["asc", "desc"]),
			})
			.strict()
			.default({ field: "label", direction: "asc" }),
		limit: z.number().int().min(1).max(100).default(25),
		cursor: z.string().trim().min(1).max(500).optional(),
	})
	.strict()
	.superRefine((intent, context) => {
		const metric = assistantAnalyticsCatalog.metrics.find(
			(candidate) => candidate.id === intent.metric,
		);
		if (!metric) return;
		if (metric.domain !== intent.domain) {
			context.addIssue({
				code: "custom",
				path: ["domain"],
				message: "Domain does not own this metric",
			});
		}
		if (intent.dateRange.from > intent.dateRange.to) {
			context.addIssue({
				code: "custom",
				path: ["dateRange"],
				message: "Date range is reversed",
			});
		}
		const from = Date.parse(`${intent.dateRange.from}T00:00:00.000Z`);
		const to = Date.parse(`${intent.dateRange.to}T00:00:00.000Z`);
		if ((to - from) / 86_400_000 > 366) {
			context.addIssue({
				code: "custom",
				path: ["dateRange"],
				message: "Date range exceeds 366 days",
			});
		}
		if (!(metric.allowedGroups as readonly string[]).includes(intent.groupBy)) {
			context.addIssue({
				code: "custom",
				path: ["groupBy"],
				message: "Grouping is not allowed for this metric",
			});
		}
		if (intent.presentation === "kpi" && intent.groupBy !== "none") {
			context.addIssue({
				code: "custom",
				path: ["presentation"],
				message: "KPI presentation requires an ungrouped metric",
			});
		}
		for (const [index, filter] of intent.filters.entries()) {
			if (
				intent.filters.findIndex(
					(candidate) => candidate.field === filter.field,
				) !== index
			) {
				context.addIssue({
					code: "custom",
					path: ["filters", index, "field"],
					message: "Each analytics filter field may appear only once",
				});
			}
			const contract = metric.filterContracts.find(
				(candidate) => candidate.field === filter.field,
			);
			if (!contract) {
				context.addIssue({
					code: "custom",
					path: ["filters", index, "field"],
					message: "Filter is not allowed for this metric",
				});
			}
			if (
				contract &&
				!(contract.operators as readonly string[]).includes(filter.operator)
			) {
				context.addIssue({
					code: "custom",
					path: ["filters", index, "operator"],
					message: "Operator is not allowed for this metric field",
				});
			}
			if (contract && !filterValueMatchesContract(contract, filter.value)) {
				context.addIssue({
					code: "custom",
					path: ["filters", index, "value"],
					message: "Value does not match the metric field contract",
				});
			}
			if (filter.operator === "in" && !Array.isArray(filter.value)) {
				context.addIssue({
					code: "custom",
					path: ["filters", index, "value"],
					message: "The in operator requires a list",
				});
			}
			if (filter.operator !== "in" && Array.isArray(filter.value)) {
				context.addIssue({
					code: "custom",
					path: ["filters", index, "value"],
					message: "This operator requires one value",
				});
			}
		}
	});

export type AssistantAnalyticsQueryIntent = z.infer<
	typeof assistantAnalyticsQueryIntentSchema
>;

export function getAssistantAnalyticsMetric(
	metricId: AssistantAnalyticsMetricId,
) {
	const metric = assistantAnalyticsCatalog.metrics.find(
		(candidate) => candidate.id === metricId,
	);
	if (!metric) throw new Error("Unknown assistant analytics metric");
	return metric;
}

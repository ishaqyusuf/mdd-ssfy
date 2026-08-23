import { createHash } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";

export type PreviewSeedRow = Record<string, unknown>;

export type PreviewSalesSeedOptions = {
	sourceUrl: string;
	targetUrl: string;
	limit: number;
	dryRun: boolean;
	allowExisting: boolean;
	expectedTargetFingerprint?: string;
};

export type PreviewSalesSeedReport = {
	dryRun: boolean;
	targetFingerprint: string;
	selectedOrders: number;
	targetOrdersBefore: number;
	targetOrdersAfter: number;
	selectedUsers: number;
	rowsByModel: Record<string, number>;
	writtenByModel: Record<string, number>;
};

type ModelMeta = (typeof Prisma.dmmf.datamodel.models)[number];
type FieldMeta = ModelMeta["fields"][number];
type Selection = Map<string, Map<string, PreviewSeedRow>>;
type ChildEdge = {
	parentName: string;
	childModel: ModelMeta;
	childRelation: FieldMeta;
};

const LOCAL_HOSTS = new Set([
	"localhost",
	"127.0.0.1",
	"::1",
	"0.0.0.0",
	"mysql",
]);
const MIN_ORDER_LIMIT = 100;
const MAX_ORDER_LIMIT = 200;
const USER_LIMIT = 100;
const RELATION_BATCH_SIZE = 100;
const WRITE_BATCH_SIZE = 100;
const MAX_ROWS_PER_MODEL_PER_ORDER = 100;

// Order-owned rows needed by sales list/detail, production, and dispatch previews.
// Provider payloads, sessions, email deliveries, refunds, and payroll are absent.
export const PREVIEW_CHILD_MODELS = new Set([
	"SalesTaxes",
	"OrderItemProductionAssignments",
	"OrderDelivery",
	"DispatchException",
	"DykeSalesDoors",
	"DykeStepForm",
	"DykeStepValues",
	"HousePackageTools",
	"SalesOrderItems",
	"SalesItemControl",
	"QtyControl",
	"OrderItemDelivery",
	"SalesPayments",
	"ComponentPrice",
	"OrderProductionSubmissions",
	"SalesStat",
	"SalesExtraCosts",
	"SalesHistory",
	"LineItem",
	"LinePricing",
	"LineItemComponents",
	"StockAllocation",
	"InboundDemand",
	"SalesInventoryProjectionState",
	"SalesOrderListProjection",
	"OrderProductionGate",
	"SalesProductionReadinessOverride",
	"SalesProductionSubmissionMaterialReview",
	"SalesPackingReport",
	"SalesOrderAdjustment",
	"SalesWorkflowCancellation",
	"SpecialOrderApprovalRequest",
	"SpecialOrderApprovalEvidence",
	"SalesHandoffActionEpoch",
	"DykeSalesShelfItem",
	"ModelHasRoles",
	"ModelHasPermissions",
	"RoleHasPermissions",
]);

const BLOCKED_PARENT_MODELS = new Set([
	"Account",
	"Session",
	"Verification",
	"EmailTokenLogin",
	"DealerToken",
	"DealerAuthUser",
	"DealerAuthSession",
	"DealerAuthAccount",
	"CustomerTransaction",
	"SquarePayments",
	"SquarePaymentOrders",
	"SquareRefunds",
	"SquarePaymentLink",
	"SalesCheckout",
	"Refunds",
	"Payroll",
	"SalesPayout",
	"SpecialOrderNotificationDelivery",
]);

export function quotePreviewIdent(identifier: string): string {
	return `\`${identifier.replaceAll("`", "``")}\``;
}

function parseInteger(value: string | undefined, fallback: number): number {
	if (!value) return fallback;
	const parsed = Number.parseInt(value, 10);
	if (!Number.isSafeInteger(parsed))
		throw new Error(`Invalid integer: ${value}`);
	return parsed;
}

export function parsePreviewSalesSeedArgs(
	argv: string[],
	env: NodeJS.ProcessEnv = process.env,
): PreviewSalesSeedOptions {
	const values = new Map<string, string>();
	const flags = new Set<string>();
	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (!arg?.startsWith("--")) throw new Error(`Unexpected argument: ${arg}`);
		if (["--dry-run", "--allow-existing"].includes(arg)) {
			flags.add(arg);
			continue;
		}
		const value = argv[index + 1];
		if (!value || value.startsWith("--"))
			throw new Error(`Missing value for ${arg}`);
		values.set(arg, value);
		index += 1;
	}

	const sourceUrl =
		values.get("--source-url") ??
		env.SOURCE_DATABASE_URL ??
		env.DATABASE_URL ??
		"";
	const targetUrl =
		values.get("--target-url") ?? env.PREVIEW_DATABASE_URL ?? "";
	const limit = parseInteger(values.get("--limit"), 150);
	if (limit < MIN_ORDER_LIMIT || limit > MAX_ORDER_LIMIT) {
		throw new Error(
			`--limit must be between ${MIN_ORDER_LIMIT} and ${MAX_ORDER_LIMIT}`,
		);
	}
	if (!sourceUrl)
		throw new Error(
			"Missing --source-url (or SOURCE_DATABASE_URL/DATABASE_URL)",
		);
	if (!targetUrl)
		throw new Error("Missing --target-url (or PREVIEW_DATABASE_URL)");

	return {
		sourceUrl,
		targetUrl,
		limit,
		dryRun: flags.has("--dry-run"),
		allowExisting: flags.has("--allow-existing"),
		expectedTargetFingerprint: values.get("--expect-target-fingerprint"),
	};
}

export function databaseCredentialFingerprint(databaseUrl: string): string {
	const parsed = new URL(databaseUrl);
	return createHash("sha256")
		.update(`${parsed.username}@${parsed.hostname}${parsed.pathname}`)
		.digest("hex")
		.slice(0, 12);
}

export function redactPreviewDatabaseUrl(databaseUrl: string): string {
	const parsed = new URL(databaseUrl);
	return `${parsed.protocol}//<redacted>@${parsed.hostname}${parsed.pathname}`;
}

export function assertSafePreviewSeedConnections(
	options: PreviewSalesSeedOptions,
): string {
	const source = new URL(options.sourceUrl);
	const target = new URL(options.targetUrl);
	if (!LOCAL_HOSTS.has(source.hostname)) {
		throw new Error(
			`Preview seed source must be a local database, received ${source.hostname}`,
		);
	}
	if (!target.hostname.endsWith("psdb.cloud")) {
		throw new Error(
			`Preview seed target must be PlanetScale, received ${target.hostname}`,
		);
	}
	if (source.href === target.href)
		throw new Error(
			"Preview seed source and target must be different databases",
		);

	const fingerprint = databaseCredentialFingerprint(options.targetUrl);
	if (!options.dryRun && !options.expectedTargetFingerprint) {
		throw new Error(
			"Writes require --expect-target-fingerprint from a successful dry run",
		);
	}
	if (
		options.expectedTargetFingerprint &&
		options.expectedTargetFingerprint !== fingerprint
	) {
		throw new Error(
			"Target credential fingerprint does not match the confirmed dry-run target",
		);
	}
	return fingerprint;
}

function normalizeKeyPart(value: unknown): string {
	if (typeof value === "bigint") return `bigint:${value.toString()}`;
	if (value instanceof Date) return `date:${value.toISOString()}`;
	if (value instanceof Uint8Array)
		return `bytes:${Buffer.from(value).toString("base64")}`;
	return `${typeof value}:${String(value)}`;
}

export function getModelKeyFields(model: ModelMeta): readonly string[] {
	if (model.primaryKey?.fields.length) return model.primaryKey.fields;
	if (model.uniqueFields[0]?.length) return model.uniqueFields[0];
	const field = model.fields.find(
		(candidate) => candidate.isId || candidate.isUnique,
	);
	return field ? [field.name] : [];
}

function rowKey(model: ModelMeta, row: PreviewSeedRow): string | undefined {
	const fields = getModelKeyFields(model);
	if (fields.length === 0 || fields.some((field) => row[field] == null))
		return undefined;
	return fields.map((field) => normalizeKeyPart(row[field])).join("|");
}

function addRows(
	selection: Selection,
	model: ModelMeta,
	rows: PreviewSeedRow[],
	maxRows = Number.POSITIVE_INFINITY,
): number {
	let bucket = selection.get(model.name);
	if (!bucket) {
		bucket = new Map();
		selection.set(model.name, bucket);
	}
	let added = 0;
	for (const row of rows) {
		const key = rowKey(model, row);
		if (!key || bucket.has(key)) continue;
		if (bucket.size >= maxRows) {
			throw new Error(
				`Preview seed exceeded the ${maxRows}-row safety cap for ${model.name}`,
			);
		}
		bucket.set(key, row);
		added += 1;
	}
	return added;
}

function buildPreviewChildEdges(models: Map<string, ModelMeta>): ChildEdge[] {
	const edges: ChildEdge[] = [];
	const edgeKeys = new Set<string>();
	const visited = new Set<string>();
	const queue = ["SalesOrders"];

	while (queue.length) {
		const parentName = queue.shift();
		if (!parentName || visited.has(parentName)) continue;
		visited.add(parentName);
		const parentModel = models.get(parentName);
		if (!parentModel) continue;

		for (const backRelation of parentModel.fields.filter(
			(field) =>
				field.kind === "object" &&
				!field.relationFromFields?.length &&
				PREVIEW_CHILD_MODELS.has(field.type),
		)) {
			const childModel = models.get(backRelation.type);
			if (!childModel) continue;
			const childRelation = childModel.fields.find(
				(field) =>
					field.kind === "object" &&
					field.type === parentName &&
					Boolean(field.relationFromFields?.length) &&
					field.relationName === backRelation.relationName,
			);
			if (!childRelation) continue;
			const edgeKey = `${parentName}:${childModel.name}:${childRelation.name}`;
			if (!edgeKeys.has(edgeKey)) {
				edges.push({ parentName, childModel, childRelation });
				edgeKeys.add(edgeKey);
			}
			queue.push(childModel.name);
		}
	}

	for (const [parentName, childName] of [
		["Users", "ModelHasRoles"],
		["Users", "ModelHasPermissions"],
		["Roles", "RoleHasPermissions"],
	] as const) {
		const childModel = models.get(childName);
		const childRelation = childModel?.fields.find(
			(field) =>
				field.kind === "object" &&
				field.type === parentName &&
				Boolean(field.relationFromFields?.length),
		);
		if (!childModel || !childRelation) continue;
		edges.push({ parentName, childModel, childRelation });
	}

	return edges;
}

function groupKey(row: PreviewSeedRow): string {
	return [
		"status",
		"prodStatus",
		"inventoryStatus",
		"invoiceStatus",
		"deliveryOption",
		"type",
	]
		.map((field) => String(row[field] ?? "none"))
		.join("|");
}

export function selectScenarioBalancedOrders(
	rows: PreviewSeedRow[],
	limit: number,
): PreviewSeedRow[] {
	const groups = new Map<string, PreviewSeedRow[]>();
	for (const row of rows) {
		const key = groupKey(row);
		const group = groups.get(key) ?? [];
		group.push(row);
		groups.set(key, group);
	}

	const orderedGroups = [...groups.entries()]
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([, group]) => group);
	const selected: PreviewSeedRow[] = [];
	let round = 0;
	while (selected.length < limit) {
		let found = false;
		for (const group of orderedGroups) {
			const row = group[round];
			if (!row) continue;
			selected.push(row);
			found = true;
			if (selected.length === limit) break;
		}
		if (!found) break;
		round += 1;
	}
	return selected;
}

function sanitizeJson(value: unknown, key = ""): unknown {
	if (Array.isArray(value)) return value.map((item) => sanitizeJson(item, key));
	if (
		value &&
		typeof value === "object" &&
		!(value instanceof Date) &&
		!(value instanceof Uint8Array)
	) {
		return Object.fromEntries(
			Object.entries(value).map(([childKey, childValue]) => [
				childKey,
				sanitizeJson(childValue, childKey),
			]),
		);
	}
	if (typeof value !== "string") return value;
	if (/token|secret|password|authorization|cookie/i.test(key)) return null;
	if (/email/i.test(key)) return "preview@example.test";
	if (/phone|mobile/i.test(key)) return "5550000000";
	if (/address|recipient|customer.?name/i.test(key)) return "Preview data";
	return value;
}

export function sanitizePreviewRow(
	modelName: string,
	row: PreviewSeedRow,
): PreviewSeedRow {
	const sanitized = Object.fromEntries(
		Object.entries(row).map(([key, value]) => [
			key,
			key === "meta" || key === "data" || key.endsWith("Snapshot")
				? sanitizeJson(value)
				: value,
		]),
	);
	const id = String(row.id ?? row.salesId ?? row.orderId ?? "record");

	if (modelName === "Customers") {
		return {
			...sanitized,
			name: `Preview Customer ${id}`,
			businessName: `Preview Customer ${id}`,
			email: `preview.customer.${id}@example.test`,
			phoneNo: `555${id.padStart(7, "0").slice(-7)}`,
			phoneNo2: null,
			address: "Preview customer address",
		};
	}
	if (modelName === "AddressBooks") {
		return {
			...sanitized,
			name: `Preview Address ${id}`,
			address1: "100 Preview Way",
			address2: null,
			email: `preview.address.${id}@example.test`,
			phoneNo: `555${id.padStart(7, "0").slice(-7)}`,
			phoneNo2: null,
		};
	}
	if (modelName === "DealerAuth") {
		return {
			...sanitized,
			name: `Preview Dealer ${id}`,
			companyName: `Preview Dealer ${id}`,
			email: `preview.dealer.${id}@example.test`,
			phoneNo: `555${id.padStart(7, "0").slice(-7)}`,
			password: null,
			authUserId: null,
		};
	}
	if (modelName === "Users") {
		return {
			...sanitized,
			rememberToken: null,
			verificationToken: null,
			meta: null,
		};
	}
	if (modelName === "SalesOrders") {
		return {
			...sanitized,
			title: `Preview Order ${String(row.orderId ?? id)}`,
			summary: null,
			instruction: null,
		};
	}
	if (modelName === "OrderDelivery")
		return { ...sanitized, deliveredTo: "Preview Recipient" };
	if (modelName === "SalesPayments") {
		return {
			...sanitized,
			note: null,
			reviewNote: null,
			squarePaymentsId: null,
			transactionId: null,
			meta: null,
		};
	}
	if (modelName === "SalesHistory")
		return { ...sanitized, authorName: "Preview User" };
	if (modelName === "OrderProductionSubmissions")
		return { ...sanitized, note: null };
	return sanitized;
}

function modelTable(model: ModelMeta): string {
	return model.dbName ?? model.name;
}

function scalarFields(model: ModelMeta): FieldMeta[] {
	return model.fields.filter((field) => field.kind !== "object");
}

function fieldColumn(field: FieldMeta): string {
	return field.dbName ?? field.name;
}

function selectColumns(model: ModelMeta): string {
	return scalarFields(model)
		.map(
			(field) =>
				`${quotePreviewIdent(fieldColumn(field))} AS ${quotePreviewIdent(field.name)}`,
		)
		.join(", ");
}

async function fetchRowsByTuples(
	client: PrismaClient,
	model: ModelMeta,
	fields: string[],
	tuples: unknown[][],
): Promise<PreviewSeedRow[]> {
	const valid = tuples.filter(
		(tuple) =>
			tuple.length === fields.length && tuple.every((value) => value != null),
	);
	if (valid.length === 0) return [];
	const results: PreviewSeedRow[] = [];
	const columns = fields.map((fieldName) => {
		const field = model.fields.find((item) => item.name === fieldName);
		if (!field)
			throw new Error(
				`Model ${model.name} does not contain field ${fieldName}`,
			);
		return quotePreviewIdent(fieldColumn(field));
	});
	for (let start = 0; start < valid.length; start += RELATION_BATCH_SIZE) {
		const batch = valid.slice(start, start + RELATION_BATCH_SIZE);
		const where = batch
			.map(() => `(${columns.map((column) => `${column} = ?`).join(" AND ")})`)
			.join(" OR ");
		const query = `SELECT ${selectColumns(model)} FROM ${quotePreviewIdent(modelTable(model))} WHERE ${where}`;
		results.push(
			...(await client.$queryRawUnsafe<PreviewSeedRow[]>(
				query,
				...batch.flat(),
			)),
		);
	}
	return results;
}

function relationValues(
	rows: PreviewSeedRow[],
	fields: readonly string[],
): unknown[][] {
	const seen = new Set<string>();
	const tuples: unknown[][] = [];
	for (const row of rows) {
		const tuple = fields.map((field) => row[field]);
		if (tuple.some((value) => value == null)) continue;
		const key = tuple.map(normalizeKeyPart).join("|");
		if (seen.has(key)) continue;
		seen.add(key);
		tuples.push(tuple);
	}
	return tuples;
}

async function collectSelection(
	source: PrismaClient,
	limit: number,
): Promise<Selection> {
	const models = new Map(
		Prisma.dmmf.datamodel.models.map((model) => [model.name, model]),
	);
	const salesModel = models.get("SalesOrders");
	const usersModel = models.get("Users");
	if (!salesModel || !usersModel)
		throw new Error("Generated Prisma schema is missing SalesOrders or Users");

	const candidates = await source.$queryRawUnsafe<PreviewSeedRow[]>(
		`SELECT ${selectColumns(salesModel)} FROM ${quotePreviewIdent(modelTable(salesModel))} WHERE ${quotePreviewIdent("deletedAt")} IS NULL ORDER BY ${quotePreviewIdent("createdAt")} DESC, ${quotePreviewIdent("id")} DESC LIMIT ?`,
		Math.min(limit * 20, 4000),
	);
	const orders = selectScenarioBalancedOrders(candidates, limit);
	if (orders.length < MIN_ORDER_LIMIT) {
		throw new Error(
			`Local source has only ${orders.length} eligible sales orders; at least ${MIN_ORDER_LIMIT} are required`,
		);
	}

	const selection: Selection = new Map();
	addRows(selection, salesModel, orders);
	const internalUsers = await source.$queryRawUnsafe<PreviewSeedRow[]>(
		`SELECT ${selectColumns(usersModel)} FROM ${quotePreviewIdent(modelTable(usersModel))} WHERE ${quotePreviewIdent("deletedAt")} IS NULL AND (${quotePreviewIdent("type")} IS NULL OR ${quotePreviewIdent("type")} <> 'CUSTOMER') ORDER BY ${quotePreviewIdent("id")} LIMIT ?`,
		USER_LIMIT,
	);
	addRows(selection, usersModel, internalUsers);
	const childEdges = buildPreviewChildEdges(models);
	const modelRowCap = limit * MAX_ROWS_PER_MODEL_PER_ORDER;

	for (let round = 0; round < 10; round += 1) {
		let added = 0;
		for (const { parentName, childModel, childRelation } of childEdges) {
			const parentRows = [...(selection.get(parentName)?.values() ?? [])];
			if (parentRows.length === 0) continue;
			const tuples = relationValues(
				parentRows,
				childRelation.relationToFields ?? [],
			);
			const rows = await fetchRowsByTuples(
				source,
				childModel,
				[...(childRelation.relationFromFields ?? [])],
				tuples,
			);
			added += addRows(selection, childModel, rows, modelRowCap);
		}

		for (const [modelName, bucket] of [...selection.entries()]) {
			const model = models.get(modelName);
			if (!model) continue;
			const rows = [...bucket.values()];
			for (const relation of model.fields.filter(
				(field) => field.kind === "object" && field.relationFromFields?.length,
			)) {
				if (relation.type === "SalesOrders") continue;
				if (BLOCKED_PARENT_MODELS.has(relation.type)) continue;
				const parentModel = models.get(relation.type);
				if (!parentModel) continue;
				const tuples = relationValues(rows, relation.relationFromFields ?? []);
				const parents = await fetchRowsByTuples(
					source,
					parentModel,
					[...(relation.relationToFields ?? [])],
					tuples,
				);
				added += addRows(selection, parentModel, parents, modelRowCap);
			}
		}

		if (added === 0) break;
		if (round === 9)
			throw new Error(
				"Preview seed relation closure did not converge within 10 passes",
			);
	}
	return selection;
}

export function normalizeWriteValue(value: unknown): unknown {
	if (typeof value === "bigint") return value.toString();
	if (Prisma.Decimal.isDecimal(value)) return value.toString();
	if (
		Array.isArray(value) ||
		(value &&
			typeof value === "object" &&
			!(value instanceof Date) &&
			!(value instanceof Uint8Array))
	) {
		return JSON.stringify(value);
	}
	return value;
}

async function upsertModelRows(
	target: PrismaClient,
	model: ModelMeta,
	rows: PreviewSeedRow[],
): Promise<number> {
	if (rows.length === 0) return 0;
	const fields = scalarFields(model).filter((field) =>
		rows.some((row) => Object.hasOwn(row, field.name)),
	);
	const columns = fields.map(fieldColumn);
	let written = 0;
	for (let start = 0; start < rows.length; start += WRITE_BATCH_SIZE) {
		const batch = rows.slice(start, start + WRITE_BATCH_SIZE);
		const placeholders = batch
			.map(() => `(${fields.map(() => "?").join(", ")})`)
			.join(", ");
		const updates = columns
			.map(
				(column) =>
					`${quotePreviewIdent(column)} = VALUES(${quotePreviewIdent(column)})`,
			)
			.join(", ");
		const sql = `INSERT INTO ${quotePreviewIdent(modelTable(model))} (${columns.map(quotePreviewIdent).join(", ")}) VALUES ${placeholders} ON DUPLICATE KEY UPDATE ${updates}`;
		const values = batch.flatMap((row) =>
			fields.map((field) => normalizeWriteValue(row[field.name])),
		);
		await target.$executeRawUnsafe(sql, ...values);
		written += batch.length;
	}
	return written;
}

function insertionOrder(
	selection: Selection,
	models: Map<string, ModelMeta>,
): string[] {
	const pending = new Set(selection.keys());
	const ordered: string[] = [];
	while (pending.size) {
		const ready = [...pending].filter((name) => {
			const model = models.get(name);
			if (!model) return true;
			return (
				model.fields
					.filter(
						(field) =>
							field.kind === "object" && field.relationFromFields?.length,
					)
					.map((field) => field.type)
					.filter((parent) => pending.has(parent) && parent !== name).length ===
				0
			);
		});
		const fallback = [...pending].sort()[0];
		if (!fallback) break;
		const next = ready.length ? ready.sort() : [fallback];
		for (const name of next) {
			pending.delete(name);
			ordered.push(name);
		}
	}
	return ordered;
}

async function countRows(
	client: PrismaClient,
	model: ModelMeta,
): Promise<number> {
	const rows = await client.$queryRawUnsafe<Array<{ count: bigint | number }>>(
		`SELECT COUNT(*) AS count FROM ${quotePreviewIdent(modelTable(model))}`,
	);
	return Number(rows[0]?.count ?? 0);
}

export async function seedPreviewSales(
	options: PreviewSalesSeedOptions,
): Promise<PreviewSalesSeedReport> {
	const targetFingerprint = assertSafePreviewSeedConnections(options);
	const source = new PrismaClient({
		datasources: { db: { url: options.sourceUrl } },
	});
	const target = new PrismaClient({
		datasources: { db: { url: options.targetUrl } },
	});
	try {
		const models = new Map(
			Prisma.dmmf.datamodel.models.map((model) => [model.name, model]),
		);
		const salesModel = models.get("SalesOrders");
		if (!salesModel)
			throw new Error("Generated Prisma schema is missing SalesOrders");
		const targetOrdersBefore = await countRows(target, salesModel);
		if (targetOrdersBefore > 0 && !options.allowExisting) {
			throw new Error(
				`Preview target already contains ${targetOrdersBefore} sales orders; pass --allow-existing only for an intentional repeatable upsert`,
			);
		}

		const selection = await collectSelection(source, options.limit);
		const rowsByModel = Object.fromEntries(
			[...selection.entries()].map(([name, rows]) => [name, rows.size]).sort(),
		);
		const writtenByModel: Record<string, number> = {};
		if (!options.dryRun) {
			for (const name of insertionOrder(selection, models)) {
				const model = models.get(name);
				if (!model) continue;
				const rows = [...(selection.get(name)?.values() ?? [])].map((row) =>
					sanitizePreviewRow(name, row),
				);
				writtenByModel[name] = await upsertModelRows(target, model, rows);
			}
		}

		const targetOrdersAfter = options.dryRun
			? targetOrdersBefore
			: await countRows(target, salesModel);
		return {
			dryRun: options.dryRun,
			targetFingerprint,
			selectedOrders: selection.get("SalesOrders")?.size ?? 0,
			targetOrdersBefore,
			targetOrdersAfter,
			selectedUsers: selection.get("Users")?.size ?? 0,
			rowsByModel,
			writtenByModel,
		};
	} finally {
		await Promise.allSettled([source.$disconnect(), target.$disconnect()]);
	}
}

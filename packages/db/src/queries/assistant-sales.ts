import { createHash } from "node:crypto";
import type { Database, Prisma } from "../index";
import { buildOfficeCustomerVisibilityWhere } from "./dealer-program";

export type AssistantBusinessActor = {
	userId: number;
	scopeType: string;
	scopeId: string;
	grants?: Record<string, boolean>;
};

export type AssistantPageInput = {
	query?: string;
	cursor?: number | null;
	limit: number;
	includeArchived?: boolean;
};

function organizationId(actor: AssistantBusinessActor) {
	if (actor.scopeType !== "organization") return null;
	const value = Number(actor.scopeId);
	return Number.isSafeInteger(value) && value > 0 ? value : null;
}

export function assistantSalesScopeWhere(
	actor: AssistantBusinessActor,
): Prisma.SalesOrdersWhereInput {
	const orgId = organizationId(actor);
	if (orgId) return { orgId };
	if (
		actor.scopeType === "user" &&
		Number(actor.scopeId) === actor.userId &&
		Number.isSafeInteger(actor.userId) &&
		actor.userId > 0
	)
		return { salesRepId: actor.userId };
	throw new Error("Assistant Sales actor scope is not supported");
}

export function assistantCustomerScopeWhere(
	actor: AssistantBusinessActor,
): Prisma.CustomersWhereInput {
	return {
		AND: [
			buildOfficeCustomerVisibilityWhere(),
			{
				salesOrders: {
					some: { ...assistantSalesScopeWhere(actor), deletedAt: null },
				},
			},
		],
	};
}

function revision(values: unknown[]) {
	return createHash("sha256")
		.update(JSON.stringify(values))
		.digest("hex")
		.slice(0, 24);
}

const salesOrderListSelect = {
	id: true,
	orderId: true,
	type: true,
	title: true,
	status: true,
	prodStatus: true,
	inventoryStatus: true,
	invoiceStatus: true,
	deliveryOption: true,
	priority: true,
	grandTotal: true,
	amountDue: true,
	prodQty: true,
	builtQty: true,
	createdAt: true,
	updatedAt: true,
	archivedAt: true,
	customer: {
		select: { id: true, name: true, businessName: true },
	},
	salesRep: { select: { name: true } },
} satisfies Prisma.SalesOrdersSelect;

type AssistantSalesOrderListRow = Prisma.SalesOrdersGetPayload<{
	select: typeof salesOrderListSelect;
}>;

function mapOrder(row: AssistantSalesOrderListRow) {
	return {
		id: row.id as number,
		orderNo: row.orderId as string,
		type: (row.type || "order") as string,
		title: (row.title || null) as string | null,
		customerId: (row.customer?.id || null) as number | null,
		customerName: (row.customer?.businessName || row.customer?.name || null) as
			| string
			| null,
		salesRepName: (row.salesRep?.name || null) as string | null,
		status: (row.status || null) as string | null,
		productionStatus: (row.prodStatus || null) as string | null,
		inventoryStatus: (row.inventoryStatus || null) as string | null,
		invoiceStatus: (row.invoiceStatus || null) as string | null,
		deliveryOption: (row.deliveryOption || null) as string | null,
		priority: (row.priority || null) as string | null,
		grandTotal: row.grandTotal == null ? null : String(row.grandTotal),
		amountDue: row.amountDue == null ? null : String(row.amountDue),
		orderedQuantity: row.prodQty == null ? null : String(row.prodQty),
		builtQuantity: row.builtQty == null ? null : String(row.builtQty),
		createdAt: row.createdAt?.toISOString?.() || null,
		updatedAt: row.updatedAt?.toISOString?.() || null,
		archived: Boolean(row.archivedAt),
		revision: revision([
			row.id,
			row.updatedAt,
			row.status,
			row.prodStatus,
			row.inventoryStatus,
			row.invoiceStatus,
			row.amountDue,
		]),
	};
}

export async function findAssistantSalesOrders(
	db: Database,
	actor: AssistantBusinessActor,
	input: AssistantPageInput & {
		type?: "order" | "quote";
		customerId?: number;
	},
) {
	const query = input.query?.trim();
	const rows = await db.salesOrders.findMany({
		where: {
			AND: [
				assistantSalesScopeWhere(actor),
				{ deletedAt: null },
				...(input.includeArchived ? [] : [{ archivedAt: null }]),
				...(input.type ? [{ type: input.type }] : []),
				...(input.customerId ? [{ customerId: input.customerId }] : []),
				...(query
					? [
							{
								OR: [
									{ orderId: { contains: query } },
									{ title: { contains: query } },
									{ customer: { name: { contains: query } } },
									{ customer: { businessName: { contains: query } } },
								],
							},
						]
					: []),
			],
		},
		...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 as const } : {}),
		orderBy: { id: "desc" },
		take: input.limit + 1,
		select: salesOrderListSelect,
	});
	const page = rows.slice(0, input.limit);
	return {
		items: page.map(mapOrder),
		nextCursor: rows.length > input.limit ? (page.at(-1)?.id ?? null) : null,
	};
}

export async function canAssistantAccessSalesOrderId(
	db: Database,
	actor: AssistantBusinessActor,
	salesOrderId: number,
) {
	if (!Number.isSafeInteger(salesOrderId) || salesOrderId <= 0) return false;
	const row = await db.salesOrders.findFirst({
		where: {
			AND: [
				assistantSalesScopeWhere(actor),
				{ id: salesOrderId, deletedAt: null },
			],
		},
		select: { id: true },
	});
	return Boolean(row);
}

export async function getAssistantSalesOrderCandidates(
	db: Database,
	actor: AssistantBusinessActor,
	input: { orderNo: string; type?: "order" | "quote" },
) {
	const rows = await db.salesOrders.findMany({
		where: {
			AND: [
				assistantSalesScopeWhere(actor),
				{ deletedAt: null, orderId: input.orderNo },
				...(input.type ? [{ type: input.type }] : []),
			],
		},
		orderBy: { id: "desc" },
		take: 3,
		select: {
			...salesOrderListSelect,
			deliveries: {
				where: { deletedAt: null },
				orderBy: { id: "desc" },
				take: 3,
				select: {
					id: true,
					status: true,
					deliveryMode: true,
					dueDate: true,
					deliveredAt: true,
					updatedAt: true,
				},
			},
			payments: {
				where: { deletedAt: null },
				orderBy: [{ createdAt: "desc" }, { id: "desc" }],
				take: 5,
				select: {
					id: true,
					amount: true,
					status: true,
					reviewStatus: true,
					updatedAt: true,
				},
			},
			stat: {
				where: { deletedAt: null },
				orderBy: { type: "asc" },
				select: {
					type: true,
					status: true,
					total: true,
					percentage: true,
					createdAt: true,
				},
			},
		},
	});
	return rows.map((row) => {
		const base = mapOrder(row);
		const deliveries = row.deliveries.map((delivery) => ({
			id: delivery.id,
			status: delivery.status,
			mode: delivery.deliveryMode,
			dueAt: delivery.dueDate?.toISOString?.() || null,
			deliveredAt: delivery.deliveredAt?.toISOString?.() || null,
			updatedAt: delivery.updatedAt.toISOString(),
		}));
		const payments = row.payments.map((payment) => ({
			amount: String(payment.amount),
			status: payment.status,
			reviewStatus: payment.reviewStatus,
		}));
		const statistics = row.stat.map((stat) => ({
			type: stat.type,
			status: stat.status,
			total: stat.total == null ? null : String(stat.total),
			percentage: stat.percentage == null ? null : String(stat.percentage),
		}));
		return {
			...base,
			deliveries,
			payments,
			statistics,
			revision: revision([
				base.revision,
				row.deliveries.map((item) => [item.id, item.updatedAt]),
				row.payments.map((item) => [
					item.id,
					item.updatedAt,
					item.amount,
					item.status,
					item.reviewStatus,
				]),
				row.stat.map((item) => [
					item.type,
					item.createdAt,
					item.status,
					item.total,
					item.percentage,
				]),
			]),
		};
	});
}

export async function getAssistantSalesTimeline(
	db: Database,
	actor: AssistantBusinessActor,
	input: {
		orderNo: string;
		type?: "order" | "quote";
		limit: number;
		cursor?: string;
	},
) {
	const candidates = await getAssistantSalesOrderCandidates(db, actor, input);
	if (candidates.length !== 1)
		return { candidates, events: [], nextCursor: null };
	const candidate = candidates[0];
	if (!candidate) return { candidates, events: [], nextCursor: null };
	const cursor = input.cursor ? decodeTimelineCursor(input.cursor) : null;
	const rows = await db.salesHistory.findMany({
		where: {
			AND: [
				{ salesId: candidate.id, deletedAt: null },
				...(cursor
					? [
							{
								OR: cursor.createdAt
									? [
											{ createdAt: { lt: cursor.createdAt } },
											{ createdAt: null },
											{
												createdAt: cursor.createdAt,
												id: { lt: cursor.id },
											},
										]
									: [{ createdAt: null, id: { lt: cursor.id } }],
							},
						]
					: []),
			],
		},
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		take: input.limit + 1,
		select: {
			id: true,
			name: true,
			authorName: true,
			createdAt: true,
			updatedAt: true,
		},
	});
	const page = rows.slice(0, input.limit);
	const lastEvent = page.at(-1);
	const historyWatermark = await db.salesHistory.findFirst({
		where: { salesId: candidate.id },
		orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
		select: { id: true, updatedAt: true, deletedAt: true },
	});
	const timelineCandidate = {
		...candidate,
		revision: revision([
			candidate.revision,
			historyWatermark?.id,
			historyWatermark?.updatedAt,
			historyWatermark?.deletedAt,
		]),
	};
	return {
		candidates: [timelineCandidate],
		events: page.map((event) => ({
			id: event.id,
			name: event.name || "Order updated",
			authorName: event.authorName || null,
			createdAt: event.createdAt?.toISOString?.() || null,
			revision: revision([event.id, event.updatedAt]),
		})),
		nextCursor:
			rows.length > input.limit && lastEvent
				? encodeTimelineCursor(lastEvent)
				: null,
	};
}

function encodeTimelineCursor(event: { id: string; createdAt: Date | null }) {
	return Buffer.from(
		JSON.stringify({
			id: event.id,
			createdAt: event.createdAt?.toISOString() ?? null,
		}),
	).toString("base64url");
}

function decodeTimelineCursor(value: string) {
	try {
		const parsed = JSON.parse(
			Buffer.from(value, "base64url").toString("utf8"),
		) as {
			id?: unknown;
			createdAt?: unknown;
		};
		if (typeof parsed.id !== "string" || !parsed.id) throw new Error();
		const createdAt =
			typeof parsed.createdAt === "string" ? new Date(parsed.createdAt) : null;
		if (createdAt && Number.isNaN(createdAt.getTime())) throw new Error();
		return { id: parsed.id, createdAt };
	} catch {
		throw new Error("Assistant timeline cursor is invalid");
	}
}

const customerSelect = {
	id: true,
	name: true,
	businessName: true,
	createdAt: true,
	updatedAt: true,
	profile: { select: { title: true } },
} satisfies Prisma.CustomersSelect;

type AssistantCustomerRow = Prisma.CustomersGetPayload<{
	select: typeof customerSelect;
}>;

function mapCustomer(row: AssistantCustomerRow) {
	return {
		id: row.id as number,
		accountNo: `cust-${row.id}`,
		name: (row.businessName || row.name || `Customer ${row.id}`) as string,
		profile: (row.profile?.title || null) as string | null,
		createdAt: row.createdAt?.toISOString?.() || null,
		updatedAt: row.updatedAt?.toISOString?.() || null,
		revision: revision([row.id, row.updatedAt, row.name, row.businessName]),
	};
}

export async function findAssistantCustomers(
	db: Database,
	actor: AssistantBusinessActor,
	input: AssistantPageInput,
) {
	const query = input.query?.trim();
	const rows = await db.customers.findMany({
		where: {
			AND: [
				assistantCustomerScopeWhere(actor),
				{ deletedAt: null },
				...(query
					? [
							{
								OR: [
									{ name: { contains: query } },
									{ businessName: { contains: query } },
									{ slug: { contains: query } },
								],
							},
						]
					: []),
			],
		},
		...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 as const } : {}),
		orderBy: { id: "desc" },
		take: input.limit + 1,
		select: customerSelect,
	});
	const page = rows.slice(0, input.limit);
	return {
		items: page.map(mapCustomer),
		nextCursor: rows.length > input.limit ? (page.at(-1)?.id ?? null) : null,
	};
}

export async function getAssistantCustomerSummary(
	db: Database,
	actor: AssistantBusinessActor,
	customerId: number,
) {
	const customer = await db.customers.findFirst({
		where: {
			AND: [
				assistantCustomerScopeWhere(actor),
				{ id: customerId, deletedAt: null },
			],
		},
		select: {
			...customerSelect,
			_count: {
				select: {
					salesOrders: {
						where: {
							...assistantSalesScopeWhere(actor),
							deletedAt: null,
							archivedAt: null,
						},
					},
				},
			},
			salesOrders: {
				where: {
					...assistantSalesScopeWhere(actor),
					deletedAt: null,
					archivedAt: null,
				},
				orderBy: { id: "desc" },
				take: 1,
				select: salesOrderListSelect,
			},
		},
	});
	return customer
		? {
				...mapCustomer(customer),
				orderCount: customer._count.salesOrders,
				latestOrder: customer.salesOrders[0]
					? mapOrder(customer.salesOrders[0])
					: null,
			}
		: null;
}

export async function getAssistantCustomerOrderHistory(
	db: Database,
	actor: AssistantBusinessActor,
	input: AssistantPageInput & { customerId: number },
) {
	const customer = await getAssistantCustomerSummary(
		db,
		actor,
		input.customerId,
	);
	if (!customer) return null;
	const page = await findAssistantSalesOrders(db, actor, {
		...input,
		query: undefined,
		customerId: input.customerId,
	});
	return {
		customer,
		...page,
		items: page.items,
	};
}

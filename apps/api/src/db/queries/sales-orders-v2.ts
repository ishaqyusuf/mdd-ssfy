import { salesOrderDto } from "@api/dto/sales-dto";
import { whereSales } from "@api/prisma-where";
import type { SalesQueryParamsSchema } from "@api/schemas/sales";
import type { TRPCContext } from "@api/trpc/init";
import { transformSalesFilterQuery } from "@api/utils/sales";
import { SalesListInclude } from "@api/utils/sales";
import type { Prisma } from "@gnd/db";
import {
	compareSalesOrderListRows,
	hydrateSalesOrderListRow,
	isControlReadV2Enabled,
	isSalesOrderListProjectionFresh,
	withSalesControl,
	withSalesListControl,
} from "@gnd/sales";
import {
	type SalesOrderLifecycleStatus,
	getSalesOrderLifecycleStatusInfo,
} from "@gnd/sales/order-status";
import {
	isReviewableSalesPaymentStatus,
	repairSalesInvoiceCccDisplay,
} from "@gnd/sales/payment-system";
import { resolveSalesInventoryApplicability } from "@gnd/sales/sales-inventory-applicability";
import { resolveSalesInventoryLegacyCompatibility } from "@gnd/sales/sales-inventory-legacy-compatibility";
import { resolveSalesInventoryTrackingPolicy } from "@gnd/sales/sales-inventory-tracking-policy";
import {
	INVOICE_FILTER_OPTIONS,
	PRODUCTION_ASSIGNMENT_FILTER_OPTIONS,
	PRODUCTION_FILTER_OPTIONS,
	PRODUCTION_STATUS,
	SALES_DISPATCH_FILTER_OPTIONS,
} from "@gnd/utils/constants";
import { composeQueryData } from "@gnd/utils/query-response";
import { paginationSchema } from "@gnd/utils/schema";
import {
	SALES_CHANNEL_FILTER_OPTIONS,
	SALES_HAS_FILTER_OPTIONS,
	SALES_INBOUND_FILTER_OPTIONS,
	SALES_SPECIAL_ORDER_FILTER_OPTIONS,
	SALES_SPECIAL_ORDER_SHOW_OPTIONS,
} from "@sales/filter-constants";
import {
	getSalesPriorityLabel,
	normalizeSalesPriority,
	salesPrioritySchema,
} from "@sales/priority";
import { idempotencyKeys, tasks } from "@trigger.dev/sdk/v3";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { salesNotesCount } from "./sales";
import { getOpenSalesHandoffEpochWhere } from "./sales-handoff-actions";
import {
	emptySalesInventoryInboundOwnership,
	getSalesInventoryInboundOwnershipMap,
} from "./sales-inventory-inbound-ownership";

const ordersV2InvoiceStatus = ["paid", "outstanding"] as const;
const PAYMENT_REVIEW_SORT_FIELD = "latestPaymentAt";
const paymentReviewFilterOptions = ["needs_review"] as const;
const needsActionFilterOptions = ["open"] as const;

const ordersV2FilterShape = {
	q: z.string().optional().nullable(),
	dateRange: z.array(z.string()).optional().nullable(),
	salesIds: z.array(z.number()).optional().nullable(),
	"address.id": z.number().optional().nullable(),
	customerName: z.string().optional().nullable(),
	"customer.name": z.string().optional().nullable(),
	phone: z.string().optional().nullable(),
	po: z.string().optional().nullable(),
	item: z.string().optional().nullable(),
	orderNo: z.string().optional().nullable(),
	salesNo: z.string().optional().nullable(),
	sort: z.array(z.string()).optional().nullable(),
	paymentReview: z.enum(paymentReviewFilterOptions).optional().nullable(),
	needsAction: z.enum(needsActionFilterOptions).optional().nullable(),
	invoiceStatus: z.enum(ordersV2InvoiceStatus).optional().nullable(),
	invoice: z.enum(INVOICE_FILTER_OPTIONS).optional().nullable(),
	production: z.enum(PRODUCTION_FILTER_OPTIONS).optional().nullable(),
	"production.status": z.enum(PRODUCTION_STATUS).optional().nullable(),
	"production.assignment": z
		.enum(PRODUCTION_ASSIGNMENT_FILTER_OPTIONS)
		.optional()
		.nullable(),
	"dispatch.status": z
		.enum(SALES_DISPATCH_FILTER_OPTIONS)
		.optional()
		.nullable(),
	priority: salesPrioritySchema.optional().nullable(),
	"sales.priority": salesPrioritySchema.optional().nullable(),
	"sales.rep": z.string().optional().nullable(),
	has: z.enum(SALES_HAS_FILTER_OPTIONS).optional().nullable(),
	salesChannel: z.enum(SALES_CHANNEL_FILTER_OPTIONS).optional().nullable(),
	inbound: z.enum(SALES_INBOUND_FILTER_OPTIONS).optional().nullable(),
	specialOrderScope: z
		.enum(SALES_SPECIAL_ORDER_SHOW_OPTIONS)
		.optional()
		.nullable(),
	specialOrder: z
		.enum(SALES_SPECIAL_ORDER_FILTER_OPTIONS)
		.optional()
		.nullable(),
	showing: z.enum(["all sales"]).optional().nullable(),
};

export const getOrdersSchema = z
	.object(ordersV2FilterShape)
	.extend(paginationSchema.shape);

export type GetOrdersSchema = z.infer<typeof getOrdersSchema>;

export const getOrdersSummarySchema = z.object({
	...ordersV2FilterShape,
	bin: paginationSchema.shape.bin,
});

export type GetOrdersSummarySchema = z.infer<typeof getOrdersSummarySchema>;

type LegacyOrdersQuery = Partial<SalesQueryParamsSchema> &
	Record<string, unknown> & {
		defaultSearch?: boolean;
		showing?: string;
		q?: string | null;
		salesRepId?: number;
	};

function toLegacyOrdersQuery(
	query: GetOrdersSummarySchema,
	userId?: number | null,
) {
	const legacyQuery: LegacyOrdersQuery = {
		salesType: "order",
		q: query.q,
		dateRange: query.dateRange,
		salesIds: query.salesIds,
		"address.id": query["address.id"],
		"customer.name": query["customer.name"] ?? query.customerName,
		phone: query.phone,
		po: query.po,
		item: query.item,
		salesNo: query.salesNo ?? query.orderNo,
		invoice:
			query.invoice ??
			(query.invoiceStatus === "outstanding"
				? "pending"
				: (query.invoiceStatus ?? undefined)),
		paymentReview: query.paymentReview,
		production: query.production,
		"production.status": query["production.status"],
		"production.assignment": query["production.assignment"],
		"dispatch.status": query["dispatch.status"],
		"sales.priority": query["sales.priority"] ?? query.priority,
		"sales.rep": query["sales.rep"],
		has: query.has,
		salesChannel: query.salesChannel,
		inbound: query.inbound,
		specialOrderScope: query.specialOrderScope,
		specialOrder: query.specialOrder,
		bin: query.bin,
		showing: query.showing ?? undefined,
	};

	transformSalesFilterQuery(legacyQuery as SalesQueryParamsSchema);
	if (query.needsAction === "open") {
		legacyQuery.defaultSearch = false;
	}

	if (
		query.needsAction !== "open" &&
		legacyQuery.defaultSearch &&
		legacyQuery.showing !== "all sales"
	) {
		legacyQuery.salesRepId = userId ?? undefined;
	}

	if (
		query.needsAction !== "open" &&
		legacyQuery.showing !== "all sales" &&
		!legacyQuery.q?.trim()
	) {
		legacyQuery.salesRepId = userId ?? undefined;
	}

	return legacyQuery as SalesQueryParamsSchema;
}

function applyOrdersSoftDeleteScope(
	query: { bin?: boolean | null },
	where: Prisma.SalesOrdersWhereInput,
): Prisma.SalesOrdersWhereInput {
	if (query.bin) {
		return {
			...where,
			deletedAt: {
				lte: new Date(),
			},
		};
	}

	if (Object.hasOwn(where, "deletedAt")) {
		return where;
	}

	return {
		deletedAt: null,
		...where,
	};
}

function toInvoiceStatus(amountDue: number | null | undefined) {
	return (amountDue ?? 0) <= 0 ? "paid" : "outstanding";
}

function toProductionLabel(
	status?: string | null,
	scoreStatus?: string | null,
) {
	if (scoreStatus && scoreStatus !== "N/A") return scoreStatus;
	if (!status || status === "N/A") return "Pending";
	return status
		.split(" ")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

function toFulfillmentLabel(status?: string | null) {
	if (!status) return "Pending";
	return status
		.split(" ")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

type LifecycleQtySnapshot = {
	total?: number | string | null;
	qty?: number | string | null;
};

type ControlAwareOrderRow = ReturnType<typeof normalizeOrderRow> & {
	inventoryInboundOwnership?: ReturnType<
		typeof emptySalesInventoryInboundOwnership
	>;
	control?: {
		productionStatus?: string | null;
		dispatchStatus?: string | null;
		packed?: LifecycleQtySnapshot | null;
		pendingPacking?: LifecycleQtySnapshot | null;
		pendingDispatch?: LifecycleQtySnapshot | null;
		packables?: LifecycleQtySnapshot | null;
	};
	statistic?: {
		packed?: LifecycleQtySnapshot | null;
		pendingPacking?: LifecycleQtySnapshot | null;
		pendingDispatch?: LifecycleQtySnapshot | null;
		packables?: LifecycleQtySnapshot | null;
	};
};

function latestNeedsReviewPayment(row: Parameters<typeof salesOrderDto>[0]) {
	const payments = Array.isArray(row.payments) ? row.payments : [];
	return payments
		.filter(
			(payment) =>
				!payment.deletedAt &&
				payment.reviewStatus === "needs_review" &&
				isReviewableSalesPaymentStatus(payment.status),
		)
		.sort((left, right) => {
			const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
			const rightTime = right.createdAt
				? new Date(right.createdAt).getTime()
				: 0;
			return (
				rightTime - leftTime || Number(right.id || 0) - Number(left.id || 0)
			);
		})[0];
}

export function normalizeOrderRow(
	row: Parameters<typeof salesOrderDto>[0],
	noteCount = 0,
) {
	const dto = salesOrderDto(row, false);
	const baseInvoiceTotal = dto.invoice.total || 0;
	const amountPaid = dto.invoice.paid || 0;
	const amountDue = dto.invoice.pending || 0;
	const repairedInvoiceTotal = repairSalesInvoiceCccDisplay({
		baseTotal: baseInvoiceTotal,
		meta: row.meta,
	});
	const displayCcc = repairedInvoiceTotal.ccc;
	const productionState = dto.status?.production?.status || "pending";
	const fulfillmentState = dto.deliveryStatus || "pending";
	const lifecycleStatus = getSalesOrderLifecycleStatusInfo({
		orderStatus: row.status,
		legacyProductionStatus: row.prodStatus,
		productionStatus: productionState,
		fulfillmentStatus: fulfillmentState,
	});
	const reviewPayment = latestNeedsReviewPayment(row);

	return {
		id: dto.id,
		uuid: dto.uuid,
		slug: dto.slug,
		orderId: dto.orderId,
		createdAt: dto.createdAt,
		salesDate: dto.salesDate,
		displayName: dto.displayName || "Unknown customer",
		customerName: dto.displayName || "Unknown customer",
		customerPhone: dto.customerPhone || "-",
		customerId: dto.customerId,
		email: dto.email,
		accountNo: dto.accountNo,
		type: dto.type,
		address: dto.address || "No address",
		salesRepName: dto.salesRep || "Unassigned",
		salesRepInitial: dto.salesRepInitial || "",
		poNo: dto.poNo || "-",
		inboundStatus: dto.inboundStatus || null,
		isDealerSale: dto.isDealerSale,
		noteCount,
		deliveryOption: dto.deliveryOption || "pickup",
		priority: normalizeSalesPriority(row.priority),
		priorityLabel: getSalesPriorityLabel(row.priority),
		specialOrder: dto.specialOrder,
		baseInvoiceTotal: repairedInvoiceTotal.baseTotal,
		displayCcc,
		invoiceTotal: repairedInvoiceTotal.totalWithCcc,
		amountPaid,
		amountDue,
		displayAmountPaid: dto.invoice.displayPaid ?? amountPaid,
		displayAmountDue: dto.invoice.displayPending ?? amountDue,
		latestPaymentReview: reviewPayment
			? {
					paymentId: Number(reviewPayment.id),
					amount: Number(reviewPayment.amount || 0),
					origin: reviewPayment.origin || "office",
					receivedAt: reviewPayment.createdAt,
					reviewStatus: reviewPayment.reviewStatus || "needs_review",
				}
			: null,
		due: dto.due,
		paymentDueDate: dto.dueDate,
		invoiceStatus: toInvoiceStatus(dto.invoice.pending),
		orderStatus: row.status || null,
		prodStatus: row.prodStatus || null,
		productionState,
		productionLabel: toProductionLabel(
			productionState,
			dto.status?.production?.scoreStatus,
		),
		fulfillmentState,
		fulfillmentLabel: toFulfillmentLabel(fulfillmentState),
		status: lifecycleStatus.status,
		statusLabel: lifecycleStatus.label,
		statusTone: lifecycleStatus.tone,
	};
}

export function resolveSpecialOrderLinkState(
	request?: {
		status: "ACTIVE" | "CONSUMED" | "REVOKED" | "EXPIRED";
		expiresAt: Date;
	} | null,
	now = Date.now(),
) {
	if (!request) return null;
	if (request.status === "EXPIRED" || request.expiresAt.getTime() <= now) {
		return "EXPIRED" as const;
	}
	return request.status === "ACTIVE" ? ("ACTIVE" as const) : null;
}

function applyControlAwareLifecycle(row: ControlAwareOrderRow) {
	const control = row.control;
	const statistic = row.statistic;
	const productionStatus =
		control?.productionStatus && control.productionStatus !== "unknown"
			? control.productionStatus
			: row.productionState;
	const fulfillmentStatus =
		control?.dispatchStatus && control.dispatchStatus !== "unknown"
			? control.dispatchStatus
			: row.fulfillmentState;
	const lifecycleStatus = getSalesOrderLifecycleStatusInfo({
		orderStatus: row.orderStatus,
		legacyProductionStatus: row.prodStatus,
		productionStatus,
		fulfillmentStatus,
		hasProductionWork: productionStatus === "N/A" ? false : undefined,
		packed: control?.packed || statistic?.packed,
		pendingPacking: control?.pendingPacking || statistic?.pendingPacking,
		pendingDispatch: control?.pendingDispatch || statistic?.pendingDispatch,
		packables: control?.packables || statistic?.packables,
	});

	return {
		...row,
		productionState: productionStatus,
		productionLabel: toProductionLabel(productionStatus),
		fulfillmentState: fulfillmentStatus,
		fulfillmentLabel: toFulfillmentLabel(fulfillmentStatus),
		status: lifecycleStatus.status,
		statusLabel: lifecycleStatus.label,
		statusTone: lifecycleStatus.tone,
	};
}

function ordersV2Sort(
	sort: string,
	sortOrder: string,
): Prisma.SalesOrdersOrderByWithRelationInput {
	const direction = sortOrder === "asc" ? "asc" : "desc";

	switch (sort) {
		case "orderId":
			return { orderId: direction };
		case "status":
			return { status: direction };
		case "createdAt":
		case "salesDate":
			return { createdAt: direction };
		case "grandTotal":
		case "invoiceTotal":
			return { grandTotal: direction };
		case "amountDue":
			return { amountDue: direction };
		case "prodStatus":
		case "productionLabel":
			return { prodStatus: direction };
		case "deliveredAt":
		case "fulfillmentLabel":
			return { deliveredAt: direction };
		case "salesRepName":
			return { salesRep: { name: direction } };
		case "customerName":
			return { customer: { businessName: direction } };
		default:
			return { createdAt: "desc" };
	}
}

function parsePrimarySort(query: GetOrdersSchema) {
	const [sort = "createdAt", sortOrder = "desc"] = (
		query.sort?.[0] || "createdAt.desc"
	).split(".");
	return {
		sort,
		sortOrder: sortOrder === "asc" ? "asc" : "desc",
	};
}

type SalesOrderListKeysetCursor = {
	version: 1;
	offset: number;
	createdAt: string;
	id: number;
};

const SALES_ORDER_LIST_KEYSET_PREFIX = "orders-k1.";

export function encodeSalesOrderListKeysetCursor(
	cursor: SalesOrderListKeysetCursor,
) {
	return `${SALES_ORDER_LIST_KEYSET_PREFIX}${Buffer.from(
		JSON.stringify(cursor),
	).toString("base64url")}`;
}

export function decodeSalesOrderListKeysetCursor(
	value?: string | null,
): SalesOrderListKeysetCursor | null {
	if (!value?.startsWith(SALES_ORDER_LIST_KEYSET_PREFIX)) return null;
	try {
		const decoded = JSON.parse(
			Buffer.from(
				value.slice(SALES_ORDER_LIST_KEYSET_PREFIX.length),
				"base64url",
			).toString("utf8"),
		) as SalesOrderListKeysetCursor;
		if (
			decoded.version !== 1 ||
			!Number.isInteger(decoded.offset) ||
			decoded.offset < 0 ||
			!Number.isInteger(decoded.id) ||
			decoded.id <= 0 ||
			Number.isNaN(new Date(decoded.createdAt).getTime())
		) {
			return null;
		}
		return decoded;
	} catch {
		return null;
	}
}

function legacyCompatibleOrdersQuery(query: GetOrdersSchema): GetOrdersSchema {
	const cursor = decodeSalesOrderListKeysetCursor(query.cursor);
	return cursor ? { ...query, cursor: String(cursor.offset) } : query;
}

type SalesOrderListReadModelMode = "off" | "shadow" | "read";

type ProjectionRecord = {
	salesOrderId: number;
	sourceUpdatedAt: Date;
	version: number;
	state: string;
	payload: Record<string, unknown>;
	projectedAt: Date;
};

type ProjectionRepository = {
	findMany(args: {
		where: { salesOrderId: { in: number[] } };
		select: {
			salesOrderId: true;
			sourceUpdatedAt: true;
			version: true;
			state: true;
			payload: true;
			projectedAt: true;
		};
	}): Promise<ProjectionRecord[]>;
};

function salesOrderListReadModelMode(): SalesOrderListReadModelMode {
	const value = String(process.env.GND_SALES_ORDERS_READ_MODEL_MODE ?? "off")
		.trim()
		.toLowerCase();
	if (value === "read" || value === "on") return "read";
	if (value === "shadow") return "shadow";
	return "off";
}

function salesOrderListProjectionMaxAgeMs() {
	const seconds = Number(
		process.env.GND_SALES_ORDERS_READ_MODEL_MAX_AGE_SECONDS ?? 300,
	);
	return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 300_000;
}

function shouldSampleProjectionShadow() {
	const rate = Number(
		process.env.GND_SALES_ORDERS_READ_MODEL_SHADOW_SAMPLE_RATE ?? 0.05,
	);
	if (!Number.isFinite(rate) || rate <= 0) return false;
	if (rate >= 1) return true;
	return Math.random() < rate;
}

function projectionRepository(db: TRPCContext["db"]): ProjectionRepository {
	return (db as unknown as { salesOrderListProjection: ProjectionRepository })
		.salesOrderListProjection;
}

async function getOrdersFromProjection(
	ctx: TRPCContext,
	query: GetOrdersSchema,
) {
	if (query.paymentReview === "needs_review") {
		return { hit: false as const, reason: "unsupported_payment_review" };
	}
	if (query.needsAction === "open") {
		return { hit: false as const, reason: "unsupported_needs_action" };
	}

	try {
		const legacyQuery = toLegacyOrdersQuery(query, ctx.userId);
		const baseWhere = whereSales(legacyQuery) ?? {};
		const { sort, sortOrder } = parsePrimarySort(query);
		const keysetCursor = decodeSalesOrderListKeysetCursor(query.cursor);
		const useKeyset =
			(sort === "createdAt" || sort === "salesDate") &&
			(query.sort?.length ?? 0) <= 1 &&
			(!query.cursor || Boolean(keysetCursor));
		let sourceRows: Array<{
			id: number;
			createdAt: Date | null;
			updatedAt: Date | null;
		}>;
		let response: (data: Array<Record<string, unknown>>) => {
			meta: { count?: number; size?: number; cursor?: string | null };
			data: Array<Record<string, unknown>>;
			filter?: unknown;
			query?: unknown;
		};

		if (useKeyset) {
			const direction = sortOrder === "asc" ? "asc" : "desc";
			const size = query.size ? Number(query.size) : 20;
			const scopedWhere = applyOrdersSoftDeleteScope(query, baseWhere);
			const cursorDate = keysetCursor ? new Date(keysetCursor.createdAt) : null;
			const createdAtBoundary = cursorDate
				? direction === "asc"
					? { gt: cursorDate }
					: { lt: cursorDate }
				: null;
			const idBoundary = keysetCursor
				? direction === "asc"
					? { gt: keysetCursor.id }
					: { lt: keysetCursor.id }
				: null;
			const pageWhere: Prisma.SalesOrdersWhereInput = cursorDate
				? {
						AND: [
							scopedWhere,
							{
								OR: [
									{
										createdAt: createdAtBoundary!,
									},
									{
										createdAt: cursorDate,
										id: idBoundary!,
									},
								],
							},
						],
					}
				: scopedWhere;
			const [count, candidates] = await Promise.all([
				ctx.db.salesOrders.count({ where: scopedWhere }),
				ctx.db.salesOrders.findMany({
					where: pageWhere,
					orderBy: [{ createdAt: direction }, { id: direction }],
					take: size + 1,
					select: { id: true, createdAt: true, updatedAt: true },
				}),
			]);
			const hasMore = candidates.length > size;
			sourceRows = candidates.slice(0, size);
			const last = sourceRows.at(-1);
			const nextOffset = (keysetCursor?.offset ?? 0) + sourceRows.length;
			const nextCursor =
				hasMore && last?.createdAt
					? encodeSalesOrderListKeysetCursor({
							version: 1,
							offset: nextOffset,
							createdAt: last.createdAt.toISOString(),
							id: last.id,
						})
					: null;
			response = (data) => ({
				meta: { count, size, cursor: nextCursor },
				data,
				filter: process.env.NODE_ENV === "production" ? undefined : scopedWhere,
				query: process.env.NODE_ENV === "production" ? undefined : query,
			});
		} else {
			const composed = await composeQueryData(
				legacyCompatibleOrdersQuery(query),
				baseWhere,
				ctx.db.salesOrders,
				{ sortFn: ordersV2Sort },
			);
			sourceRows = await ctx.db.salesOrders.findMany({
				where: composed.where,
				...composed.searchMeta,
				select: { id: true, createdAt: true, updatedAt: true },
			});
			response = composed.response;
		}
		if (!sourceRows.length) {
			return {
				hit: true as const,
				response: response([]),
			};
		}

		const projections = await projectionRepository(ctx.db).findMany({
			where: {
				salesOrderId: {
					in: sourceRows.map((row) => row.id),
				},
			},
			select: {
				salesOrderId: true,
				sourceUpdatedAt: true,
				version: true,
				state: true,
				payload: true,
				projectedAt: true,
			},
		});
		const projectionsById = new Map(
			projections.map((projection) => [projection.salesOrderId, projection]),
		);
		const orderedProjections = sourceRows.map((source) => {
			const projection = projectionsById.get(source.id);
			if (!projection) return null;
			const sourceUpdatedAt =
				source.updatedAt ?? source.createdAt ?? new Date(0);
			if (
				!isSalesOrderListProjectionFresh({
					state: projection.state,
					version: projection.version,
					sourceUpdatedAt,
					projectionSourceUpdatedAt: projection.sourceUpdatedAt,
					projectedAt: projection.projectedAt,
					maxAgeMs: salesOrderListProjectionMaxAgeMs(),
				})
			) {
				return null;
			}
			return projection;
		});

		if (orderedProjections.some((projection) => !projection)) {
			return { hit: false as const, reason: "missing_or_stale" };
		}

		const data = orderedProjections.map((projection) =>
			hydrateSalesOrderListRow<Record<string, unknown>>(projection!.payload),
		);
		return {
			hit: true as const,
			response: response(data),
		};
	} catch (error) {
		console.error("Sales order list projection read failed", {
			error: error instanceof Error ? error.message : String(error),
		});
		return { hit: false as const, reason: "read_error" };
	}
}

async function queueSalesOrderListProjectionWarm(
	ctx: TRPCContext,
	rows: Array<Record<string, unknown>>,
) {
	const ids = rows
		.map((row) => Number(row.id))
		.filter((id) => Number.isInteger(id) && id > 0);
	if (!ids.length) return;

	const sourceRows = await ctx.db.salesOrders.findMany({
		where: { id: { in: ids } },
		select: {
			id: true,
			createdAt: true,
			updatedAt: true,
		},
	});
	const taskOrders = sourceRows
		.map((source) => ({
			salesOrderId: source.id,
			sourceUpdatedAt: (
				source.updatedAt ??
				source.createdAt ??
				new Date(0)
			).toISOString(),
		}))
		.sort((left, right) => left.salesOrderId - right.salesOrderId);
	if (!taskOrders.length) return;
	const idempotencyKey = await idempotencyKeys.create(
		[
			"sales-order-list-projection",
			...taskOrders.map(
				(order) => `${order.salesOrderId}:${order.sourceUpdatedAt}`,
			),
		],
		{ scope: "global" },
	);

	await tasks.trigger(
		"persist-sales-order-list-projections",
		{ orders: taskOrders },
		{
			idempotencyKey,
			idempotencyKeyTTL: "5m",
		},
	);
}

function deferSalesOrderListProjectionWarm(
	ctx: TRPCContext,
	rows: Array<Record<string, unknown>>,
) {
	waitUntil(
		queueSalesOrderListProjectionWarm(ctx, rows).catch((error) => {
			console.error("Unable to queue sales order list projection warm", {
				error: error instanceof Error ? error.message : String(error),
			});
		}),
	);
}

async function getOrdersLegacy(ctx: TRPCContext, query: GetOrdersSchema) {
	query = legacyCompatibleOrdersQuery(query);
	const { db } = ctx;
	const legacyQuery = toLegacyOrdersQuery(query, ctx.userId);
	let baseWhere = whereSales(legacyQuery);
	if (query.needsAction === "open") {
		const epochWhere = ctx.userId
			? (await getOpenSalesHandoffEpochWhere(db, ctx.userId)).where
			: null;
		baseWhere = {
			AND: [
				baseWhere ?? {},
				epochWhere
					? { handoffActionEpochs: { some: epochWhere } }
					: { id: { in: [] } },
			],
		};
	}
	const { sort, sortOrder } = parsePrimarySort(query);

	if (query.paymentReview === "needs_review") {
		const hasExplicitSort = Boolean(query.sort?.[0]);
		const usePaymentReceivedSort =
			!hasExplicitSort || sort === PAYMENT_REVIEW_SORT_FIELD;
		const direction: Prisma.SortOrder =
			sort === PAYMENT_REVIEW_SORT_FIELD && sortOrder === "asc"
				? "asc"
				: "desc";
		const where = baseWhere ?? {};
		if (query.bin) {
			where.deletedAt = {
				lte: new Date(),
			};
		} else {
			where.deletedAt = null;
		}
		const take = query.size ? Number(query.size) : 20;
		const skip = Number(query.cursor || 0);
		const paymentWhere = {
			deletedAt: null,
			reviewStatus: "needs_review",
			status: {
				in: ["success", "completed", "paid"],
			},
			order: where,
		} satisfies Prisma.SalesPaymentsWhereInput;

		if (!usePaymentReceivedSort) {
			const groups = await db.salesPayments.groupBy({
				by: ["orderId"],
				where: paymentWhere,
			});
			const orderIds = groups.map((group) => group.orderId);
			const rows = orderIds.length
				? await db.salesOrders.findMany({
						where: {
							AND: [
								where,
								{
									id: {
										in: orderIds,
									},
								},
							],
						},
						orderBy: ordersV2Sort(sort, sortOrder),
						skip,
						take,
						include: SalesListInclude,
					})
				: [];
			const data = await normalizeOrders(ctx, rows);
			const cursor = skip + take;

			return {
				meta: {
					count: groups.length,
					size: take,
					cursor: cursor < groups.length ? String(cursor) : null,
				},
				data,
				filter: process.env.NODE_ENV === "production" ? undefined : where,
				query: process.env.NODE_ENV === "production" ? undefined : query,
			};
		}

		const [groups, totalGroups] = await Promise.all([
			db.salesPayments.groupBy({
				by: ["orderId"],
				where: paymentWhere,
				_max: {
					createdAt: true,
				},
				orderBy: [
					{
						_max: {
							createdAt: direction,
						},
					},
					{
						orderId: direction,
					},
				],
				skip,
				take,
			}),
			db.salesPayments.groupBy({
				by: ["orderId"],
				where: paymentWhere,
			}),
		]);
		const paymentGroups = groups as Array<{ orderId: number }>;
		const orderIds = paymentGroups.map((group) => group.orderId);
		const rows = orderIds.length
			? await db.salesOrders.findMany({
					where: {
						id: {
							in: orderIds,
						},
					},
					include: SalesListInclude,
				})
			: [];
		const rowsById = new Map(rows.map((row) => [row.id, row]));
		const orderedRows = orderIds
			.map((orderId) => rowsById.get(orderId))
			.filter((row): row is NonNullable<typeof row> => Boolean(row));
		const data = await normalizeOrders(ctx, orderedRows);
		const cursor = skip + take;

		return {
			meta: {
				count: totalGroups.length,
				size: take,
				cursor: cursor < totalGroups.length ? String(cursor) : null,
			},
			data,
			filter: process.env.NODE_ENV === "production" ? undefined : where,
			query: process.env.NODE_ENV === "production" ? undefined : query,
		};
	}

	const { response, searchMeta, where } = await composeQueryData(
		query,
		baseWhere,
		db.salesOrders,
		{ sortFn: ordersV2Sort },
	);

	const rows = await db.salesOrders.findMany({
		where,
		...searchMeta,
		include: SalesListInclude,
	});

	const data = await normalizeOrders(ctx, rows);
	return response(data);
}

type GetOrdersResponse = Awaited<ReturnType<typeof getOrdersLegacy>>;

export async function getOrders(
	ctx: TRPCContext,
	query: GetOrdersSchema,
): Promise<GetOrdersResponse> {
	const mode = salesOrderListReadModelMode();

	if (mode === "read") {
		const projection = await getOrdersFromProjection(ctx, query);
		if (projection.hit) return projection.response as GetOrdersResponse;
	}

	const legacy = await getOrdersLegacy(ctx, query);
	const legacyRows = legacy.data as Array<Record<string, unknown>>;
	const sampleShadow = mode === "shadow" && shouldSampleProjectionShadow();

	if (mode === "read" || sampleShadow) {
		deferSalesOrderListProjectionWarm(ctx, legacyRows);
	}

	if (sampleShadow) {
		waitUntil(
			getOrdersFromProjection(ctx, query)
				.then((projection) => {
					if (!projection.hit) {
						console.info("Sales order list projection shadow miss", {
							reason: projection.reason,
						});
						return;
					}

					const comparison = compareSalesOrderListRows(
						legacyRows,
						projection.response.data as Array<Record<string, unknown>>,
					);
					console.info("Sales order list projection shadow comparison", {
						matches: comparison.matches,
						legacyIds: comparison.legacyIds,
						projectionIds: comparison.projectionIds,
						mismatchedIds: comparison.mismatchedIds,
					});
				})
				.catch((error) => {
					console.error("Sales order list projection shadow failed", {
						error: error instanceof Error ? error.message : String(error),
					});
				}),
		);
	}

	return legacy;
}

async function normalizeOrders(
	ctx: TRPCContext,
	rows: Prisma.SalesOrdersGetPayload<{ include: typeof SalesListInclude }>[],
) {
	const { db } = ctx;
	const salesOrderIds = rows.map((row) => row.id);
	const currentSpecialOrderRequestIds = [
		...new Set(
			rows
				.map((row) => row.currentSpecialOrderRequestId)
				.filter((id): id is string => Boolean(id)),
		),
	];
	const [
		noteCounts,
		inboundOwnershipMap,
		inventoryProjectionRows,
		existingInventoryRequirementRows,
		currentSpecialOrderRequests,
	] = await Promise.all([
		salesNotesCount(
			rows.map((sale) => ({
				id: sale.id,
				orderId: sale.orderId,
			})),
			db,
		),
		getSalesInventoryInboundOwnershipMap(db, salesOrderIds),
		db.salesInventoryProjectionState.findMany({
			where: {
				salesOrderId: {
					in: salesOrderIds,
				},
			},
			select: {
				salesOrderId: true,
				status: true,
				needCount: true,
				source: true,
				completedAt: true,
			},
		}),
		db.lineItem.findMany({
			where: {
				saleId: {
					in: salesOrderIds,
				},
				deletedAt: null,
				lineItemType: "SALE",
				components: {
					some: {
						required: true,
						qty: {
							gt: 0,
						},
					},
				},
			},
			select: {
				saleId: true,
				components: {
					where: {
						required: true,
						qty: {
							gt: 0,
						},
					},
					select: {
						inventoryId: true,
						inventoryVariantId: true,
						inventory: {
							select: {
								id: true,
								productKind: true,
								stockMode: true,
							},
						},
						inventoryVariant: {
							select: {
								id: true,
							},
						},
						inventoryCategory: {
							select: {
								productKind: true,
								stockMode: true,
							},
						},
						subComponent: {
							select: {
								defaultInventory: {
									select: {
										id: true,
										productKind: true,
										stockMode: true,
									},
								},
								inventoryCategory: {
									select: {
										productKind: true,
										stockMode: true,
									},
								},
							},
						},
					},
				},
			},
		}),
		db.specialOrderApprovalRequest.findMany({
			where: { id: { in: currentSpecialOrderRequestIds } },
			select: {
				id: true,
				status: true,
				expiresAt: true,
			},
		}),
	]);
	const specialOrderRequestMap = new Map(
		currentSpecialOrderRequests.map(
			(request) => [request.id, request] as const,
		),
	);
	const now = Date.now();
	const inventoryProjectionMap = new Map(
		inventoryProjectionRows.map((projection) => [
			projection.salesOrderId,
			projection,
		]),
	);
	const existingInventoryNeedCountMap = new Map<number, number>();
	for (const row of existingInventoryRequirementRows) {
		if (!row.saleId) continue;

		const trackedRequirementCount = row.components.filter(
			(component) =>
				resolveSalesInventoryTrackingPolicy(component) === "tracked",
		).length;
		existingInventoryNeedCountMap.set(
			row.saleId,
			(existingInventoryNeedCountMap.get(row.saleId) ?? 0) +
				trackedRequirementCount,
		);
	}
	const normalizedRows = rows.map((row) => {
		const normalized = normalizeOrderRow(
			row,
			noteCounts[row.id.toString()]?.noteCount ?? 0,
		);
		const currentRequest = row.currentSpecialOrderRequestId
			? specialOrderRequestMap.get(row.currentSpecialOrderRequestId)
			: null;
		const linkState = resolveSpecialOrderLinkState(currentRequest, now);

		return {
			...normalized,
			specialOrder: {
				...normalized.specialOrder,
				linkState,
				currentRequestExpiresAt: currentRequest?.expiresAt ?? null,
			},
			inventoryInboundOwnership:
				inboundOwnershipMap.get(row.id) ??
				emptySalesInventoryInboundOwnership(),
			inventoryProjection: inventoryProjectionMap.get(row.id) ?? null,
		};
	});
	const rowsWithControl = isControlReadV2Enabled()
		? await withSalesListControl(normalizedRows, db)
		: await withSalesControl(normalizedRows, db);
	const data = rowsWithControl.map((row) => {
		const { inventoryProjection, ...lifecycleInput } =
			row as ControlAwareOrderRow & {
				inventoryProjection: {
					status: string;
					needCount: number;
					source: string | null;
					completedAt: Date | null;
				} | null;
			};
		const lifecycleRow = applyControlAwareLifecycle(lifecycleInput);
		const existingInventoryNeedCount =
			existingInventoryNeedCountMap.get(lifecycleRow.id) ?? 0;

		return {
			...lifecycleRow,
			inventoryApplicability: resolveSalesInventoryApplicability({
				lifecycleStatus: lifecycleRow.status as SalesOrderLifecycleStatus,
				projection: inventoryProjection,
				existingInventoryNeedCount,
			}),
			inventoryLegacyCompatibility: resolveSalesInventoryLegacyCompatibility({
				legacyStatus: lifecycleRow.inboundStatus,
				lifecycleStatus: lifecycleRow.status as SalesOrderLifecycleStatus,
				inventoryRowCount: existingInventoryNeedCount,
				projectionStatus: inventoryProjection?.status,
				projectionNeedCount: inventoryProjection?.needCount,
				projectionSource: inventoryProjection?.source,
				activeLinkedInboundCount:
					lifecycleRow.inventoryInboundOwnership?.linkedInboundCount ?? 0,
			}),
		};
	});
	return data;
}

export async function getOrdersSummary(
	ctx: TRPCContext,
	query: GetOrdersSummarySchema,
) {
	const { db } = ctx;
	let where = applyOrdersSoftDeleteScope(
		query,
		whereSales(toLegacyOrdersQuery(query, ctx.userId)) ?? {},
	);
	if (query.needsAction === "open") {
		const epochWhere = ctx.userId
			? (await getOpenSalesHandoffEpochWhere(db, ctx.userId)).where
			: null;
		where = {
			AND: [
				where,
				epochWhere
					? { handoffActionEpochs: { some: epochWhere } }
					: { id: { in: [] } },
			],
		};
	}

	const [
		totalOrders,
		invoiceValue,
		outstandingBalance,
		paidOrders,
		evaluatingOrders,
	] = await Promise.all([
		db.salesOrders.count({ where }),
		db.salesOrders.aggregate({
			where,
			_sum: {
				grandTotal: true,
			},
		}),
		db.salesOrders.aggregate({
			where,
			_sum: {
				amountDue: true,
			},
		}),
		db.salesOrders.count({
			where: {
				AND: [where, { amountDue: 0 }],
			},
		}),
		db.salesOrders.count({
			where: {
				AND: [where, { status: "Evaluating" }],
			},
		}),
	]);

	return {
		totalOrders,
		invoiceValue: invoiceValue._sum.grandTotal ?? 0,
		outstandingBalance: outstandingBalance._sum.amountDue ?? 0,
		paidOrders,
		evaluatingOrders,
	};
}

export async function getOrdersCount(ctx: TRPCContext, query: GetOrdersSchema) {
	const { db } = ctx;
	const legacyQuery = toLegacyOrdersQuery(query, ctx.userId);
	let baseWhere = applyOrdersSoftDeleteScope(
		query,
		whereSales(legacyQuery) ?? {},
	);
	if (query.needsAction === "open") {
		const epochWhere = ctx.userId
			? (await getOpenSalesHandoffEpochWhere(db, ctx.userId)).where
			: null;
		baseWhere = {
			AND: [
				baseWhere,
				epochWhere
					? { handoffActionEpochs: { some: epochWhere } }
					: { id: { in: [] } },
			],
		};
	}

	if (query.paymentReview === "needs_review") {
		const where = { ...baseWhere };

		if (query.bin) {
			where.deletedAt = {
				lte: new Date(),
			};
		} else {
			where.deletedAt = null;
		}

		const groups = await db.salesPayments.groupBy({
			by: ["orderId"],
			where: {
				deletedAt: null,
				reviewStatus: "needs_review",
				status: {
					in: ["success", "completed", "paid"],
				},
				order: where,
			},
		});

		return groups.length;
	}

	return db.salesOrders.count({ where: baseWhere });
}

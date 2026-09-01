import { whereEmployees } from "@api/prisma-where";
import type {
	DispatchBacklogInput,
	DispatchExceptionListInput,
	ReportDispatchExceptionInput,
	ResolveDispatchExceptionInput,
} from "@api/schemas/dispatch-workspace";
import type { TRPCContext } from "@api/trpc/init";
import type { Prisma } from "@gnd/db";
import {
	buildSalesDispatchBacklogWhere,
	withSalesListControl,
} from "@gnd/sales";
import { getDispatchDueBucket } from "@gnd/sales/dispatch-manifest/driver-work-queue";
import { projectDispatchLifecycle } from "@gnd/sales/dispatch-manifest/status";
import { isDispatchWorkspaceSectionMatch } from "@gnd/sales/dispatch-manifest/workspace";
import { composeQueryData } from "@gnd/utils/query-response";
import { TRPCError } from "@trpc/server";
import {
	dispatchOrderPresentationSelect,
	projectDispatchOrderPresentation,
} from "./dispatch-order-presentation";

const activeDispatchStatuses = [
	"queue",
	"packing queue",
	"missing items",
	"packed",
	"in progress",
];

export async function getDispatchWorkspaceSummary(ctx: TRPCContext) {
	const [
		dispatches,
		backlog,
		driverExceptions,
		packingExceptionDispatches,
		driverCount,
	] = await Promise.all([
		ctx.db.orderDelivery.findMany({
			where: { deletedAt: null },
			select: {
				id: true,
				salesOrderId: true,
				status: true,
				driverId: true,
				deliveryMode: true,
				dueDate: true,
			},
		}),
		ctx.db.salesOrders.count({
			where: buildSalesDispatchBacklogWhere(),
		}),
		ctx.db.dispatchException.count({
			where: { status: "open", deletedAt: null },
		}),
		ctx.db.salesPackingReport.groupBy({
			by: ["orderDeliveryId"],
			where: { status: "PENDING" },
		}),
		ctx.db.users.count({
			where: {
				...(whereEmployees({
					can: ["viewDelivery"],
					cannot: ["editOrders"],
				}) || {}),
				deletedAt: null,
			},
		}),
	]);

	const timeZone =
		process.env.BUSINESS_TIME_ZONE || process.env.TZ || "America/New_York";
	const byStage = {
		readyToAssign: 0,
		assigned: 0,
		packing: 0,
		packingBlocked: 0,
		readyToLoad: 0,
		inTransit: 0,
		fulfilled: 0,
		cancelled: 0,
	};
	let active = 0;
	let dueToday = 0;
	let pastDue = 0;
	let completed = 0;
	for (const row of dispatches) {
		// OrderDelivery is the canonical dispatch lifecycle record. Rebuilding
		// status from every historical item control made this summary unbounded
		// and could mask explicit states (for example, "missing items") with the
		// legacy "unknown" projection.
		const lifecycle = projectDispatchLifecycle({
			status: row.status,
			driverId: row.driverId,
		});
		const { stage } = lifecycle;
		const dueBucket = getDispatchDueBucket(row.dueDate, { timeZone });
		if (
			isDispatchWorkspaceSectionMatch({
				section: "active",
				stage,
				driverId: row.driverId,
				deliveryMode: row.deliveryMode,
			})
		) {
			active += 1;
		}
		if (
			isDispatchWorkspaceSectionMatch({
				section: "due-today",
				stage,
				driverId: row.driverId,
				deliveryMode: row.deliveryMode,
				dueBucket,
			})
		) {
			dueToday += 1;
		}
		if (
			isDispatchWorkspaceSectionMatch({
				section: "past-due",
				stage,
				driverId: row.driverId,
				deliveryMode: row.deliveryMode,
				dueBucket,
			})
		) {
			pastDue += 1;
		}
		if (
			isDispatchWorkspaceSectionMatch({
				section: "completed",
				stage,
				driverId: row.driverId,
				deliveryMode: row.deliveryMode,
			})
		) {
			completed += 1;
		}
		if (stage === "ready_to_assign") byStage.readyToAssign += 1;
		else if (stage === "assigned") byStage.assigned += 1;
		else if (stage === "packing") byStage.packing += 1;
		else if (stage === "packing_blocked") byStage.packingBlocked += 1;
		else if (stage === "ready_to_load") byStage.readyToLoad += 1;
		else if (stage === "in_transit") byStage.inTransit += 1;
		else if (stage === "fulfilled") byStage.fulfilled += 1;
		else if (stage === "cancelled") byStage.cancelled += 1;
	}

	return {
		backlog,
		active,
		dueToday,
		pastDue,
		completed,
		all: dispatches.length,
		openExceptions: driverExceptions + packingExceptionDispatches.length,
		overdue: pastDue,
		driverCount,
		byStage,
	};
}

export async function getDispatchBacklog(
	ctx: TRPCContext,
	input: DispatchBacklogInput,
) {
	const where: Prisma.SalesOrdersWhereInput = {
		...buildSalesDispatchBacklogWhere(
			input.deliveryModes?.length
				? input.deliveryModes
				: ["delivery", "pickup"],
		),
		...(input.ids?.length ? { id: { in: input.ids } } : {}),
		...(input.q
			? {
					OR: [
						{ orderId: { contains: input.q } },
						{ title: { contains: input.q } },
						{ status: { contains: input.q } },
						{ deliveryOption: { contains: input.q } },
						{ customer: { name: { contains: input.q } } },
						{ customer: { businessName: { contains: input.q } } },
						{ shippingAddress: { address1: { contains: input.q } } },
						{ shippingAddress: { city: { contains: input.q } } },
					],
				}
			: {}),
	};
	const { response, searchMeta } = await composeQueryData(
		input,
		where,
		ctx.db.salesOrders,
	);
	const createdAtSort = input.sort?.[0] === "createdAt.desc" ? "desc" : "asc";
	const data = await ctx.db.salesOrders.findMany({
		where,
		...searchMeta,
		orderBy: [{ createdAt: createdAtSort }, { id: createdAtSort }],
		select: {
			id: true,
			...dispatchOrderPresentationSelect,
			orderId: true,
			title: true,
			createdAt: true,
			deliveryOption: true,
			deliveryDueDate: true,
			priority: true,
			customer: {
				select: {
					id: true,
					name: true,
					businessName: true,
					phoneNo: true,
					email: true,
				},
			},
			shippingAddress: {
				select: {
					name: true,
					phoneNo: true,
					address1: true,
					address2: true,
					city: true,
					state: true,
					country: true,
				},
			},
		},
	});
	const rowsWithControl = await withSalesListControl(
		data.map((row) => ({ id: row.id })),
		ctx.db as any,
		[
			"productionStatus",
			"dispatchStatus",
			"packed",
			"pendingPacking",
			"pendingDispatch",
			"packables",
		] as any,
	);
	const controlById = new Map(
		rowsWithControl.map((row) => [row.id, (row as any).control]),
	);
	return response(
		data.map((row) => ({
			...row,
			...projectDispatchOrderPresentation(row, controlById.get(row.id) || null),
		})),
	);
}

export async function getDispatchExceptions(
	ctx: TRPCContext,
	input: DispatchExceptionListInput,
) {
	const driverWhere: Prisma.DispatchExceptionWhereInput = {
		deletedAt: null,
		status: input.status,
		...(input.reasonCodes?.length
			? { reasonCode: { in: input.reasonCodes } }
			: {}),
		...(input.driversId?.length
			? { delivery: { driverId: { in: input.driversId } } }
			: {}),
		...(input.q
			? {
					OR: [
						{ notes: { contains: input.q } },
						{ resolutionNote: { contains: input.q } },
						{ delivery: { order: { orderId: { contains: input.q } } } },
						{
							delivery: {
								order: { customer: { name: { contains: input.q } } },
							},
						},
					],
				}
			: {}),
	};
	const packingWhere: Prisma.SalesPackingReportWhereInput = {
		status:
			input.status === "open"
				? "PENDING"
				: { in: ["APPROVED", "REJECTED", "CANCELLED"] },
		...(input.driversId?.length
			? { delivery: { driverId: { in: input.driversId } } }
			: {}),
		...(input.q
			? {
					OR: [
						{ note: { contains: input.q } },
						{ decisionNote: { contains: input.q } },
						{ order: { orderId: { contains: input.q } } },
						{ order: { customer: { name: { contains: input.q } } } },
						{
							order: {
								customer: { businessName: { contains: input.q } },
							},
						},
					],
				}
			: {}),
	};
	const offset = Math.max(0, Number(input.cursor || 0));
	const size = Math.max(1, Number(input.size || 20));
	const sourceTake = offset + size + 1;
	const deliverySelect = {
		id: true,
		status: true,
		dueDate: true,
		driver: { select: { id: true, name: true } },
		order: {
			select: {
				id: true,
				orderId: true,
				customer: { select: { name: true, businessName: true } },
			},
		},
	} as const;
	const [driverRows, packingRows] = await Promise.all([
		ctx.db.dispatchException.findMany({
			where: driverWhere,
			orderBy: [{ reportedAt: "desc" }, { id: "desc" }],
			take: sourceTake,
			select: {
				id: true,
				reasonCode: true,
				notes: true,
				status: true,
				tripAction: true,
				reportedById: true,
				resolvedById: true,
				resolutionNote: true,
				reportedAt: true,
				resolvedAt: true,
				delivery: { select: deliverySelect },
			},
		}),
		ctx.db.salesPackingReport.findMany({
			where: packingWhere,
			orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
			distinct: ["orderDeliveryId"],
			take: sourceTake,
			select: {
				id: true,
				reason: true,
				note: true,
				decisionNote: true,
				status: true,
				submittedById: true,
				reviewedById: true,
				submittedAt: true,
				reviewedAt: true,
				delivery: { select: deliverySelect },
			},
		}),
	]);
	const allRows = [
		...driverRows.map((row) => ({
			...row,
			rowKey: `driver:${row.id}`,
			source: "driver_report" as const,
		})),
		...packingRows.map((row) => ({
			id: row.id,
			rowKey: `packing:${row.id}`,
			source: "guarded_packing" as const,
			reasonCode: row.reason.toLowerCase(),
			notes: row.note,
			status: input.status,
			tripAction: "keep_assigned" as const,
			reportedById: row.submittedById,
			resolvedById: row.reviewedById,
			resolutionNote: row.decisionNote,
			reportedAt: row.submittedAt,
			resolvedAt: row.reviewedAt,
			delivery: row.delivery,
		})),
	].sort(
		(a, b) =>
			new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime(),
	);
	const data = allRows.slice(offset, offset + size);
	const nextOffset = offset + data.length;

	return {
		data,
		meta: {
			size,
			cursor: allRows.length > nextOffset ? String(nextOffset) : null,
		},
	};
}

export async function reportDispatchException(
	ctx: TRPCContext,
	input: ReportDispatchExceptionInput,
) {
	if (!ctx.userId) {
		throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
	}
	const existing = await ctx.db.dispatchException.findUnique({
		where: { requestId: input.requestId },
	});
	if (existing) return { ...existing, idempotent: true };

	const delivery = await ctx.db.orderDelivery.findFirst({
		where: { id: input.dispatchId, deletedAt: null },
		select: { id: true, status: true },
	});
	if (!delivery) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Dispatch not found." });
	}
	if (["completed", "cancelled"].includes(String(delivery.status))) {
		throw new TRPCError({
			code: "CONFLICT",
			message: "A terminal dispatch cannot receive a new exception.",
		});
	}

	const created = await ctx.db.dispatchException.create({
		data: {
			orderDeliveryId: input.dispatchId,
			reasonCode: input.reasonCode,
			notes: input.notes?.trim() || null,
			status: "open",
			tripAction: "keep_assigned",
			reportedById: ctx.userId,
			requestId: input.requestId,
		},
	});
	return { ...created, idempotent: false };
}

export async function resolveDispatchException(
	ctx: TRPCContext,
	input: ResolveDispatchExceptionInput,
) {
	if (!ctx.userId) {
		throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
	}
	const existing = await ctx.db.dispatchException.findFirst({
		where: { id: input.exceptionId, deletedAt: null },
	});
	if (!existing) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Exception not found." });
	}
	if (existing.status === "resolved") return existing;
	return ctx.db.dispatchException.update({
		where: { id: existing.id },
		data: {
			status: "resolved",
			tripAction: input.tripAction,
			resolutionNote: input.resolutionNote.trim(),
			resolvedById: ctx.userId,
			resolvedAt: new Date(),
		},
	});
}

export async function getDispatchDriverWorkload(ctx: TRPCContext) {
	const workload = await ctx.db.orderDelivery.groupBy({
		by: ["driverId", "status"],
		where: {
			deletedAt: null,
			driverId: { not: null },
			status: { in: activeDispatchStatuses },
		},
		_count: { id: true },
	});
	const driverIds = [
		...new Set(
			workload
				.map((row) => row.driverId)
				.filter((id): id is number => Boolean(id)),
		),
	];
	const [drivers, exceptions] = await Promise.all([
		ctx.db.users.findMany({
			where: { id: { in: driverIds }, deletedAt: null },
			select: { id: true, name: true },
		}),
		ctx.db.dispatchException.groupBy({
			by: ["orderDeliveryId"],
			where: {
				status: "open",
				deletedAt: null,
				delivery: { driverId: { in: driverIds } },
			},
			_count: { id: true },
		}),
	]);
	const driverById = new Map(drivers.map((driver) => [driver.id, driver]));
	const exceptionDispatchIds = new Set(
		exceptions.map((row) => row.orderDeliveryId),
	);
	const exceptionRows = exceptionDispatchIds.size
		? await ctx.db.orderDelivery.findMany({
				where: { id: { in: [...exceptionDispatchIds] } },
				select: { driverId: true },
			})
		: [];
	const openExceptionByDriver = new Map<number, number>();
	for (const row of exceptionRows) {
		if (!row.driverId) continue;
		openExceptionByDriver.set(
			row.driverId,
			(openExceptionByDriver.get(row.driverId) || 0) + 1,
		);
	}
	return driverIds.map((driverId) => {
		const rows = workload.filter((row) => row.driverId === driverId);
		return {
			driverId,
			driverName: driverById.get(driverId)?.name || "Unknown driver",
			active: rows.reduce((total, row) => total + row._count.id, 0),
			inTransit:
				rows.find((row) => row.status === "in progress")?._count.id || 0,
			readyToLoad: rows.find((row) => row.status === "packed")?._count.id || 0,
			openExceptions: openExceptionByDriver.get(driverId) || 0,
		};
	});
}

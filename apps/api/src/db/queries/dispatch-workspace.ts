import type {
	DispatchBacklogInput,
	DispatchExceptionListInput,
	ReportDispatchExceptionInput,
	ResolveDispatchExceptionInput,
} from "@api/schemas/dispatch-workspace";
import type { TRPCContext } from "@api/trpc/init";
import { projectDispatchLifecycle } from "@gnd/sales/dispatch-manifest/status";
import { composeQueryData } from "@gnd/utils/query-response";
import { TRPCError } from "@trpc/server";

const activeDispatchStatuses = [
	"queue",
	"packing queue",
	"missing items",
	"packed",
	"in progress",
];

export async function getDispatchWorkspaceSummary(ctx: TRPCContext) {
	const now = new Date();
	const [dispatches, backlog, openExceptions] = await Promise.all([
		ctx.db.orderDelivery.findMany({
			where: { deletedAt: null },
			select: {
				status: true,
				driverId: true,
				dueDate: true,
			},
		}),
		ctx.db.salesOrders.count({
			where: {
				deletedAt: null,
				type: "order",
				deliveryOption: { in: ["delivery", "pickup"] },
				deliveredAt: null,
				deliveries: {
					none: {
						deletedAt: null,
						status: { notIn: ["cancelled"] },
					},
				},
			},
		}),
		ctx.db.dispatchException.count({
			where: { status: "open", deletedAt: null },
		}),
	]);

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
	let overdue = 0;
	for (const row of dispatches) {
		const { stage, isActive } = projectDispatchLifecycle(row);
		if (stage === "ready_to_assign") byStage.readyToAssign += 1;
		else if (stage === "assigned") byStage.assigned += 1;
		else if (stage === "packing") byStage.packing += 1;
		else if (stage === "packing_blocked") byStage.packingBlocked += 1;
		else if (stage === "ready_to_load") byStage.readyToLoad += 1;
		else if (stage === "in_transit") byStage.inTransit += 1;
		else if (stage === "fulfilled") byStage.fulfilled += 1;
		else if (stage === "cancelled") byStage.cancelled += 1;
		if (isActive && row.dueDate && row.dueDate.getTime() < now.getTime()) {
			overdue += 1;
		}
	}

	return {
		backlog,
		openExceptions,
		overdue,
		byStage,
	};
}

export async function getDispatchBacklog(
	ctx: TRPCContext,
	input: DispatchBacklogInput,
) {
	const where = {
		deletedAt: null,
		type: "order",
		deliveryOption: {
			in: input.deliveryModes?.length
				? input.deliveryModes
				: ["delivery", "pickup"],
		},
		deliveredAt: null,
		deliveries: {
			none: {
				deletedAt: null,
				status: { notIn: ["cancelled"] },
			},
		},
		...(input.q
			? {
					OR: [
						{ orderId: { contains: input.q } },
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
	const data = await ctx.db.salesOrders.findMany({
		where,
		...searchMeta,
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		select: {
			id: true,
			orderId: true,
			createdAt: true,
			deliveryOption: true,
			priority: true,
			customer: {
				select: {
					name: true,
					businessName: true,
					phoneNo: true,
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
	return response(data);
}

export async function getDispatchExceptions(
	ctx: TRPCContext,
	input: DispatchExceptionListInput,
) {
	const where = {
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
	const { response, searchMeta } = await composeQueryData(
		input,
		where,
		ctx.db.dispatchException,
	);
	const data = await ctx.db.dispatchException.findMany({
		where,
		...searchMeta,
		orderBy: [{ reportedAt: "desc" }, { id: "desc" }],
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
			delivery: {
				select: {
					id: true,
					status: true,
					dueDate: true,
					driver: { select: { id: true, name: true } },
					order: {
						select: {
							id: true,
							orderId: true,
							customer: {
								select: { name: true, businessName: true },
							},
						},
					},
				},
			},
		},
	});
	return response(data);
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

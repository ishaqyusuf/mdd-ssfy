import type { TRPCContext } from "@api/trpc/init";
import { Prisma } from "@gnd/db";
import {
	type DriverRouteAddress,
	createDriverRouteDestination,
	resolveDriverRouteDestination,
} from "@gnd/sales/dispatch-manifest/driver-destination";
import { lockPackingDispatchScope } from "@gnd/sales/packing-report-review";
import { TRPCError } from "@trpc/server";

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

export async function saveDriverRouteDestination(
	db: TRPCContext["db"],
	input: {
		dispatchId: number;
		actorId: number;
		manager: boolean;
		address: DriverRouteAddress;
	},
) {
	return db.$transaction(
		async (tx) => {
			await lockPackingDispatchScope(tx, input.dispatchId);
			const delivery = await tx.orderDelivery.findFirst({
				where: { id: input.dispatchId, deletedAt: null },
				select: {
					id: true,
					driverId: true,
					deliveryMode: true,
					meta: true,
					order: {
						select: {
							shippingAddress: {
								select: {
									address1: true,
									address2: true,
									city: true,
									state: true,
									country: true,
									meta: true,
								},
							},
						},
					},
				},
			});
			if (!delivery) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Dispatch not found.",
				});
			}
			if (!input.manager && delivery.driverId !== input.actorId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "This stop is not assigned to you.",
				});
			}
			const meta = asRecord(delivery.meta);
			const driverRouteDestination = createDriverRouteDestination({
				address: input.address,
				confirmedAt: new Date().toISOString(),
				confirmedById: input.actorId,
				primaryAddress: delivery.order.shippingAddress,
			});
			await tx.orderDelivery.update({
				where: { id: delivery.id },
				data: {
					meta: {
						...meta,
						driverRouteDestination,
					} as Prisma.InputJsonValue,
				},
			});

			return resolveDriverRouteDestination({
				primaryAddress: delivery.order.shippingAddress,
				deliveryMeta: { ...meta, driverRouteDestination },
				deliveryMode: delivery.deliveryMode,
			});
		},
		{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
	);
}

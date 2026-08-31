import type { TRPCContext } from "@api/trpc/init";
import type { DispatchAssignmentDestinationPreflightInput } from "@api/schemas/dispatch-workspace";
import { assignSalesAddress } from "@api/db/queries/customer";
import type { DriverRouteAddress } from "@gnd/sales/dispatch-manifest/driver-destination";
import {
	formatDriverRouteAddress,
	isDriverAssignmentDestinationReady,
	resolveDriverRouteDestination,
} from "@gnd/sales/dispatch-manifest/driver-destination";
import { TRPCError } from "@trpc/server";

type AssignmentDestination = {
	customerId: number | null;
	customerName: string;
	deliveryMode: "delivery" | "pickup";
	dispatchId: number | null;
	orderNo: string;
	primaryAddress: string;
	ready: boolean;
	salesId: number;
};

const shippingAddressSelect = {
	id: true,
	name: true,
	phoneNo: true,
	phoneNo2: true,
	email: true,
	address1: true,
	address2: true,
	city: true,
	state: true,
	country: true,
	meta: true,
} as const;

const customerSelect = {
	id: true,
	name: true,
	businessName: true,
} as const;

function assignmentDestination(input: {
	customer: { id: number; name: string | null; businessName: string | null } | null;
	deliveryMode: string | null;
	dispatchId?: number | null;
	orderNo: string | null;
	salesId: number;
	shippingAddress: unknown;
}): AssignmentDestination {
	const deliveryMode = input.deliveryMode === "pickup" ? "pickup" : "delivery";
	const destination = resolveDriverRouteDestination({
		primaryAddress: input.shippingAddress,
		deliveryMode,
	});
	return {
		customerId: input.customer?.id ?? null,
		customerName:
			input.customer?.businessName || input.customer?.name || "Customer",
		deliveryMode,
		dispatchId: input.dispatchId ?? null,
		orderNo: input.orderNo || String(input.salesId),
		primaryAddress: formatDriverRouteAddress(destination.primary),
		ready: isDriverAssignmentDestinationReady({
			primaryAddress: input.shippingAddress,
			deliveryMode,
		}),
		salesId: input.salesId,
	};
}

export async function getDispatchAssignmentDestinationPreflight(
	ctx: TRPCContext,
	input: DispatchAssignmentDestinationPreflightInput,
) {
	let destinations: AssignmentDestination[];
	if (input.dispatchIds?.length) {
		const ids = [...new Set(input.dispatchIds)];
		const rows = await ctx.db.orderDelivery.findMany({
			where: { id: { in: ids }, deletedAt: null },
			select: {
				id: true,
				deliveryMode: true,
				order: {
					select: {
						id: true,
						orderId: true,
						customer: { select: customerSelect },
						shippingAddress: { select: shippingAddressSelect },
					},
				},
			},
		});
		if (rows.length !== ids.length) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "One or more dispatches are no longer available.",
			});
		}
		const byId = new Map(rows.map((row) => [row.id, row]));
		destinations = ids.map((id) => {
			const row = byId.get(id)!;
			return assignmentDestination({
				customer: row.order.customer,
				deliveryMode: row.deliveryMode,
				dispatchId: row.id,
				orderNo: row.order.orderId,
				salesId: row.order.id,
				shippingAddress: row.order.shippingAddress,
			});
		});
	} else {
		const ids = [...new Set(input.salesIds || [])];
		const rows = await ctx.db.salesOrders.findMany({
			where: { id: { in: ids }, deletedAt: null },
			select: {
				id: true,
				orderId: true,
				customer: { select: customerSelect },
				shippingAddress: { select: shippingAddressSelect },
			},
		});
		if (rows.length !== ids.length) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "One or more sales orders are no longer available.",
			});
		}
		const byId = new Map(rows.map((row) => [row.id, row]));
		destinations = ids.map((id) => {
			const row = byId.get(id)!;
			return assignmentDestination({
				customer: row.customer,
				deliveryMode: input.deliveryMode || "delivery",
				orderNo: row.orderId,
				salesId: row.id,
				shippingAddress: row.shippingAddress,
			});
		});
	}

	return {
		all: destinations,
		missing: destinations.filter((destination) => !destination.ready),
		ready: destinations.filter((destination) => destination.ready),
	};
}

export async function assertDispatchAssignmentDestinations(
	ctx: TRPCContext,
	input: DispatchAssignmentDestinationPreflightInput,
) {
	const preflight = await getDispatchAssignmentDestinationPreflight(ctx, input);
	if (!preflight.missing.length) return preflight;
	throw new TRPCError({
		code: "PRECONDITION_FAILED",
		message: `Verify the delivery address before assigning a driver: ${preflight.missing
			.map((destination) => `Order ${destination.orderNo}`)
			.join(", ")}.`,
	});
}

export async function saveDispatchAssignmentDestination(
	ctx: TRPCContext,
	input: { salesId: number; address: DriverRouteAddress },
) {
	const sale = await ctx.db.salesOrders.findFirst({
		where: { id: input.salesId, deletedAt: null },
		select: {
			id: true,
			customerId: true,
			shippingAddressId: true,
			customer: { select: customerSelect },
			shippingAddress: { select: shippingAddressSelect },
		},
	});
	if (!sale?.customerId) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "Assign a customer to this order before verifying its address.",
		});
	}

	const result = await assignSalesAddress(ctx, {
		addressId: sale.shippingAddressId,
		addressType: "shipping",
		customerId: sale.customerId,
		salesId: sale.id,
		name:
			sale.shippingAddress?.name ||
			sale.customer?.businessName ||
			sale.customer?.name ||
			"Customer",
		phoneNo: sale.shippingAddress?.phoneNo,
		phoneNo2: sale.shippingAddress?.phoneNo2,
		email: sale.shippingAddress?.email,
		address1: input.address.address1,
		address2: input.address.address2,
		city: input.address.city,
		country: input.address.country,
		formattedAddress: input.address.formattedAddress,
		lat: input.address.lat,
		lng: input.address.lng,
		placeId: input.address.placeId,
		state: input.address.state,
		zip_code: input.address.postalCode,
	});

	return {
		...result,
		destination: resolveDriverRouteDestination({
			primaryAddress: {
				...input.address,
				meta: {
					formattedAddress: input.address.formattedAddress,
					lat: input.address.lat,
					lng: input.address.lng,
					placeId: input.address.placeId,
					postalCode: input.address.postalCode,
				},
			},
			deliveryMode: "delivery",
		}),
	};
}

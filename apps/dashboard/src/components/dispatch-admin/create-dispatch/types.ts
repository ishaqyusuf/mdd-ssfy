import type { RouterOutputs } from "@api/trpc/routers/_app";

export type BacklogOrder = RouterOutputs["dispatch"]["backlog"]["data"][number];
export type DispatchDriver =
	RouterOutputs["hrm"]["getEmployees"]["data"][number];
export type DriverWorkload =
	RouterOutputs["dispatch"]["driverWorkload"][number];

export type DriverChoice = {
	id: number;
	name: string;
	active: number;
	inTransit: number;
	readyToLoad: number;
	openExceptions: number;
};

export function getBacklogCustomerName(order: BacklogOrder) {
	return (
		order.customer?.businessName ||
		order.customer?.name ||
		order.shippingAddress?.name ||
		"Customer"
	);
}

export function formatBacklogAddress(order: BacklogOrder) {
	const address = order.shippingAddress;
	if (!address) return "Destination not available";
	return [
		address.address1,
		address.address2,
		[address.city, address.state].filter(Boolean).join(", "),
		address.country,
	]
		.filter(Boolean)
		.join(" · ");
}

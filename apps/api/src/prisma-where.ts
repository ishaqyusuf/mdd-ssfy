import type { Prisma } from "@gnd/db";

import { addSpacesToCamelCase } from "@gnd/utils";
import type { SalesDispatchStatus } from "@gnd/utils/constants";
import { composeQuery } from "@gnd/utils/query-response";
import type { EmployeesQueryParams } from "./schemas/hrm";
import type { DispatchQueryParamsSchema } from "./schemas/sales";

import { env } from "node:process";
import { whereSales } from "@sales/utils/where-queries";
export function whereCustomer(query: DispatchQueryParamsSchema) {
	const whereStack: Prisma.CustomersWhereInput[] = [];

	if (query.q) {
		const contains = { contains: query.q };
		whereStack.push({
			OR: [
				{
					name: contains,
				},
				{
					email: contains,
				},
				{
					address: contains,
				},
			],
		});
	}

	return composeQuery(whereStack);
}
export function whereDispatch(query: DispatchQueryParamsSchema) {
	const whereStack: Prisma.OrderDeliveryWhereInput[] = [];

	if (query?.tab === "all") {
		// Keep all statuses.
	} else if (query?.tab === "completed") {
		whereStack.push({
			status: "completed",
		});
	} else if (query?.tab === "pending") {
		whereStack.push({
			status: {
				in: [
					"in progress",
					"packed",
					"queue",
					"packing queue",
				] as SalesDispatchStatus[],
			},
		});
	} else {
		switch (query?.status as SalesDispatchStatus) {
			case "missing items":
				whereStack.push({
					order: {
						itemControls: {
							some: {
								deletedAt: null,
								qtyControls: {
									some: {
										deletedAt: null,
										type: "dispatchCompleted",
										total: {
											gt: 0,
										},
										percentage: {
											lt: 100,
										},
									},
								},
							},
						},
					},
				});
				break;
			case "in progress":
			case "packed":
			case "queue":
			case "packing queue":
			case "completed":
			case "cancelled":
				whereStack.push({
					status: query?.status,
				});
				break;
			default:
				whereStack.push({
					status: {
						in: [
							"in progress",
							"packed",
							"queue",
							"packing queue",
						] as SalesDispatchStatus[],
					},
				});
				break;
		}
	}
	if (query.driversId?.length && env.NODE_ENV === "production")
		whereStack.push({
			driverId: {
				in: query.driversId,
			},
		});
	if (query.q) {
		const contains = { contains: query.q };
		const addressContains = {
			OR: [
				{
					name: contains,
				},
				{
					address1: contains,
				},
				{
					address2: contains,
				},
				{
					city: contains,
				},
				{
					state: contains,
				},
				{
					country: contains,
				},
			],
		};
		whereStack.push({
			OR: [
				{
					order: {
						OR: [
							{
								orderId: contains,
							},
							{
								customer: {
									OR: [
										{
											phoneNo: contains,
										},
										{
											businessName: contains,
										},
										{
											name: contains,
										},
									],
								},
							},
							{
								shippingAddress: addressContains,
							},
							{
								billingAddress: addressContains,
							},
						],
					},
				},
			],
		});
	}

	return composeQuery(whereStack);
}
export { whereSales };

export function parseSearchparams(_params) {
	let itemSearch: string | null = null;
	if (_params?.startsWith("item:")) {
		itemSearch = _params.split("item:")[1]?.trim();
		// return {
		//     itemSearch,
		// };
	}
	if (!itemSearch) return null;
	const sizePattern = /\b(\d+-\d+)\s*x\s*(\d+-\d+)\b/;
	const match = itemSearch.match(sizePattern);

	let size = "";
	let otherparams = itemSearch;

	if (match) {
		size = match[0];
		otherparams = itemSearch.replace(sizePattern, "").trim();
	}
	const spl = size.trim().split(" ");
	// import ft to in
	// if (size && spl.length == 3) {
	//     size = `${ftToIn(spl[0])} x ${ftToIn(spl[2])}`;
	// }

	return {
		size: size,
		otherparams: otherparams,
		originalparams: itemSearch,
	};
}
export function whereEmployees(params: EmployeesQueryParams) {
	const wheres: Prisma.UsersWhereInput[] = [];
	const { can, cannot, roles } = params;
	if (params.q) {
		const contains = { contains: params.q };
		wheres.push({
			OR: [
				{ name: contains },
				{ email: contains },
				{ username: contains },
				{ phoneNo: contains },
				{
					employeeProfile: {
						name: contains,
					},
				},
			],
		});
	}
	if (can?.length) {
		const wherePermissions: Prisma.PermissionsWhereInput[] = [];
		can.map((permission) => {
			const name = addSpacesToCamelCase(permission).toLocaleLowerCase();
			wherePermissions.push({
				name,
			});
		});
		wheres.push({
			roles: {
				some: {
					role:
						wherePermissions?.length > 1
							? {
									AND: wherePermissions.map((permission) => ({
										RoleHasPermissions: {
											some: {
												permission,
											},
										},
									})),
								}
							: {
									RoleHasPermissions: {
										some: {
											permission: wherePermissions[0],
										},
									},
								},
				},
			},
		});
	}
	if (cannot?.length)
		wheres.push({
			roles: {
				some: {
					role: {
						RoleHasPermissions: {
							every: {
								AND: cannot?.map((p) => ({
									permission: {
										name: {
											not: addSpacesToCamelCase(p).toLocaleLowerCase(),
										},
									},
								})),
							},
						},
					},
				},
			},
		});
	if (roles?.length) {
		wheres.push({
			roles: {
				some: {
					role:
						roles?.length === 1
							? {
									name: roles[0],
								}
							: {
									OR: roles.map((name) => ({ name })),
								},
				},
			},
		});
	}
	Object.entries(params).map(([k, v]) => {
		if (v === null) return;
		switch (k as keyof EmployeesQueryParams) {
			case "role":
				if (typeof v !== "string") break;
				wheres.push({
					roles: {
						some: {
							role: {
								name: v,
							},
						},
					},
				});
				break;
			case "profile":
				if (typeof v !== "string") break;
				wheres.push({
					employeeProfile: {
						name: v,
					},
				});
				break;
		}
	});
	return composeQuery(wheres);
}

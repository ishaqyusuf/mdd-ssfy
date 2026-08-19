import type { Prisma } from "@gnd/db";

import { addSpacesToCamelCase } from "@gnd/utils";
import type { SalesDispatchStatus } from "@gnd/utils/constants";
import { composeQuery } from "@gnd/utils/query-response";
import type { EmployeesQueryParams } from "./schemas/hrm";
import type { DispatchQueryParamsSchema } from "./schemas/sales";
import type { DriverWorkQueueQuerySchema } from "./schemas/sales";

import { getDispatchDateBoundaries } from "@gnd/sales/dispatch-manifest/driver-work-queue";
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
export function whereDispatch(
	query: DispatchQueryParamsSchema &
		Partial<DriverWorkQueueQuerySchema> & { now?: Date },
) {
	const whereStack: Prisma.OrderDeliveryWhereInput[] = [];

	if (query.stages?.length) {
		const stageWhere: Prisma.OrderDeliveryWhereInput[] = [];
		for (const stage of query.stages) {
			if (stage === "ready_to_assign") {
				stageWhere.push({ status: "queue", driverId: null });
			} else if (stage === "assigned") {
				stageWhere.push({ status: "queue", driverId: { not: null } });
			} else if (stage === "packing") {
				stageWhere.push({ status: "packing queue" });
			} else if (stage === "packing_blocked") {
				stageWhere.push({ status: "missing items" });
			} else if (stage === "ready_to_load") {
				stageWhere.push({ status: "packed" });
			} else if (stage === "in_transit") {
				stageWhere.push({ status: "in progress" });
			} else if (stage === "fulfilled") {
				stageWhere.push({ status: "completed" });
			} else if (stage === "cancelled") {
				stageWhere.push({ status: "cancelled" });
			}
		}
		if (stageWhere.length) whereStack.push({ OR: stageWhere });
	} else if (query.statuses?.length) {
		whereStack.push({
			status: { in: query.statuses },
		});
	} else if (query?.tab === "all") {
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
	if (query.driversId?.length)
		whereStack.push({
			driverId: {
				in: query.driversId,
			},
		});
	if (query.deliveryModes?.length) {
		whereStack.push({ deliveryMode: { in: query.deliveryModes } });
	}
	if (query.scheduleRange?.length) {
		const [from, to] = query.scheduleRange;
		const fromDate = from ? new Date(from) : null;
		const toDate = to ? new Date(to) : null;
		if (fromDate && !Number.isNaN(fromDate.getTime())) {
			whereStack.push({
				dueDate: {
					gte: fromDate,
					...(toDate && !Number.isNaN(toDate.getTime()) ? { lte: toDate } : {}),
				},
			});
		}
	}
	if (query.risks?.length) {
		const { startToday } = getDispatchDateBoundaries({
			now: query.now,
			timeZone:
				process.env.BUSINESS_TIME_ZONE || process.env.TZ || "America/New_York",
		});
		const riskWhere: Prisma.OrderDeliveryWhereInput[] = [];
		for (const risk of query.risks) {
			if (risk === "overdue") {
				riskWhere.push({
					dueDate: { lt: startToday },
					status: { notIn: ["completed", "cancelled"] },
				});
			} else if (risk === "unscheduled") {
				riskWhere.push({
					dueDate: null,
					status: { notIn: ["completed", "cancelled"] },
				});
			} else if (risk === "missing_items") {
				riskWhere.push({ status: "missing items" });
			} else if (risk === "unassigned") {
				riskWhere.push({
					driverId: null,
					status: { notIn: ["completed", "cancelled"] },
				});
			} else if (risk === "open_exception") {
				riskWhere.push({
					exceptions: {
						some: { status: "open", deletedAt: null },
					},
				});
			}
		}
		if (riskWhere.length) whereStack.push({ OR: riskWhere });
	}
	if (query.dueBuckets?.length) {
		const { startToday, startTomorrow, startAfterTomorrow } =
			getDispatchDateBoundaries({
				now: query.now,
				timeZone:
					process.env.BUSINESS_TIME_ZONE ||
					process.env.TZ ||
					"America/New_York",
			});
		const dueRanges: Prisma.OrderDeliveryWhereInput[] = [];
		for (const bucket of query.dueBuckets) {
			if (bucket === "overdue") {
				dueRanges.push({ dueDate: { lt: startToday } });
			} else if (bucket === "today") {
				dueRanges.push({
					dueDate: { gte: startToday, lt: startTomorrow },
				});
			} else if (bucket === "tomorrow") {
				dueRanges.push({
					dueDate: { gte: startTomorrow, lt: startAfterTomorrow },
				});
			} else if (bucket === "upcoming") {
				dueRanges.push({ dueDate: { gte: startAfterTomorrow } });
			} else if (bucket === "unscheduled") {
				dueRanges.push({ dueDate: null });
			}
		}
		if (dueRanges.length) whereStack.push({ OR: dueRanges });
	}
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
	const wheres: Prisma.UsersWhereInput[] = [
		params.accessStatus === "revoked"
			? { accessRevokedAt: { not: null } }
			: { accessRevokedAt: null },
	];
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
			case "accessStatus":
				break;
		}
	});
	return composeQuery(wheres);
}

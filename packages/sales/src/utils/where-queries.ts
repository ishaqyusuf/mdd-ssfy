import {
	anyDateQuery,
	transformFilterDateToQuery,
} from "@gnd/utils";
import { orderInboundStatuses } from "@gnd/utils/constants";
import { composeQuery } from "@gnd/utils/query-response";
import { SALES_HAS_FILTER_LABELS } from "../filter-constants";
import { normalizeSalesPriority } from "../priority";
import {
	getProductionDateRange,
	getProductionQueueBoundaries,
} from "../production-date";
import type { SalesQueryParamsSchema } from "../schema";
import type { Prisma, QtyControlType } from "../types";
import { SalesDispatchStatus } from "./constants";

type SalesHasFilter = NonNullable<SalesQueryParamsSchema["has"]>;
type SalesInboundFilter = NonNullable<SalesQueryParamsSchema["inbound"]>;
type SalesSpecialOrderFilter = NonNullable<
	SalesQueryParamsSchema["specialOrder"]
>;

const manualSalesInboundStatuses =
	orderInboundStatuses satisfies readonly SalesInboundFilter[];
type InventorySalesInboundStatus = Exclude<
	SalesInboundFilter,
	"none" | (typeof manualSalesInboundStatuses)[number]
>;

function isManualSalesInboundStatus(
	inbound: SalesInboundFilter,
): inbound is (typeof manualSalesInboundStatuses)[number] {
	return manualSalesInboundStatuses.some((status) => status === inbound);
}

function activeInventoryInboundDemandWhere(
	status?: InventorySalesInboundStatus,
) {
	return {
		deletedAt: null,
		inboundShipmentItemId: {
			not: null,
		},
		inboundShipmentItem: {
			deletedAt: null,
			inbound: {
				deletedAt: null,
				status: status ?? {
					not: "cancelled",
				},
			},
		},
		status: {
			not: "cancelled",
		},
	} satisfies Prisma.InboundDemandWhereInput;
}

function inventoryOwnedInboundSalesWhere(
	relation: "some" | "none",
	status?: InventorySalesInboundStatus,
): Prisma.SalesOrdersWhereInput {
	return {
		lineItems: {
			[relation]: {
				deletedAt: null,
				components: {
					some: {
						inboundDemands: {
							some: activeInventoryInboundDemandWhere(status),
						},
					},
				},
			},
		},
	};
}

function buildSalesInboundWhere(
	inbound: SalesInboundFilter,
): Prisma.SalesOrdersWhereInput {
	if (inbound === "none") {
		return {
			AND: [{ inventoryStatus: null }, inventoryOwnedInboundSalesWhere("none")],
		};
	}

	if (isManualSalesInboundStatus(inbound)) {
		return {
			AND: [
				{ inventoryStatus: inbound },
				inventoryOwnedInboundSalesWhere("none"),
			],
		};
	}

	return inventoryOwnedInboundSalesWhere("some", inbound);
}

export function buildSalesSpecialOrderWhere(
	filter: SalesSpecialOrderFilter,
	now = new Date(),
): Prisma.SalesOrdersWhereInput {
	const base: Prisma.SalesOrdersWhereInput = {
		specialOrderDeclaration: "YES",
	};

	switch (filter) {
		case "signed":
			return { ...base, specialOrderStatus: "CUSTOMER_APPROVED" };
		case "not_signed":
			return {
				...base,
				OR: [
					{ specialOrderStatus: null },
					{ specialOrderStatus: { not: "CUSTOMER_APPROVED" } },
				],
			};
		case "expired":
			return {
				...base,
				currentSpecialOrderRequestId: { not: null },
				specialOrderRequests: {
					some: {
						status: "ACTIVE",
						expiresAt: { lte: now },
					},
				},
			};
		case "signature_pending":
			return { ...base, specialOrderStatus: "SIGNATURE_PENDING" };
		case "reapproval_required":
			return { ...base, specialOrderStatus: "REAPPROVAL_REQUIRED" };
		case "declined":
			return { ...base, specialOrderStatus: "CUSTOMER_DECLINED" };
	}
}

function salesItemTypeWhere(label: string): Prisma.SalesOrderItemsWhereInput[] {
	return [
		{
			meta: {
				path: "$.doorType",
				string_contains: label,
			},
		},
		{
			formSteps: {
				some: {
					deletedAt: null,
					value: label,
				},
			},
		},
		{
			description: {
				contains: label,
			},
		},
		{
			dykeDescription: {
				contains: label,
			},
		},
	];
}

function buildSalesHasWhere(has: SalesHasFilter): Prisma.SalesOrdersWhereInput {
	const label = SALES_HAS_FILTER_LABELS[has];
	const baseTypeWhere = salesItemTypeWhere(label);

	switch (has) {
		case "services":
			return {
				items: {
					some: {
						deletedAt: null,
						OR: baseTypeWhere,
					},
				},
			};
		case "shelf-items":
			return {
				items: {
					some: {
						deletedAt: null,
						OR: [
							{
								shelfItems: {
									some: {
										deletedAt: null,
									},
								},
							},
							...baseTypeWhere,
						],
					},
				},
			};
		case "moulding":
			return {
				items: {
					some: {
						deletedAt: null,
						OR: [
							{
								housePackageTool: {
									deletedAt: null,
									moldingId: {
										not: null,
									},
								},
							},
							{
								housePackageTool: {
									deletedAt: null,
									doorType: label,
								},
							},
							...baseTypeWhere,
						],
					},
				},
			};
		default:
			return {
				items: {
					some: {
						deletedAt: null,
						OR: [
							{
								housePackageTool: {
									deletedAt: null,
									doorType: label,
								},
							},
							{
								salesDoors: {
									some: {
										deletedAt: null,
										doorType: label,
									},
								},
							},
							...baseTypeWhere,
						],
					},
				},
			};
	}
}

function buildPendingStatWhere(
	type: QtyControlType,
	salesStatSome: (
		type: QtyControlType,
		statWhere?: Prisma.SalesStatWhereInput,
	) => Prisma.SalesOrdersWhereInput,
) {
	return {
		OR: [
			salesStatSome(type, {
				total: {
					gt: 0,
				},
				percentage: {
					lt: 100,
				},
			}),
			{
				stat: {
					none: {
						deletedAt: null,
						type,
					},
				},
			},
		],
	} satisfies Prisma.SalesOrdersWhereInput;
}

export function buildProductionEligibleWhere(): Prisma.SalesOrdersWhereInput {
	return {
		itemControls: {
			some: {
				deletedAt: null,
				produceable: true,
				qtyControls: {
					some: {
						deletedAt: null,
						type: "qty" as QtyControlType,
						total: { gt: 0 },
					},
				},
			},
		},
	};
}

export function whereSales(query: SalesQueryParamsSchema) {
	const where: Prisma.SalesOrdersWhereInput[] = [];
	const assignedToId = query["production.assignedToId"];
	const salesStatSome = (
		type: QtyControlType,
		statWhere: Prisma.SalesStatWhereInput = {},
	): Prisma.SalesOrdersWhereInput => ({
		stat: {
			some: {
				deletedAt: null,
				type,
				...statWhere,
			},
		},
	});
	const buildProductionPendingWhere = () =>
		buildPendingStatWhere("prodCompleted" as QtyControlType, salesStatSome);
	const buildDispatchPendingWhere = () =>
		buildPendingStatWhere("dispatchCompleted" as QtyControlType, salesStatSome);
	const buildDefaultPendingSalesWhere = (): Prisma.SalesOrdersWhereInput => ({
		OR: [
			buildDispatchPendingWhere(),
			buildProductionPendingWhere(),
			{
				amountDue: {
					gt: 0,
				},
			},
		],
	});

	Object.entries(query).map(([k, v]) => {
		if (v === null) return;
		switch (k as keyof SalesQueryParamsSchema) {
			// case "bin":
			//   if (v)
			//     where.push({
			//       deletedAt: {
			//         lte: new Date(),
			//       },
			//     });
			//   break;

			case "salesRepId":
				where.push({
					salesRepId: v as any,
				});
				break;
			case "dateRange":
				where.push({
					createdAt: transformFilterDateToQuery(query.dateRange!),
				});
				break;
			case "salesType":
				where.push({
					type: query.salesType,
				});
				break;
			case "salesNo":
				where.push({
					orderId: query.salesNo!,
				});
				break;
			case "q":
				const searchQ = searchSales(v);
				if (searchQ) where.push(searchQ);
				break;
			case "item":
				if (typeof v === "string") {
					const itemQ = buildSalesItemSearchWhere(v);
					if (itemQ) where.push(itemQ);
				}
				break;
			case "salesNos":
				if (query.salesNos?.length)
					where.push({
						orderId: {
							in: query.salesNos!,
						},
					});
				break;
			case "customerId":
				where.push({
					customerId: query.customerId!,
				});
				break;
			case "salesIds":
				if (query.salesIds?.length)
					where.push({
						id: {
							in: query.salesIds,
						},
					});
				if (Array.isArray(query.salesIds) && !query?.salesIds.length)
					where.push({
						id: {
							lte: 0,
						},
					});
				break;
			case "productionDueDate":
				where.push({
					assignments: {
						some: {
							deletedAt: null,
							assignedToId: assignedToId || undefined,
							dueDate: getProductionDateRange(v as string),
						},
					},
				});
				break;
		}
	});

	// const q = query.q;
	// if (q) {
	//   const searchQ = searchSales(q);
	//   if (searchQ) where.push(searchQ);
	// }
	if (query["dealer.id"])
		where.push({
			customer: {
				auth: {
					id: query["dealer.id"],
				},
			},
		});
	const statType = (type: QtyControlType) => type;
	const status = query["dispatch.status"];
	if (status) {
		// switch (query["dispatch.status"]) {
		//   case "backorder":
		//     where.push({
		//       stat: {
		//         some: {
		//           type: statType("dispatchCompleted"),
		//           AND: [
		//             {
		//               percentage: {
		//                 gt: 0,
		//               },
		//             },
		//             {
		//               percentage: {
		//                 lt: 100,
		//               },
		//             },
		//           ],
		//         },
		//       },
		//     });
		//     break;
		// }
	}

	if (query["sales.type"]) {
		where.push({
			type: query["sales.type"],
		});
	}

	const keys = Object.keys(query) as (keyof SalesQueryParamsSchema)[];
	keys.map((k) => {
		const val = query?.[k] as any;
		if (!val) return;
		switch (k) {
			case "address.id":
				where.push({
					OR: [
						{
							billingAddressId: val,
						},
						{
							shippingAddressId: val,
						},
					],
				});
				break;
			// case "id":
			//   let id = String(query.id);
			//   if (id?.includes(","))
			//     where.push({
			//       id: {
			//         in: id?.split(",").map((s) => Number(s)),
			//       },
			//     });
			//   else
			//     where.push({
			//       id: Number(query.id),
			//     });
			//   break;

			case "invoice":
				switch (query.invoice) {
					case "pending":
						where.push({
							amountDue: {
								gt: 0,
							},
						});
						break;
					case "paid":
						where.push({
							amountDue: 0,
						});
						break;
				}
				break;
			case "orderNo":
			case "salesNo":
				if (val?.includes(","))
					where.push({
						orderId: {
							in: val?.split(","),
						},
					});
				else
					where.push({
						orderId: {
							contains: val,
						},
					});
				break;
			case "po":
				where.push({
					meta: {
						path: "$.po",
						string_contains: val,
					},
				});
				break;
			// case "customer.id":
			//   where.push({
			//     customerId: val,
			//   });
			//   break;
			case "customer.name":
				where.push({
					OR: [
						{
							customer: {
								name: {
									contains: val,
								},
							},
						},
						{
							customer: {
								businessName: {
									contains: val,
								},
							},
						},
						{
							billingAddress: {
								name: {
									contains: val,
								},
							},
						},
					],
				});
				break;
			case "phone":
				const _phonequery = {
					phoneNo: val,
				};
				where.push({
					OR: [
						{
							customer: _phonequery,
						},
						{
							customer: {
								phoneNo2: val,
							},
						},
						{
							billingAddress: _phonequery,
						},
						{
							shippingAddress: _phonequery,
						},
					],
				});
				break;

			case "sales.rep":
				where.push({
					salesRep: {
						name: val,
					},
				});
				break;
			case "priority":
			case "sales.priority":
				if (normalizeSalesPriority(val) === "NORMAL")
					where.push({
						OR: [{ priority: null }, { priority: "NORMAL" as any }],
					});
				else {
					where.push({
						priority: normalizeSalesPriority(val) as any,
					});
				}
				break;
			case "has":
				where.push(buildSalesHasWhere(val));
				break;
			case "salesChannel":
				where.push(
					val === "dealership"
						? { dealerAuthId: { gt: 0 } }
						: {
								OR: [{ dealerAuthId: null }, { dealerAuthId: 0 }],
							},
				);
				break;
			case "inbound":
				where.push(buildSalesInboundWhere(val));
				break;
			case "specialOrderScope":
				if (val === "special_orders") {
					where.push({ specialOrderDeclaration: "YES" });
				}
				break;
			case "specialOrder":
				where.push(buildSalesSpecialOrderWhere(val));
				break;
			case "production.assignedToId":
				where.push({
					assignments: {
						some: {
							deletedAt: null,
							assignedToId: val,
						},
					},
				});
				break;
		}
	});
	const prodStatus = query["production.status"];
	const productionDateBoundaries = getProductionQueueBoundaries();
	const production = query.production;
	if (production || prodStatus || query["production.assignment"]) {
		where.push(buildProductionEligibleWhere());
	}
	switch (production) {
		case "pending":
			where.push(
				salesStatSome("prodCompleted" as QtyControlType, {
					total: {
						gt: 0,
					},
					percentage: {
						lt: 100,
					},
				}),
			);
			break;
		case "in progress":
			where.push(
				salesStatSome("prodCompleted" as QtyControlType, {
					total: {
						gt: 0,
					},
					AND: [
						{
							percentage: { gt: 0 },
						},
						{ percentage: { lt: 100 } },
					],
				}),
			);
			break;
		case "completed":
			where.push(
				salesStatSome("prodCompleted" as QtyControlType, {
					total: {
						gt: 0,
					},
					percentage: 100,
				}),
			);
			break;
	}
	switch (prodStatus) {
		case "completed":
			where.push({
				stat: {
					some: {
						deletedAt: null,
						type: "prodCompleted" as QtyControlType,
						total: {
							gt: 0,
						},
						percentage: 100,
					},
				},
			});
			break;
		case "part assigned":
			where.push({
				assignments: {
					some: {
						deletedAt: null,
					},
				},
			});
			break;
		case "due today":
			where.push({
				stat: {
					some: {
						deletedAt: null,
						type: "prodCompleted" as QtyControlType,
						percentage: {
							not: 100,
						},
					},
				},
				assignments: {
					some: {
						assignedToId: assignedToId || undefined,
						deletedAt: null,
						dueDate: productionDateBoundaries.today,
					},
				},
			});
			break;
		case "due tomorrow":
			where.push({
				stat: {
					some: {
						deletedAt: null,
						type: "prodCompleted" as QtyControlType,
						percentage: {
							not: 100,
						},
					},
				},
				assignments: {
					some: {
						assignedToId: assignedToId || undefined,
						deletedAt: null,
						dueDate: productionDateBoundaries.tomorrow,
					},
				},
			});
			break;
		case "past due":
			where.push({
				...salesStatSome("prodCompleted" as QtyControlType, {
					total: {
						gt: 0,
					},
					percentage: {
						not: 100,
					},
				}),
				assignments: {
					some: {
						assignedToId: assignedToId || undefined,
						deletedAt: null,
						dueDate: productionDateBoundaries.pastDue,
					},
				},
			});
			break;
		case "future":
			where.push({
				...salesStatSome("prodCompleted" as QtyControlType, {
					total: {
						gt: 0,
					},
					percentage: {
						not: 100,
					},
				}),
				assignments: {
					some: {
						assignedToId: assignedToId || undefined,
						deletedAt: null,
						dueDate: productionDateBoundaries.future,
					},
				},
			});
			break;
		case "unscheduled":
			where.push({
				...salesStatSome("prodCompleted" as QtyControlType, {
					total: {
						gt: 0,
					},
					percentage: {
						not: 100,
					},
				}),
				assignments: {
					some: {
						assignedToId: assignedToId || undefined,
						deletedAt: null,
						dueDate: null,
					},
				},
			});
			break;
	}

	switch (query["production.assignment"]) {
		case "all assigned":
			where.push({
				...salesStatSome("prodAssigned" as QtyControlType, {
					total: { gt: 0 },
					percentage: 100,
				}),
				assignments: {
					some: {
						deletedAt: null,
						assignedToId: {
							not: null,
						},
					},
					none: {
						deletedAt: null,
						assignedToId: null,
					},
				},
			});
			break;
		case "not assigned":
			where.push({
				assignments: {
					none: {
						deletedAt: null,
						assignedToId: {
							not: null,
						},
					},
				},
			});
			break;
		case "part assigned":
			break;
	}
	const dispatchPendingQuery = buildDispatchPendingWhere();
	if (query.defaultSearch && !query?.bin) {
		where.push(buildDefaultPendingSalesWhere());
	}
	switch (query["dispatch.status"]) {
		case "pending":
			where.push(dispatchPendingQuery);
			break;
		case "completed":
			where.push(
				salesStatSome("dispatchCompleted" as QtyControlType, {
					total: {
						gt: 0,
					},
					percentage: 100,
				}),
			);
			break;
		case "backorder":
			where.push(
				salesStatSome("dispatchCompleted" as QtyControlType, {
					total: {
						gt: 0,
					},
					AND: [
						{
							percentage: { gt: 0 },
						},
						{ percentage: { lt: 100 } },
					],
				}),
			);
			break;
		case "late":
			where.push({
				deliveries: {
					some: {
						status: {
							not: "completed",
						},
						dueDate: {
							lte: new Date(),
						},
					},
				},
			});
			break;
	}
	if (query["account.no"])
		where.push({
			customer: {
				phoneNo: query["account.no"],
			},
		});
	return composeQuery(where);
}

function buildSalesItemSearchWhere(
	itemSearch: string,
	originalParams = itemSearch,
): Prisma.SalesOrdersWhereInput | null {
	const parsedQ = parseItemSearchparams(itemSearch);
	if (!parsedQ) return null;

	const _contains = {
		contains: parsedQ.otherparams,
	};

	return {
		items: {
			some: {
				OR: [
					{ description: originalParams },
					{ description: parsedQ.otherparams },
					{
						salesDoors: {
							some: {
								OR: [
									{
										stepProduct: {
											OR: [
												{
													name: _contains,
												},
												{
													door: {
														title: _contains,
													},
												},
												{
													product: {
														title: _contains,
													},
												},
											],
										},
									},
									{
										dimension: parsedQ.size
											? {
													contains: parsedQ.size,
												}
											: undefined,
									},
								],
							},
						},
					},
					{
						housePackageTool: {
							OR: [
								{
									stepProduct: {
										OR: [
											{
												name: _contains,
											},
											{
												door: {
													title: _contains,
												},
											},
											{
												product: {
													title: _contains,
												},
											},
										],
									},
								},
								{
									door: {
										OR: [
											{
												stepProducts: {
													some: {
														OR: [
															{
																name: _contains,
															},
															{
																door: {
																	title: _contains,
																},
															},
															{
																product: {
																	title: _contains,
																},
															},
														],
													},
												},
											},
											{
												title: {
													contains: parsedQ.otherparams,
												},
											},
										],
									},
								},
								{
									molding: {
										title: {
											contains: parsedQ.otherparams,
										},
									},
								},
							],
						},
					},
				],
			},
		},
	};
}

function searchSales(params): Prisma.SalesOrdersWhereInput | null {
	const inputQ = { contains: params || undefined } as any;
	const parsedQ = parseSearchparams(params);
	if (parsedQ) {
		return buildSalesItemSearchWhere(parsedQ.originalparams, params);
	}
	if (params) {
		return {
			OR: [
				{ orderId: inputQ },
				{
					customer: {
						OR: [
							{
								businessName: inputQ,
							},
							{
								name: inputQ,
							},
							{
								email: inputQ,
							},
							{
								phoneNo: inputQ,
							},
							{
								address: inputQ,
							},
						],
					},
				},
				{
					billingAddress: {
						OR: [
							{ name: inputQ },
							{ address1: inputQ },
							{ address2: inputQ },
							{ city: inputQ },
							{ state: inputQ },
							{ email: inputQ },
							{
								phoneNo: inputQ,
							},
						],
					},
				},
				{
					shippingAddress: {
						OR: [
							{ name: inputQ },
							{ address1: inputQ },
							{ address2: inputQ },
							{ city: inputQ },
							{ state: inputQ },
							{ email: inputQ },
							{ phoneNo: inputQ },
						],
					},
				},
				{
					producer: {
						name: inputQ,
					},
				},
			],
		};
	}
	return null;
}
export function parseSearchparams(_params) {
	let itemSearch: any = null;
	if (_params?.startsWith("item:")) {
		itemSearch = _params.split("item:")[1]?.trim();
		// return {
		//     itemSearch,
		// };
	}
	if (!itemSearch) return null;
	return parseItemSearchparams(itemSearch);
}

function parseItemSearchparams(itemSearch: string) {
	if (!itemSearch?.trim()) return null;

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

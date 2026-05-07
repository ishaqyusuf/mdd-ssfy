import { whereCustomer, whereSales } from "@api/prisma-where";
import type {
	GetCustomerDirectoryV2SummarySchema,
	GetCustomerOverviewV2Schema,
	GetCustomers,
	SearchCustomersSchema,
	UpsertCustomerSchema,
} from "@api/schemas/customer";
import type { TRPCContext } from "@api/trpc/init";
import type { Prisma } from "@gnd/db";
import { fetchDevicesByLocations, getSquareDevices } from "@gnd/square";
import { nextId, sum } from "@gnd/utils";
import { composeQueryData } from "@gnd/utils/query-response";
import type { SalesQueryParamsSchema } from "@sales/schema";
import type { AddressBookMeta, CustomerMeta } from "@sales/types";
import { salesAddressLines } from "@sales/utils/utils";
import { getCustomerWallet } from "@sales/wallet";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

function buildCustomerLookupWhere(
	accountNo: string,
): Prisma.CustomersWhereInput {
	const [prefix, rawId] = accountNo.split("-");
	return {
		phoneNo: prefix === "cust" ? undefined : accountNo,
		id: prefix === "cust" ? Number(rawId) : undefined,
	};
}

function buildCustomerSalesFilter(
	accountNo: string,
	salesType?: "order" | "quote",
) {
	const [prefix, rawId] = accountNo.split("-");
	const query: Partial<SalesQueryParamsSchema> = {
		salesType,
	};
	if (prefix === "cust") query.customerId = Number(rawId);
	else query.phone = accountNo;
	return whereSales(query as SalesQueryParamsSchema);
}

function mapCustomerWorkspaceItem(
	item: Awaited<ReturnType<typeof getCustomerWorkspaceSales>>[number],
) {
	return {
		id: item.id,
		orderId: item.orderId,
		slug: item.slug || item.orderId,
		uuid: item.slug || item.orderId,
		poNo:
			(((item.meta || {}) as Record<string, unknown>)?.po as
				| string
				| undefined) || null,
		displayName:
			item.billingAddress?.name ||
			item.customer?.businessName ||
			item.customer?.name ||
			null,
		customerPhone:
			item.billingAddress?.phoneNo || item.customer?.phoneNo || null,
		address: item.billingAddress?.address1 || item.customer?.address || null,
		salesDate: item.createdAt?.toISOString?.() || null,
		due: Number(item.amountDue || 0),
		invoice: {
			total: Number(item.grandTotal || 0),
		},
		status: item.status as
			| {
					delivery?: {
						status?: string | null;
					};
			  }
			| null
			| undefined,
	};
}

type CustomerOverviewActivity = {
	id: string;
	type:
		| "order"
		| "quote"
		| "payment"
		| "refund"
		| "wallet"
		| "payment_cancelled";
	title: string;
	subtitle: string;
	amount: number;
	date: string;
	status: string | null;
	orderId: string | null;
};

async function getCustomerRecentActivity(ctx: TRPCContext, accountNo: string) {
	const salesWhere = buildCustomerSalesFilter(accountNo);
	const orderOnlyWhere = buildCustomerSalesFilter(accountNo, "order");

	const [recentSales, recentTransactions] = await Promise.all([
		ctx.db.salesOrders.findMany({
			where: salesWhere,
			orderBy: {
				createdAt: "desc",
			},
			take: 8,
			select: {
				id: true,
				orderId: true,
				type: true,
				grandTotal: true,
				amountDue: true,
				createdAt: true,
			},
		}),
		ctx.db.customerTransaction.findMany({
			where: {
				OR: [
					{
						wallet: {
							accountNo,
						},
					},
					{
						salesPayments: {
							some: {
								deletedAt: null,
								order: orderOnlyWhere,
							},
						},
					},
				],
			},
			orderBy: {
				createdAt: "desc",
			},
			take: 10,
			select: {
				id: true,
				amount: true,
				createdAt: true,
				status: true,
				paymentMethod: true,
				history: {
					orderBy: {
						createdAt: "desc",
					},
					take: 1,
					select: {
						status: true,
						reason: true,
					},
				},
				salesPayments: {
					where: {
						deletedAt: null,
					},
					select: {
						amount: true,
						order: {
							select: {
								orderId: true,
							},
						},
					},
				},
			},
		}),
	]);

	const saleActivity: CustomerOverviewActivity[] = recentSales.map((sale) => ({
		id: `sale-${sale.id}`,
		type: sale.type === "quote" ? "quote" : "order",
		title:
			sale.type === "quote"
				? `Quote #${sale.orderId} created`
				: `Order #${sale.orderId} opened`,
		subtitle:
			sale.type === "quote"
				? "Quote added to account workspace"
				: Number(sale.amountDue || 0) > 0
					? `Open balance $${Number(sale.amountDue || 0).toFixed(2)}`
					: "Order currently paid in full",
		amount: Number(sale.grandTotal || 0),
		date: sale.createdAt.toISOString(),
		status: sale.type,
		orderId: sale.orderId,
	}));

	const transactionActivity: CustomerOverviewActivity[] =
		recentTransactions.map((transaction) => {
			const relatedOrderIds = transaction.salesPayments
				.map((payment) => payment.order?.orderId)
				.filter(Boolean) as string[];
			const paymentTotal = transaction.salesPayments.length
				? sum(transaction.salesPayments, "amount")
				: Number(transaction.amount || 0);
			const latestHistory = transaction.history[0];
			const isCancelled =
				transaction.status === "CANCELED" ||
				latestHistory?.status === "CANCELED";
			const isRefund = paymentTotal < 0;
			const type = isCancelled
				? "payment_cancelled"
				: isRefund
					? "refund"
					: transaction.paymentMethod === "wallet" &&
							transaction.salesPayments.length === 0
						? "wallet"
						: "payment";
			const titleByType = {
				order: "Order updated",
				quote: "Quote updated",
				payment: "Payment received",
				refund: "Refund issued",
				wallet: "Wallet activity",
				payment_cancelled: "Payment cancelled",
			} as const;

			return {
				id: `txn-${transaction.id}`,
				type,
				title: titleByType[type],
				subtitle: relatedOrderIds.length
					? `Order ${relatedOrderIds.map((id) => `#${id}`).join(", ")}`
					: latestHistory?.reason ||
						transaction.paymentMethod ||
						"Account-level transaction",
				amount: paymentTotal,
				date: transaction.createdAt.toISOString(),
				status: transaction.status || null,
				orderId: relatedOrderIds[0] || null,
			};
		});

	return [...transactionActivity, ...saleActivity]
		.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
		.slice(0, 10);
}

function inferCustomerAccountHealth(args: {
	pendingPayment: number;
	walletBalance: number;
	pendingPaymentOrders: number;
	pendingDeliveryOrders: number;
}) {
	const {
		pendingPayment,
		walletBalance,
		pendingPaymentOrders,
		pendingDeliveryOrders,
	} = args;
	const netExposure = Math.max(pendingPayment - walletBalance, 0);
	const creditAvailable = Math.max(walletBalance - pendingPayment, 0);

	if (pendingPayment > 0 && walletBalance > 0) {
		return {
			status: "attention_needed",
			label: "Attention needed",
			description:
				"Open balances exist, but wallet credit can reduce follow-up friction.",
			nextAction:
				"Apply wallet credit first, then remind the customer about the remaining balance.",
			recommendedActions: [
				"Apply available wallet credit to the oldest open balance.",
				"Send a payment reminder for any remaining unpaid amount.",
			],
			netExposure,
			creditAvailable,
		};
	}

	if (pendingPayment > 0) {
		return {
			status: "attention_needed",
			label: "Payment follow-up",
			description: "The account has unpaid orders that still need collection.",
			nextAction:
				"Request payment on the oldest open order and track the customer's promise date.",
			recommendedActions: [
				"Send a payment reminder from the account workspace.",
				"Review payment conflicts in resolution center before contacting the customer.",
			],
			netExposure,
			creditAvailable,
		};
	}

	if (creditAvailable > 0) {
		return {
			status: "credit_available",
			label: "Credit available",
			description:
				"The customer has wallet funds or overpayment available for reuse.",
			nextAction:
				"Use available credit on the next invoice or confirm whether a refund is needed.",
			recommendedActions: [
				"Apply wallet balance to the next pending order when it appears.",
				"Confirm with the customer whether the credit should stay on account.",
			],
			netExposure,
			creditAvailable,
		};
	}

	if (pendingDeliveryOrders > 0) {
		return {
			status: "delivery_in_progress",
			label: "Delivery in progress",
			description:
				"Financials are healthy, but operational delivery follow-up is still open.",
			nextAction:
				"Track the remaining delivery work and keep the customer informed on timing.",
			recommendedActions: [
				"Review open delivery orders before the next customer touchpoint.",
			],
			netExposure,
			creditAvailable,
		};
	}

	return {
		status: "clear",
		label: "Account clear",
		description: "No open balance or usable credit needs immediate action.",
		nextAction:
			pendingPaymentOrders > 0
				? "Review account details for edge cases."
				: "Continue with regular customer follow-up and new sales activity.",
		recommendedActions: [
			"Use this account as a clean starting point for the next quote or order.",
		],
		netExposure,
		creditAvailable,
	};
}

async function getCustomerWorkspaceSales(
	ctx: TRPCContext,
	accountNo: string,
	salesType: "order" | "quote",
) {
	return ctx.db.salesOrders.findMany({
		where: buildCustomerSalesFilter(accountNo, salesType),
		orderBy: {
			createdAt: "desc",
		},
		take: 200,
		select: {
			id: true,
			orderId: true,
			slug: true,
			meta: true,
			amountDue: true,
			grandTotal: true,
			createdAt: true,
			status: true,
			customer: {
				select: {
					name: true,
					businessName: true,
					phoneNo: true,
					address: true,
				},
			},
			billingAddress: {
				select: {
					name: true,
					phoneNo: true,
					address1: true,
				},
			},
		},
	});
}

export async function getCustomers(ctx: TRPCContext, query: GetCustomers) {
	const { db } = ctx;
	const { response, searchMeta, where } = await composeQueryData(
		query,
		whereCustomer(query),
		db.customers,
	);
	const data = await db.customers.findMany({
		where,
		...searchMeta,
		include: {},
	});
	return await response(data.map((line) => line));
}

export async function createOrUpdateCustomer(
	ctx: TRPCContext,
	input: UpsertCustomerSchema,
) {
	return ctx.db.$transaction(async (tx) => {
		let customerId = input.id;
		const isBusiness = input.customerType === "Business";
		const customerData: any = {
			name: input.name || null,
			businessName: isBusiness ? input.businessName : null,
			phoneNo: input.phoneNo,
			phoneNo2: input.phoneNo2,
			email: input.email,
			address: input.address1,
			meta: {
				netTerm: input.netTerm,
			} as CustomerMeta,
			profile: input.profileId
				? {
						connect: {
							id: Number(input.profileId),
						},
					}
				: undefined,
			taxProfiles: input?.taxProfileId
				? input?.taxCode
					? {
							update: {
								where: {
									id: Number(input.taxProfileId),
								},
								data: {
									taxCode: input.taxCode,
								},
							},
						}
					: undefined
				: input?.taxCode
					? {
							create: {
								taxCode: input.taxCode,
							},
						}
					: undefined,
		};

		if (input.id) {
			await tx.customers.update({
				where: {
					id: input.id,
				},
				data: customerData,
			});
		} else {
			const customer = await tx.customers.create({
				data: customerData,
			});
			customerId = customer.id;
		}

		if (!customerId) {
			const nextCustomerId = await nextId(tx.customers);
			customerId = nextCustomerId;
		}

		if (input.taxProfileId && !input.taxCode) {
			await tx.customerTaxProfiles.update({
				where: {
					id: Number(input.taxProfileId),
				},
				data: {
					deletedAt: new Date(),
				},
			});
		}

		const addressData: any = {
			address1: input.address1,
			address2: input.address2,
			phoneNo2: input.phoneNo2,
			phoneNo: input.phoneNo,
			country: input.country,
			state: input.state,
			city: input.city,
			isPrimary: true,
			meta: {
				zip_code: input.zip_code,
				lat: input.lat,
				lng: input.lng,
				placeSearchText: input.formattedAddress,
			} as AddressBookMeta,
		};

		let addressId = input.addressId;
		if (addressId) {
			const existingPrimary = await tx.addressBooks.findFirst({
				where: {
					id: addressId,
					isPrimary: true,
				},
				select: {
					id: true,
				},
			});
			if (existingPrimary?.id) {
				const updated = await tx.addressBooks.update({
					where: { id: existingPrimary.id },
					data: addressData,
				});
				addressId = updated.id;
			} else {
				const created = await tx.addressBooks.create({
					data: {
						...addressData,
						customerId,
						isPrimary: true,
					},
				});
				addressId = created.id;
			}
		} else {
			const created = await tx.addressBooks.create({
				data: {
					...addressData,
					customerId,
					isPrimary: true,
				},
			});
			addressId = created.id;
		}

		return {
			customerId,
			addressId,
		};
	});
}

export async function createOrUpdateCustomerAddress(
	ctx: TRPCContext,
	input: UpsertCustomerSchema,
) {
	return ctx.db.$transaction(async (tx) => {
		let addressId = input.addressId;
		const customerId = input.customerId || input.id;
		if (!customerId) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Customer id is required for address update.",
			});
		}
		const name =
			input.customerType === "Business" ? input.businessName : input.name;
		const addressData: any = {
			name,
			phoneNo: input.phoneNo,
			phoneNo2: input.phoneNo2,
			email: input.email,
			address1: input.address1,
			city: input.city,
			state: input.state,
			country: input.country,
			address2: input.address2,
			meta: {
				zip_code: input.zip_code,
				lat: input.lat,
				lng: input.lng,
				placeSearchText: input.formattedAddress,
				placeId: input.placeId,
			} as AddressBookMeta,
			customer: {
				connect: {
					id: customerId,
				},
			},
		};

		if (addressId) {
			const ordersOnAddress = await tx.salesOrders.count({
				where: {
					OR: [
						{
							shippingAddressId: addressId,
						},
						{
							billingAddressId: addressId,
						},
					],
				},
			});
			if (ordersOnAddress > 0) addressId = undefined;
		}
		if (addressId) {
			const updated = await tx.addressBooks.update({
				where: {
					id: addressId,
				},
				data: addressData,
			});
			addressId = updated.id;
		} else {
			const created = await tx.addressBooks.create({
				data: addressData,
			});
			addressId = created.id;
		}

		return {
			customerId,
			addressId,
		};
	});
}
export async function searchCustomers(
	ctx: TRPCContext,
	query: SearchCustomersSchema,
) {
	const { db } = ctx;
	const searchTerm = query.query;

	if (!searchTerm) {
		return [];
	}

	const customers = await db.customers.findMany({
		where: {
			OR: [
				{
					name: {
						contains: searchTerm,
						// mode: 'insensitive',
					},
				},
				{
					businessName: {
						contains: searchTerm,
						// mode: 'insensitive',
					},
				},
				{
					phoneNo: {
						contains: searchTerm,
						// mode: 'insensitive',
					},
				},
				{
					email: {
						contains: searchTerm,
						// mode: 'insensitive',
					},
				},
			],
		},
		select: {
			id: true,
			name: true,
			businessName: true,
			phoneNo: true,
			email: true,
		},
		take: 10, // Limit results for performance
	});

	return customers;
}

export async function getCustomerDirectoryV2Summary(
	ctx: TRPCContext,
	_query: GetCustomerDirectoryV2SummarySchema,
) {
	const { db } = ctx;

	const [totalCustomers, businessCustomers, customersWithEmail, openQuotes] =
		await Promise.all([
			db.customers.count(),
			db.customers.count({
				where: {
					businessName: {
						not: null,
					},
				},
			}),
			db.customers.count({
				where: {
					email: {
						not: null,
					},
				},
			}),
			db.salesOrders.count({
				where: {
					deletedAt: null,
					type: "quote",
				},
			}),
		]);

	return {
		totalCustomers,
		businessCustomers,
		customersWithEmail,
		openQuotes,
	};
}

export async function getCustomerOverviewV2(
	ctx: TRPCContext,
	query: GetCustomerOverviewV2Schema,
) {
	const { db } = ctx;
	const accountNo = query.accountNo;
	const customer = await db.customers.findFirst({
		where: buildCustomerLookupWhere(accountNo),
		orderBy: {
			createdAt: "desc",
		},
		select: {
			id: true,
			name: true,
			businessName: true,
			phoneNo: true,
			phoneNo2: true,
			email: true,
			address: true,
			meta: true,
			profile: {
				select: {
					id: true,
					title: true,
				},
			},
			addressBooks: {
				where: {
					deletedAt: null,
				},
				orderBy: [
					{
						isPrimary: "desc",
					},
					{
						createdAt: "desc",
					},
				],
				select: {
					id: true,
					name: true,
					email: true,
					phoneNo: true,
					phoneNo2: true,
					address1: true,
					address2: true,
					city: true,
					state: true,
					country: true,
					isPrimary: true,
					meta: true,
				},
			},
		},
	});

	const [
		pendingPaymentOrders,
		wallet,
		orderRecords,
		quoteRecords,
		recentActivity,
	] = await Promise.all([
		getCustomerPendingSales(ctx, accountNo),
		getCustomerWallet(db, accountNo),
		getCustomerWorkspaceSales(ctx, accountNo, "order"),
		getCustomerWorkspaceSales(ctx, accountNo, "quote"),
		getCustomerRecentActivity(ctx, accountNo),
	]);

	const orders = orderRecords.map(mapCustomerWorkspaceItem);
	const quotes = quoteRecords.map(mapCustomerWorkspaceItem);
	const pendingPayment = sum(pendingPaymentOrders, "amountDue");
	const walletBalance = Number(wallet?.balance || 0);
	const pendingDeliveryOrders = orders.filter(
		(order) => order.status?.delivery?.status !== "completed",
	);
	const customerMeta = (customer?.meta || {}) as CustomerMeta;
	const primaryAddress =
		customer?.addressBooks.find((address) => address.isPrimary) ||
		customer?.addressBooks[0] ||
		null;
	const secondaryAddresses =
		customer?.addressBooks.filter(
			(address) => address.id !== primaryAddress?.id,
		) || [];
	const displayName =
		customer?.businessName ||
		customer?.name ||
		pendingPaymentOrders[0]?.customerName ||
		accountNo;
	const health = inferCustomerAccountHealth({
		pendingPayment,
		walletBalance,
		pendingPaymentOrders: pendingPaymentOrders.length,
		pendingDeliveryOrders: pendingDeliveryOrders.length,
	});

	return {
		accountNo,
		customer: {
			id: customer?.id || null,
			name: customer?.name || null,
			businessName: customer?.businessName || null,
			displayName,
			email: customer?.email || pendingPaymentOrders[0]?.customerEmail || null,
			phoneNo: customer?.phoneNo || null,
			phoneNo2: customer?.phoneNo2 || null,
			address: customer?.address || null,
			profileName: customer?.profile?.title || null,
			profileId: customer?.profile?.id || null,
			netTerm: customerMeta?.netTerm || null,
			isBusiness: !!customer?.businessName,
		},
		addresses: {
			primary: primaryAddress,
			secondary: secondaryAddresses,
		},
		walletBalance,
		health,
		general: {
			pendingPayment,
			pendingPaymentOrders,
			pendingDeliveryOrders,
			totalSalesCount: orders.length,
			totalQuotesCount: quotes.length,
			totalSalesValue: orders.reduce(
				(acc, order) => acc + Number(order.invoice.total || 0),
				0,
			),
			totalQuotesValue: quotes.reduce(
				(acc, quote) => acc + Number(quote.invoice.total || 0),
				0,
			),
		},
		salesWorkspace: {
			orders,
			quotes,
		},
		recentActivity,
	};
}

export const customerInfoSearchSchema = z.object({
	q: z.string().optional().nullable(),
	customerId: z.number().optional().nullable(),
	type: z.enum(["customer", "address"]),
});
export type CustomerInfoSearch = z.infer<typeof customerInfoSearchSchema>;
export async function customerInfoSearch(
	ctx: TRPCContext,
	{ q, type, customerId }: CustomerInfoSearch,
) {
	const { db } = ctx;

	const contains = !q ? undefined : { contains: q };
	if (customerId) {
		const addresses = await db.addressBooks.findMany({
			where: {
				customerId,
				OR: contains
					? [
							{
								address1: contains,
							},
							{
								email: contains,
							},
							{
								phoneNo: contains,
							},
						]
					: undefined,
			},
		});
		return addresses.map((address) => {
			const meta: AddressBookMeta = address?.meta as any;

			return {
				customerId: address?.customerId,
				name: address?.name,
				address: address?.address1,
				phone: address?.phoneNo,
				addressId: address?.id,
				state: address?.state,
				city: address?.city,
				email: address.email,
				zipCode: meta?.zip_code,
			};
		});
	}
	const customers = await db.customers.findMany({
		take: q ? 15 : 5,
		distinct: ["name"],
		where: !q
			? undefined
			: {
					OR: [
						{
							name: contains,
						},
						{
							phoneNo: contains,
						},
						{
							email: contains,
						},
						{
							address: contains,
						},
					],
				},
		select: {
			id: true,
			name: true,
			businessName: true,
			phoneNo: true,
			email: true,
			address: true,
			profile: {
				select: {
					title: true,
					id: true,
				},
			},
			taxProfiles: {
				select: {
					tax: true,
				},
			},
			addressBooks: {
				where: {
					AND: [
						{
							OR: [
								{
									isPrimary: true,
								},
								{
									AND: [
										{
											isPrimary: false,
										},
									],
								},
							],
						},
						{
							address1: contains,
							address2: contains,
						},
					],
				},
				select: {
					id: true,
					meta: true,
					billingOrders: {
						take: 1,
						orderBy: {
							createdAt: "desc",
						},
						where: {
							taxes: {
								some: {
									deletedAt: null,
								},
							},
						},
						select: {
							salesProfile: true,

							taxes: {
								take: 1,
								select: {
									taxConfig: {
										select: {
											title: true,
											taxCode: true,
										},
									},
								},
							},
						},
					},
				},
			},
		},
	});
	return customers.map((customer) => {
		const [address] = customer?.addressBooks;
		const addressMeta = address?.meta as any as AddressBookMeta;
		const [taxProfile] = customer?.taxProfiles;
		return {
			customerId: customer?.id,
			name: customer?.name || customer?.businessName,
			address: customer?.address,
			phone: customer?.phoneNo,
			addressId: address?.id,
			taxName: taxProfile?.tax?.title,
			taxCode: taxProfile?.tax?.taxCode,
			profileName: customer?.profile?.title,
			profileId: customer?.profile?.id,
			email: customer.email,
			zipCode: addressMeta?.zip_code,
		};
	});
}

export const getSalesCustomerSchema = z.object({
	customerId: z.number(),
	billingId: z.number().optional().nullable(),
	shippingId: z.number().optional().nullable(),
});
export type GetSalesCustomerSchema = z.infer<typeof getSalesCustomerSchema>;

export async function getSalesCustomer(
	ctx: TRPCContext,
	query: GetSalesCustomerSchema,
) {
	const { db } = ctx;
	const { customerId, shippingId, billingId } = query;
	const customer = await db.customers.findUniqueOrThrow({
		where: {
			id: customerId,
		},
		include: {
			taxProfiles: {
				select: {
					taxCode: true,
					id: true,
				},
			},
			profile: true,
			addressBooks: {
				where: {
					OR: [
						{
							isPrimary: true,
						},
						{
							id: shippingId || undefined,
						},
						{
							id: billingId || undefined,
						},
					],
				},
			},
		},
	});
	const billing = customer?.addressBooks?.find(
		(a) => a.id == billingId || a.isPrimary,
	);
	const shipping = customer?.addressBooks?.find((a) => a.id == shippingId);
	const customerMeta = customer?.meta as any as CustomerMeta;
	const [taxProfile] = customer?.taxProfiles;
	return {
		customerId: customer?.id,
		profileId: customer?.customerTypeId,
		customerData: [
			[customer?.name || customer?.businessName, customer?.phoneNo]
				?.filter(Boolean)
				.join(", "),
			customer?.email,
		].filter(Boolean),
		customer: {
			name: customer?.name || customer?.businessName,
			phone: customer?.phoneNo,
			email: customer?.email,
			address: billing,
		},
		shippingId,
		billingId,
		netTerm: customerMeta?.netTerm,
		shipping: {
			id: shipping?.id,
			lines:
				shipping?.id == billing?.id || !shipping?.id
					? ["same as billing"]
					: salesAddressLines(shipping),
		},
		billing: {
			lines: salesAddressLines(billing!, customer),
			id: billing?.id,
		},
		taxCode: taxProfile?.taxCode,
		taxProfileId: taxProfile?.id,
	};
}

/*
getCustomerPayPortal: publicProcedure
      .input(getCustomerPayPortalSchema)
      .query(async (props) => {
        return getCustomerPayPortal(props.ctx, props.input);
      }),
*/
export const getCustomerPayPortalSchema = z.object({
	accountNo: z.string(),
});
export type GetCustomerPayPortalSchema = z.infer<
	typeof getCustomerPayPortalSchema
>;

export async function getCustomerPayPortal(
	ctx: TRPCContext,
	query: GetCustomerPayPortalSchema,
) {
	const { db } = ctx;
	const pendingSales = await getCustomerPendingSales(ctx, query.accountNo);
	const wallet = await getCustomerWallet(db, query.accountNo);
	const totalPayable = sum(pendingSales, "amountDue");
	const lastTerminalId = (
		await db.squarePayments.findFirst({
			where: {
				terminalId: {
					not: null,
				},
				createdById: ctx.userId,
			},
			orderBy: {
				createdAt: "desc",
			},
			select: {
				terminalId: true,
			},
		})?.[0]
	)?.terminalId;
	const { terminals, errors: terminalError } = await getSquareDevices();
	// const byLocations = await fetchDevicesByLocations();
	// return {};
	return {
		pendingSales,
		totalPayable,
		terminals,
		error: {
			terminal: terminalError,
		},
		wallet,
		walletBalance: wallet.balance,
		// byLocations,
		lastTerminalId,
	};
}
export async function getCustomerPendingSales(ctx: TRPCContext, accountNo) {
	const { db } = ctx;
	const query: SalesQueryParamsSchema = {
		invoice: "pending",
		// "sales.type": "order",
		salesType: "order",
	};
	const [p1, p2] = String(accountNo || "").split("-");
	if (p1 === "cust") query.customerId = Number(p2);
	else query.phone = accountNo;
	const where = whereSales(query);
	const ls = await db.salesOrders.findMany({
		where,
		orderBy: {
			createdAt: "desc",
		},
		select: {
			amountDue: true,
			orderId: true,
			id: true,
			meta: true,
			grandTotal: true,
			createdAt: true,
			billingAddress: {
				select: {
					name: true,
					email: true,
				},
			},
			customer: {
				select: {
					name: true,
					businessName: true,
					email: true,
				},
			},
		},
	});
	return ls.map(({ customer, billingAddress: bAddr, ...rest }) => ({
		...rest,
		paymentMethod: resolvePendingSalePaymentMethod(rest.meta),
		customerName: bAddr?.name || customer?.businessName || customer?.name,
		customerEmail: bAddr?.email || customer?.email, // || customer?.name,
	}));
}

function resolvePendingSalePaymentMethod(meta: unknown) {
	const record =
		meta && typeof meta === "object" && !Array.isArray(meta)
			? (meta as Record<string, unknown>)
			: null;
	const newSalesForm =
		record?.newSalesForm &&
		typeof record.newSalesForm === "object" &&
		!Array.isArray(record.newSalesForm)
			? (record.newSalesForm as Record<string, unknown>)
			: null;
	const form =
		newSalesForm?.form &&
		typeof newSalesForm.form === "object" &&
		!Array.isArray(newSalesForm.form)
			? (newSalesForm.form as Record<string, unknown>)
			: null;
	const paymentMethod = form?.paymentMethod;
	const legacyPaymentMethod = record?.payment_option || record?.paymentOption;

	if (typeof paymentMethod === "string") return paymentMethod;
	return typeof legacyPaymentMethod === "string" ? legacyPaymentMethod : null;
}

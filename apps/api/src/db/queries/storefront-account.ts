import type {
	StorefrontAddressInput,
	StorefrontOrderListInput,
	StorefrontProfileInput,
} from "@api/schemas/storefront-account";
import type { TRPCContext } from "@api/trpc/init";
import { resolveSalesDocumentAccess } from "@api/utils/sales-document-access";
import { TRPCError } from "@trpc/server";

type CustomerStorefrontContext = TRPCContext & {
	userId: number;
	customerId: number;
};

function safeRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function toIso(value: Date | null | undefined) {
	return value?.toISOString() || null;
}

function customerOrderStatus(order: {
	status: string | null;
	prodStatus: string | null;
	deliveredAt: Date | null;
	deliveries: Array<{ status: string | null; deliveredAt: Date | null }>;
}) {
	const raw = `${order.status || ""} ${order.prodStatus || ""}`.toLowerCase();
	if (raw.includes("cancel") || raw.includes("refund"))
		return "cancelled" as const;
	if (
		order.deliveredAt ||
		order.deliveries.some(
			(delivery) =>
				delivery.deliveredAt ||
				`${delivery.status || ""}`.toLowerCase().includes("delivered"),
		)
	) {
		return "delivered" as const;
	}
	if (
		order.deliveries.some((delivery) =>
			/(dispatch|transit|shipped|out for delivery)/i.test(
				delivery.status || "",
			),
		)
	) {
		return "in-transit" as const;
	}
	return "processing" as const;
}

function customerOrderStatusLabel(
	status: ReturnType<typeof customerOrderStatus>,
) {
	switch (status) {
		case "in-transit":
			return "In transit";
		case "delivered":
			return "Delivered";
		case "cancelled":
			return "Cancelled";
		default:
			return "Processing";
	}
}

const orderListSelect = {
	id: true,
	orderId: true,
	slug: true,
	status: true,
	prodStatus: true,
	invoiceStatus: true,
	salesChannel: true,
	createdAt: true,
	updatedAt: true,
	deliveredAt: true,
	grandTotal: true,
	amountDue: true,
	deliveryOption: true,
	items: {
		where: { deletedAt: null },
		orderBy: { id: "asc" as const },
		select: {
			id: true,
			description: true,
			qty: true,
			price: true,
			total: true,
		},
	},
	deliveries: {
		where: { deletedAt: null },
		orderBy: { createdAt: "desc" as const },
		select: {
			id: true,
			status: true,
			dueDate: true,
			deliveredAt: true,
		},
	},
} as const;

function mapOrderListItem(
	order: Awaited<
		ReturnType<CustomerStorefrontContext["db"]["salesOrders"]["findFirst"]>
	> &
		Record<string, unknown>,
) {
	const record = order as any;
	const status = customerOrderStatus(record);
	return {
		id: record.id as number,
		orderId: record.orderId as string,
		slug: record.slug as string,
		status,
		statusLabel: customerOrderStatusLabel(status),
		officeStatus: record.status as string | null,
		productionStatus: record.prodStatus as string | null,
		invoiceStatus: record.invoiceStatus as string | null,
		salesChannel: record.salesChannel as string | null,
		createdAt: toIso(record.createdAt),
		updatedAt: toIso(record.updatedAt),
		deliveredAt: toIso(record.deliveredAt),
		grandTotal: Number(record.grandTotal || 0),
		amountDue: Number(record.amountDue || 0),
		deliveryOption: record.deliveryOption as string | null,
		itemCount: (record.items as Array<unknown>).length,
		items: (record.items as Array<any>).map((item) => ({
			id: item.id,
			description: item.description || "Configured item",
			quantity: Number(item.qty || 0),
			unitPrice: Number(item.price || 0),
			total: Number(item.total || 0),
		})),
	};
}

export async function getStorefrontAccount(ctx: CustomerStorefrontContext) {
	const customer = await ctx.db.customers.findFirst({
		where: {
			id: ctx.customerId,
			userId: ctx.userId,
			deletedAt: null,
		},
		include: {
			user: {
				select: {
					email: true,
					emailVerifiedAt: true,
				},
			},
			profile: { select: { id: true, title: true } },
			addressBooks: {
				where: { deletedAt: null },
				orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
			},
			_count: { select: { salesOrders: true } },
		},
	});
	if (!customer) throw new TRPCError({ code: "NOT_FOUND" });
	return {
		id: customer.id,
		name: customer.name,
		businessName: customer.businessName,
		email: customer.user?.email || customer.email,
		emailVerified: Boolean(customer.user?.emailVerifiedAt),
		phoneNo: customer.phoneNo,
		profile: customer.profile,
		orderCount: customer._count.salesOrders,
		addresses: customer.addressBooks.map((address) => ({
			id: address.id,
			name: address.name,
			email: address.email,
			phone: address.phoneNo,
			address1: address.address1,
			address2: address.address2,
			city: address.city,
			state: address.state,
			country: address.country,
			postalCode: String(safeRecord(address.meta).zip_code || ""),
			isPrimary: Boolean(address.isPrimary),
		})),
	};
}

export async function updateStorefrontProfile(
	ctx: CustomerStorefrontContext,
	input: StorefrontProfileInput,
) {
	if (!input.name && !input.businessName) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Enter a name or business name.",
		});
	}
	if (input.phoneNo) {
		const conflict = await ctx.db.customers.findFirst({
			where: {
				phoneNo: input.phoneNo,
				id: { not: ctx.customerId },
				deletedAt: null,
			},
			select: { id: true },
		});
		if (conflict) {
			throw new TRPCError({
				code: "CONFLICT",
				message: "That phone number is already in use.",
			});
		}
	}
	await ctx.db.$transaction([
		ctx.db.customers.update({
			where: { id: ctx.customerId },
			data: {
				name: input.name,
				businessName: input.businessName,
				phoneNo: input.phoneNo,
			},
		}),
		ctx.db.users.update({
			where: { id: ctx.userId },
			data: {
				name: input.businessName || input.name,
				phoneNo: input.phoneNo,
			},
		}),
	]);
	return getStorefrontAccount(ctx);
}

export async function saveStorefrontAddress(
	ctx: CustomerStorefrontContext,
	input: StorefrontAddressInput,
) {
	if (input.id) {
		const owned = await ctx.db.addressBooks.findFirst({
			where: {
				id: input.id,
				customerId: ctx.customerId,
				deletedAt: null,
			},
			select: { id: true },
		});
		if (!owned) throw new TRPCError({ code: "NOT_FOUND" });
	}
	await ctx.db.$transaction(async (tx) => {
		if (input.isPrimary) {
			await tx.addressBooks.updateMany({
				where: { customerId: ctx.customerId, deletedAt: null },
				data: { isPrimary: false },
			});
		}
		const data = {
			customerId: ctx.customerId,
			name: input.name,
			email: input.email,
			phoneNo: input.phone,
			address1: input.address1,
			address2: input.address2 || null,
			city: input.city,
			state: input.state,
			country: input.country,
			isPrimary: input.isPrimary,
			meta: { zip_code: input.postalCode },
			deletedAt: null,
		};
		if (input.id) {
			await tx.addressBooks.update({ where: { id: input.id }, data });
		} else {
			const addressCount = await tx.addressBooks.count({
				where: { customerId: ctx.customerId, deletedAt: null },
			});
			await tx.addressBooks.create({
				data: { ...data, isPrimary: input.isPrimary || addressCount === 0 },
			});
		}
	});
	return getStorefrontAccount(ctx);
}

export async function deleteStorefrontAddress(
	ctx: CustomerStorefrontContext,
	id: number,
) {
	const address = await ctx.db.addressBooks.findFirst({
		where: { id, customerId: ctx.customerId, deletedAt: null },
		select: {
			id: true,
			isPrimary: true,
			_count: {
				select: { billingOrders: true, shippingOrders: true },
			},
		},
	});
	if (!address) throw new TRPCError({ code: "NOT_FOUND" });
	if (address._count.billingOrders || address._count.shippingOrders) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "An address used by an order cannot be deleted.",
		});
	}
	await ctx.db.addressBooks.update({
		where: { id },
		data: { deletedAt: new Date(), isPrimary: false },
	});
	if (address.isPrimary) {
		const next = await ctx.db.addressBooks.findFirst({
			where: { customerId: ctx.customerId, deletedAt: null },
			orderBy: { createdAt: "desc" },
			select: { id: true },
		});
		if (next) {
			await ctx.db.addressBooks.update({
				where: { id: next.id },
				data: { isPrimary: true },
			});
		}
	}
	return { ok: true };
}

function orderStatusWhere(status: StorefrontOrderListInput["status"]) {
	switch (status) {
		case "delivered":
			return {
				OR: [
					{ deliveredAt: { not: null } },
					{ deliveries: { some: { deliveredAt: { not: null } } } },
				],
			};
		case "cancelled":
			return { status: { contains: "cancel" } };
		case "in-transit":
			return {
				deliveries: {
					some: {
						status: { in: ["dispatch", "in-transit", "shipped"] },
						deliveredAt: null,
					},
				},
			};
		case "processing":
			return {
				deliveredAt: null,
				NOT: [{ status: { contains: "cancel" } }],
			};
		default:
			return {};
	}
}

export async function listStorefrontOrders(
	ctx: CustomerStorefrontContext,
	input: StorefrontOrderListInput,
) {
	const query = input.query?.trim();
	const rows = await ctx.db.salesOrders.findMany({
		where: {
			customerId: ctx.customerId,
			type: "order",
			deletedAt: null,
			...(query
				? {
						OR: [
							{ orderId: { contains: query } },
							{ items: { some: { description: { contains: query } } } },
						],
					}
				: {}),
			...orderStatusWhere(input.status),
		},
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		take: input.limit + 1,
		...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
		select: orderListSelect,
	});
	const hasMore = rows.length > input.limit;
	const page = hasMore ? rows.slice(0, input.limit) : rows;
	return {
		items: page.map((order) => mapOrderListItem(order as any)),
		nextCursor: hasMore ? page.at(-1)?.id || null : null,
	};
}

async function findOwnedStorefrontOrder(
	ctx: CustomerStorefrontContext,
	orderId: string,
) {
	const order = await ctx.db.salesOrders.findFirst({
		where: {
			customerId: ctx.customerId,
			deletedAt: null,
			OR: [{ orderId }, { slug: orderId }],
		},
		include: {
			items: {
				where: { deletedAt: null },
				orderBy: { id: "asc" },
				include: {
					formSteps: {
						where: { deletedAt: null },
						orderBy: { id: "asc" },
						include: {
							step: { select: { title: true, uid: true } },
							component: { select: { name: true, uid: true } },
						},
					},
					salesDoors: {
						where: { deletedAt: null },
						orderBy: { id: "asc" },
						select: {
							id: true,
							dimension: true,
							swing: true,
							lhQty: true,
							rhQty: true,
							totalQty: true,
							unitPrice: true,
							lineTotal: true,
						},
					},
					shelfItems: {
						where: { deletedAt: null },
						orderBy: { id: "asc" },
					},
				},
			},
			billingAddress: true,
			shippingAddress: true,
			deliveries: {
				where: { deletedAt: null },
				orderBy: { createdAt: "asc" },
			},
			payments: {
				where: { deletedAt: null },
				orderBy: { createdAt: "asc" },
				select: {
					id: true,
					amount: true,
					status: true,
					origin: true,
					createdAt: true,
				},
			},
			history: {
				where: { deletedAt: null },
				orderBy: { createdAt: "asc" },
				select: { id: true, name: true, createdAt: true },
			},
			extraCosts: true,
		},
	});
	if (!order) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Order not found.",
		});
	}
	return order;
}

function mapAddress(address: any) {
	if (!address) return null;
	return {
		name: address.name,
		email: address.email,
		phone: address.phoneNo,
		address1: address.address1,
		address2: address.address2,
		city: address.city,
		state: address.state,
		country: address.country,
		postalCode: String(safeRecord(address.meta).zip_code || ""),
	};
}

export async function getStorefrontOrder(
	ctx: CustomerStorefrontContext,
	orderId: string,
) {
	const order = await findOwnedStorefrontOrder(ctx, orderId);
	const summary = mapOrderListItem(order as any);
	const timeline = [
		{
			key: "placed",
			title: "Order placed",
			description: "Your order entered GND's sales workflow.",
			at: toIso(order.createdAt),
		},
		...order.payments.map((payment) => ({
			key: `payment-${payment.id}`,
			title: /paid|success|complete/i.test(payment.status || "")
				? "Payment received"
				: "Payment updated",
			description: `$${Number(payment.amount || 0).toFixed(2)} via ${
				payment.origin || "payment"
			}.`,
			at: toIso(payment.createdAt),
		})),
		...order.deliveries.map((delivery) => ({
			key: `delivery-${delivery.id}`,
			title: delivery.deliveredAt
				? "Delivered"
				: delivery.status || "Fulfillment updated",
			description:
				delivery.deliveryMode === "pickup"
					? "Pickup status updated."
					: "Delivery status updated.",
			at: toIso(delivery.deliveredAt || delivery.createdAt),
		})),
	].filter((event) => Boolean(event.at));
	return {
		...summary,
		subTotal: Number(order.subTotal || 0),
		tax: Number(order.tax || 0),
		taxPercentage: Number(order.taxPercentage || 0),
		billingAddress: mapAddress(order.billingAddress),
		shippingAddress: mapAddress(order.shippingAddress),
		extraCosts: order.extraCosts.map((cost) => ({
			id: cost.id,
			label: cost.label,
			type: cost.type,
			amount: Number(cost.amount || 0),
			tax: Number(cost.tax || 0),
			total: Number(cost.totalAmount || cost.amount || 0),
		})),
		payments: order.payments.map((payment) => ({
			...payment,
			amount: Number(payment.amount || 0),
			createdAt: toIso(payment.createdAt),
		})),
		timeline,
		items: order.items.map((item) => ({
			id: item.id,
			description: item.description || "Configured item",
			quantity: Number(item.qty || 0),
			unitPrice: Number(item.price || 0),
			total: Number(item.total || 0),
			selections: item.formSteps.map((selection) => ({
				stepUid: selection.step.uid,
				step: selection.step.title || "Option",
				componentUid: selection.component?.uid || null,
				value:
					selection.component?.name ||
					selection.value ||
					"Configured selection",
				quantity: Number(selection.qty || 0),
			})),
			doors: item.salesDoors.map((door) => ({
				...door,
				lhQty: Number(door.lhQty || 0),
				rhQty: Number(door.rhQty || 0),
				totalQty: Number(door.totalQty || 0),
				unitPrice: Number(door.unitPrice || 0),
				lineTotal: Number(door.lineTotal || 0),
			})),
			shelfItems: item.shelfItems.map((shelf: any) => ({
				id: shelf.id,
				description: shelf.description || shelf.product || "Shelf item",
				quantity: Number(shelf.qty || 0),
				unitPrice: Number(shelf.unitPrice || shelf.price || 0),
				total: Number(shelf.totalPrice || shelf.total || 0),
			})),
		})),
	};
}

export async function createStorefrontInvoiceAccess(
	ctx: CustomerStorefrontContext,
	orderId: string,
) {
	const order = await findOwnedStorefrontOrder(ctx, orderId);
	const baseUrl = (
		process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3010"
	).replace(/\/$/, "");
	const access = await resolveSalesDocumentAccess({
		db: ctx.db,
		salesIds: [order.id],
		mode: "invoice",
		baseUrl,
	});
	return {
		previewUrl: access.previewUrl,
		downloadUrl: access.downloadUrl,
		expiresAt: access.expiresAt,
	};
}

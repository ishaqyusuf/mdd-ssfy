import {
	buildFullPaymentToken,
	createSalesCheckoutLink,
	verifyPayment,
} from "@api/db/queries/checkout";
import {
	deriveNewSalesFormSettings,
	saveStorefrontSalesOrder,
} from "@api/db/queries/new-sales-form";
import {
	getOrCreateStorefrontCollection,
	storefrontConfigurationInputSchema,
	validateAndPriceStorefrontConfiguration,
} from "@api/db/queries/storefront-commerce";
import type {
	CreateStorefrontCheckoutInput,
	StorefrontAddressInput,
} from "@api/schemas/storefront-checkout";
import type { TRPCContext } from "@api/trpc/init";
import type { Prisma } from "@gnd/db";
import {
	addMoney,
	calculatePaymentChannelCharge,
	multiplyMoney,
	roundMoney,
} from "@gnd/sales/payment-system";
import { salesFormLineItemSchema } from "@gnd/sales/sales-form";
import { getCustomerWallet } from "@gnd/sales/wallet";
import { tasks } from "@trigger.dev/sdk/v3";
import { TRPCError } from "@trpc/server";

type CustomerStorefrontContext = TRPCContext & {
	userId: number;
	customerId: number;
};

type StorefrontSettings = {
	pickupEnabled: boolean;
	deliveryEnabled: boolean;
	deliveryFlatRate: number;
	freeDeliveryThreshold: number | null;
};

function safeRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

async function loadStorefrontSettings(
	ctx: CustomerStorefrontContext,
): Promise<StorefrontSettings> {
	const setting = await ctx.db.settings.findFirst({
		where: { type: "storefront-settings", deletedAt: null },
		orderBy: { id: "desc" },
		select: { meta: true },
	});
	const meta = safeRecord(setting?.meta);
	const checkout = safeRecord(meta.checkout);
	const flatRate = Math.max(0, Number(checkout.deliveryFlatRate || 0));
	const freeThreshold = Number(checkout.freeDeliveryThreshold || 0);
	return {
		pickupEnabled: checkout.pickupEnabled !== false,
		deliveryEnabled: checkout.deliveryEnabled === true,
		deliveryFlatRate: roundMoney(flatRate),
		freeDeliveryThreshold:
			Number.isFinite(freeThreshold) && freeThreshold > 0
				? roundMoney(freeThreshold)
				: null,
	};
}

async function loadCheckoutCustomer(ctx: CustomerStorefrontContext) {
	const customer = await ctx.db.customers.findFirst({
		where: {
			id: ctx.customerId,
			userId: ctx.userId,
			deletedAt: null,
		},
		include: {
			profile: { select: { id: true, title: true } },
			addressBooks: {
				where: { deletedAt: null },
				orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
			},
			taxProfiles: {
				where: { deletedAt: null },
				take: 1,
				include: { tax: true },
			},
		},
	});
	if (!customer) throw new TRPCError({ code: "UNAUTHORIZED" });
	return customer;
}

async function persistCustomerAddress(
	ctx: CustomerStorefrontContext,
	input: StorefrontAddressInput,
	isPrimary: boolean,
) {
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
		isPrimary,
		meta: { zip_code: input.postalCode },
		deletedAt: null,
	};
	if (input.id) {
		const existing = await ctx.db.addressBooks.findFirst({
			where: {
				id: input.id,
				customerId: ctx.customerId,
				deletedAt: null,
			},
			select: { id: true },
		});
		if (!existing) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Address not found.",
			});
		}
		return ctx.db.addressBooks.update({
			where: { id: existing.id },
			data,
		});
	}
	return ctx.db.addressBooks.create({ data });
}

async function loadCartForCheckout(
	ctx: CustomerStorefrontContext,
	collectionId?: string,
) {
	const collection = collectionId
		? await ctx.db.storefrontCommerceCollection.findFirst({
				where: {
					id: collectionId,
					ownerUserId: ctx.userId,
					type: "CART",
					status: { in: ["ACTIVE", "CHECKOUT"] },
				},
				select: { id: true },
			})
		: await getOrCreateStorefrontCollection(ctx, "CART");
	if (!collection) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Checkout cart not found.",
		});
	}
	const cart = await ctx.db.storefrontCommerceCollection.findUnique({
		where: { id: collection.id },
		include: { lines: { orderBy: { createdAt: "asc" } } },
	});
	if (!cart?.lines.length) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "Your cart is empty.",
		});
	}
	return cart;
}

export async function getStorefrontCheckoutState(
	ctx: CustomerStorefrontContext,
) {
	const [customer, settings, cart, salesSetting] = await Promise.all([
		loadCheckoutCustomer(ctx),
		loadStorefrontSettings(ctx),
		loadCartForCheckout(ctx),
		ctx.db.settings.findFirst({
			where: { type: "sales-settings", deletedAt: null },
			orderBy: { id: "desc" },
			select: { meta: true },
		}),
	]);
	const salesSettings = deriveNewSalesFormSettings(salesSetting?.meta);
	return {
		customer: {
			id: customer.id,
			name: customer.name,
			businessName: customer.businessName,
			email: customer.email,
			phoneNo: customer.phoneNo,
			profile: customer.profile,
		},
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
			isPrimary: address.isPrimary,
		})),
		fulfillment: settings,
		pricing: {
			taxRate: Math.max(
				0,
				Number(customer.taxProfiles[0]?.tax?.percentage || 0),
			),
			cardFeePercentage: salesSettings.cccPercentage,
		},
		cartVersion: cart.version,
	};
}

export async function createStorefrontCheckout(
	ctx: CustomerStorefrontContext,
	input: CreateStorefrontCheckoutInput,
) {
	const existing = await ctx.db.storefrontCheckout.findUnique({
		where: { idempotencyKey: input.idempotencyKey },
	});
	if (existing) {
		if (existing.ownerUserId !== ctx.userId) {
			throw new TRPCError({ code: "FORBIDDEN" });
		}
		const totals = safeRecord(existing.totals);
		if (existing.status === "PAYMENT_PENDING" && totals.paymentUrl) {
			return {
				checkoutId: existing.id,
				salesOrderId: existing.salesOrderId,
				paymentUrl: String(totals.paymentUrl),
			};
		}
		if (existing.status === "PAID") {
			const appUrl = (
				process.env.NEXT_PUBLIC_APP_URL ||
				process.env.STOREFRONT_APP_URL ||
				"http://localhost:3018"
			).replace(/\/$/, "");
			return {
				checkoutId: existing.id,
				salesOrderId: existing.salesOrderId,
				paymentUrl: `${appUrl}/checkout/complete?checkoutId=${existing.id}`,
			};
		}
	}

	const [customer, settings, cart, salesSetting] = await Promise.all([
		loadCheckoutCustomer(ctx),
		loadStorefrontSettings(ctx),
		loadCartForCheckout(ctx, existing?.collectionId),
		ctx.db.settings.findFirst({
			where: { type: "sales-settings", deletedAt: null },
			orderBy: { id: "desc" },
			select: { meta: true },
		}),
	]);
	const salesSettings = deriveNewSalesFormSettings(salesSetting?.meta);
	if (cart.version !== input.cartVersion) {
		throw new TRPCError({
			code: "CONFLICT",
			message: "Your cart changed. Review it before checking out.",
		});
	}
	if (input.fulfillment === "pickup" && !settings.pickupEnabled) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "Pickup is not available.",
		});
	}
	if (input.fulfillment === "delivery" && !settings.deliveryEnabled) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "Delivery is not available for online checkout.",
		});
	}

	type RepricedConfiguration = Awaited<
		ReturnType<typeof validateAndPriceStorefrontConfiguration>
	>;
	const repriced: Array<{
		line: (typeof cart.lines)[number];
		current: RepricedConfiguration;
	}> = [];
	let changed = false;
	for (const line of cart.lines) {
		if (!line.offerId) {
			throw new TRPCError({
				code: "PRECONDITION_FAILED",
				message: "A cart item is no longer available.",
			});
		}
		const current = await validateAndPriceStorefrontConfiguration(
			ctx,
			storefrontConfigurationInputSchema.parse({
				offerId: line.offerId,
				quantity: Number(line.quantity),
				configuration: line.configuration,
			}),
			{ requireWorkflowConfiguration: true },
		);
		if (
			Math.abs(Number(line.lineTotal) - current.lineTotal) >= 0.01 ||
			line.configurationVersion !== current.offer.configurationVersion
		) {
			changed = true;
		}
		repriced.push({ line, current });
	}
	if (changed) {
		await ctx.db.$transaction(async (tx) => {
			for (const { line, current } of repriced) {
				await tx.storefrontCommerceLine.update({
					where: { id: line.id },
					data: {
						configuration: current.configuration as Prisma.InputJsonValue,
						configurationHash: current.configurationHash,
						configurationVersion: current.offer.configurationVersion,
						pricingSnapshot: current.pricingSnapshot as Prisma.InputJsonValue,
						unitPrice: current.unitPrice,
						lineTotal: current.lineTotal,
						validationStatus: "PRICE_CHANGED",
						validationMessage: "Price updated before checkout.",
						lastValidatedAt: new Date(),
					},
				});
			}
			await tx.storefrontCommerceCollection.update({
				where: { id: cart.id },
				data: { version: { increment: 1 } },
			});
		});
		throw new TRPCError({
			code: "CONFLICT",
			message: "One or more prices changed. Review the updated cart.",
		});
	}

	const subtotal = addMoney(
		...repriced.map(({ current }) => current.lineTotal),
	);
	const deliveryAmount =
		input.fulfillment === "delivery" &&
		!(
			settings.freeDeliveryThreshold &&
			subtotal >= settings.freeDeliveryThreshold
		)
			? settings.deliveryFlatRate
			: 0;
	const taxProfile = customer.taxProfiles[0]?.tax || null;
	const taxRate = Math.max(0, Number(taxProfile?.percentage || 0));
	const tax = roundMoney(multiplyMoney(subtotal, taxRate / 100));
	const total = addMoney(subtotal, deliveryAmount, tax);
	const paymentCharge = calculatePaymentChannelCharge({
		paymentMethod: "link",
		paymentAmount: total,
		cccPercentage: salesSettings.cccPercentage,
	});
	const shipping = await persistCustomerAddress(
		ctx,
		input.shippingAddress,
		true,
	);
	const billing = input.billingSameAsShipping
		? shipping
		: await persistCustomerAddress(
				ctx,
				input.billingAddress || input.shippingAddress,
				false,
			);

	const checkout =
		existing ||
		(await ctx.db.storefrontCheckout.create({
			data: {
				collectionId: cart.id,
				ownerUserId: ctx.userId,
				idempotencyKey: input.idempotencyKey,
				status: "READY",
				acceptedConfiguration: {
					cartVersion: cart.version,
					lineHashes: repriced.map(({ current }) => current.configurationHash),
				},
				totals: {
					currency: "USD",
					subtotal,
					delivery: deliveryAmount,
					tax,
					taxRate,
					orderTotal: total,
					paymentFee: paymentCharge.amount,
					paymentTotal: paymentCharge.chargeAmount,
					cardFeePercentage: paymentCharge.percentage,
				},
				shippingAddress: input.shippingAddress as Prisma.InputJsonValue,
				billingAddress: (input.billingSameAsShipping
					? input.shippingAddress
					: input.billingAddress) as Prisma.InputJsonValue,
				expiresAt: new Date(Date.now() + 60 * 60 * 1_000),
			},
		}));

	let salesOrderId = checkout.salesOrderId;
	let orderId: string | null = null;
	if (!salesOrderId) {
		const sales = await saveStorefrontSalesOrder(ctx, {
			checkoutId: checkout.id,
			customerId: customer.id,
			customerProfileId: customer.customerTypeId,
			billingAddressId: billing.id,
			shippingAddressId: shipping.id,
			taxCode: taxProfile?.taxCode || null,
			taxRate,
			deliveryOption: input.fulfillment,
			deliveryAmount,
			lineItems: repriced.map(({ current }) =>
				salesFormLineItemSchema.parse(current.configuration),
			),
		});
		salesOrderId = sales.salesId;
		orderId = sales.orderId;
		await ctx.db.$transaction([
			ctx.db.storefrontCheckout.update({
				where: { id: checkout.id },
				data: { salesOrderId, status: "ORDER_CREATED" },
			}),
			ctx.db.storefrontCommerceCollection.update({
				where: { id: cart.id },
				data: {
					status: "CHECKOUT",
					completedSalesOrderId: salesOrderId,
				},
			}),
		]);
	} else {
		const sale = await ctx.db.salesOrders.findUnique({
			where: { id: salesOrderId },
			select: { orderId: true },
		});
		orderId = sale?.orderId || null;
	}

	const paymentToken = await buildFullPaymentToken(ctx, {
		salesId: salesOrderId,
		customerId: customer.id,
		customerPhone: customer.phoneNo,
		amountDue: total,
	});
	if (!paymentToken) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "Unable to initialize payment for this order.",
		});
	}
	const appUrl = (
		process.env.NEXT_PUBLIC_APP_URL ||
		process.env.STOREFRONT_APP_URL ||
		"http://localhost:3018"
	).replace(/\/$/, "");
	const payment = await createSalesCheckoutLink(
		ctx,
		{ token: paymentToken, selectedSalesIds: [salesOrderId] },
		{
			redirectUrl: `${appUrl}/checkout/complete?checkoutId=${checkout.id}`,
			idempotencyKey: checkout.idempotencyKey,
		},
	);
	if (!payment?.paymentLink || !payment.squarePaymentId) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "The payment provider did not return a checkout link.",
		});
	}
	await ctx.db.storefrontCheckout.update({
		where: { id: checkout.id },
		data: {
			status: "PAYMENT_PENDING",
			paymentProvider: "square",
			paymentReference: payment.squarePaymentId,
			totals: {
				currency: "USD",
				subtotal,
				delivery: deliveryAmount,
				tax,
				taxRate,
				orderTotal: total,
				paymentFee: paymentCharge.amount,
				paymentTotal: paymentCharge.chargeAmount,
				cardFeePercentage: paymentCharge.percentage,
				paymentUrl: payment.paymentLink,
				orderId,
			},
		},
	});
	return {
		checkoutId: checkout.id,
		salesOrderId,
		paymentUrl: payment.paymentLink,
	};
}

export async function confirmStorefrontCheckoutPayment(
	ctx: CustomerStorefrontContext,
	checkoutId: string,
) {
	const checkout = await ctx.db.storefrontCheckout.findFirst({
		where: {
			id: checkoutId,
			ownerUserId: ctx.userId,
			salesOrderId: { not: null },
		},
	});
	if (!checkout?.paymentReference) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Checkout not found.",
		});
	}
	if (checkout.status === "PAID") {
		return {
			status: "COMPLETED" as const,
			salesOrderId: checkout.salesOrderId,
		};
	}
	const customer = await loadCheckoutCustomer(ctx);
	const accountNo = customer.phoneNo || `cust-${customer.id}`;
	const wallet = await getCustomerWallet(ctx.db, accountNo);
	const result = await verifyPayment(ctx, {
		paymentId: checkout.paymentReference,
		walletId: wallet.id,
		attempts: 1,
	});
	if (result.status === "COMPLETED") {
		await ctx.db.$transaction([
			ctx.db.storefrontCheckout.update({
				where: { id: checkout.id },
				data: {
					status: "PAID",
					paidAt: new Date(),
					completedAt: new Date(),
				},
			}),
			ctx.db.storefrontCommerceCollection.update({
				where: { id: checkout.collectionId },
				data: { status: "COMPLETED" },
			}),
		]);
		await tasks.trigger("send-storefront-order-confirmation-email", {
			email: customer.email,
			name: customer.businessName || customer.name || "Customer",
			orderId:
				result.appliedSales?.find(
					(sale) => sale.salesId === checkout.salesOrderId,
				)?.orderId || String(checkout.salesOrderId),
		});
	}
	return {
		status: result.status || "PENDING",
		salesOrderId: checkout.salesOrderId,
		invoiceDownloadUrl: result.invoiceDownloadUrl,
	};
}

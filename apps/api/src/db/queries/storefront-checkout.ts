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
import { canonicalizeStorefrontShippingAddress } from "@api/db/queries/storefront-shipping-domain";
import type {
	CreateStorefrontCheckoutInput,
	StorefrontAddressInput,
} from "@api/schemas/storefront-checkout";
import type { TRPCContext } from "@api/trpc/init";
import type { Prisma } from "@gnd/db";
import { Notifications } from "@gnd/notifications";
import { EmailService } from "@gnd/notifications/services/email-service";
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
	defaultSalesRepId: number | null;
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
		defaultSalesRepId:
			Number.isInteger(Number(meta.defaultSalesRepId)) &&
			Number(meta.defaultSalesRepId) > 0
				? Number(meta.defaultSalesRepId)
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

async function notifyStorefrontOrderReview(input: {
	ctx: CustomerStorefrontContext;
	salesRepId: number;
	salesId: number;
	salesNo: string;
	customerName: string;
}) {
	const salesRep = await input.ctx.db.users.findFirst({
		where: {
			id: input.salesRepId,
			deletedAt: null,
			accessRevokedAt: null,
		},
		select: { id: true, name: true, email: true },
	});
	if (!salesRep) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "The configured storefront sales rep is unavailable.",
		});
	}
	const adminUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3010"}/storefront/orders`;
	const notifications = new Notifications(input.ctx.db);
	const emailService = new EmailService(input.ctx.db);
	await Promise.allSettled([
		notifications.create(
			"sales_info",
			{
				headline: `Storefront order ${input.salesNo} needs review`,
				note: `${input.customerName} submitted a storefront order. Verify the configuration before sending its payment link.`,
				color: "blue",
				salesId: input.salesId,
				salesNo: input.salesNo,
			},
			{
				author: { id: input.ctx.userId, role: "customer" },
				recipients: [{ role: "employee", ids: [salesRep.id] }],
				includeChannelSubscribers: false,
				allowFallbackRecipient: false,
				forceInAppRecipients: true,
			},
		),
		emailService.sendTransactional({
			to: salesRep.email,
			subject: `Review storefront order ${input.salesNo}`,
			template: "dealer-program-status",
			data: {
				preview: "A storefront order is ready for review",
				heading: "Storefront order review",
				recipientName: salesRep.name,
				message: `${input.customerName} submitted order ${input.salesNo}. Verify its configuration and totals before sending the payment link.`,
				actionLabel: "Review order",
				actionUrl: adminUrl,
			},
		}),
	]);
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
		meta: {
			zip_code: input.postalCode,
			placeId: input.placeId || null,
			formattedAddress: input.formattedAddress || null,
			lat: input.lat ?? null,
			lng: input.lng ?? null,
		},
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
	const [customer, settings, cart, salesSetting, activeShippingPolicy] =
		await Promise.all([
			loadCheckoutCustomer(ctx),
			loadStorefrontSettings(ctx),
			loadCartForCheckout(ctx),
			ctx.db.settings.findFirst({
				where: { type: "sales-settings", deletedAt: null },
				orderBy: { id: "desc" },
				select: { meta: true },
			}),
			ctx.db.storefrontShippingPolicy.findFirst({
				where: { active: true, enabled: true },
				orderBy: { version: "desc" },
				select: { id: true, version: true },
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
		addresses: customer.addressBooks.map((address) => {
			const addressMeta = safeRecord(address.meta);
			return {
				id: address.id,
				name: address.name,
				email: address.email,
				phone: address.phoneNo,
				address1: address.address1,
				address2: address.address2,
				city: address.city,
				state: address.state,
				country: address.country,
				postalCode: String(addressMeta.zip_code || ""),
				placeId: String(addressMeta.placeId || "") || null,
				formattedAddress: String(addressMeta.formattedAddress || "") || null,
				lat: addressMeta.lat == null ? null : Number(addressMeta.lat),
				lng: addressMeta.lng == null ? null : Number(addressMeta.lng),
				isPrimary: address.isPrimary,
			};
		}),
		fulfillment: {
			...settings,
			calculatedDeliveryEnabled: Boolean(activeShippingPolicy),
		},
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
			const sale = existing.salesOrderId
				? await ctx.db.salesOrders.findUnique({
						where: { id: existing.salesOrderId },
						select: { orderId: true },
					})
				: null;
			return {
				checkoutId: existing.id,
				salesOrderId: existing.salesOrderId,
				orderId: sale?.orderId || String(existing.salesOrderId || ""),
				status: "PAYMENT_PENDING" as const,
				paymentUrl: String(totals.paymentUrl),
			};
		}
		if (existing.status === "PAID") {
			const sale = existing.salesOrderId
				? await ctx.db.salesOrders.findUnique({
						where: { id: existing.salesOrderId },
						select: { orderId: true },
					})
				: null;
			const appUrl = (
				process.env.NEXT_PUBLIC_APP_URL ||
				process.env.STOREFRONT_APP_URL ||
				"http://localhost:3018"
			).replace(/\/$/, "");
			return {
				checkoutId: existing.id,
				salesOrderId: existing.salesOrderId,
				orderId: sale?.orderId || String(existing.salesOrderId || ""),
				status: "PAID" as const,
				paymentUrl: `${appUrl}/checkout/complete?checkoutId=${existing.id}`,
			};
		}
		if (existing.status === "ORDER_CREATED" && existing.salesOrderId) {
			const sale = await ctx.db.salesOrders.findUnique({
				where: { id: existing.salesOrderId },
				select: { orderId: true },
			});
			return {
				checkoutId: existing.id,
				salesOrderId: existing.salesOrderId,
				orderId: sale?.orderId || String(existing.salesOrderId),
				status: "ORDER_CREATED" as const,
				paymentUrl: null,
			};
		}
	}

	const [customer, settings, cart, salesSetting, activeShippingPolicy] =
		await Promise.all([
			loadCheckoutCustomer(ctx),
			loadStorefrontSettings(ctx),
			loadCartForCheckout(ctx, existing?.collectionId),
			ctx.db.settings.findFirst({
				where: { type: "sales-settings", deletedAt: null },
				orderBy: { id: "desc" },
				select: { meta: true },
			}),
			ctx.db.storefrontShippingPolicy.findFirst({
				where: { active: true, enabled: true },
				orderBy: { version: "desc" },
				select: { id: true },
			}),
		]);
	const salesSettings = deriveNewSalesFormSettings(salesSetting?.meta);
	if (!settings.defaultSalesRepId) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message:
				"Online checkout is waiting for a default sales rep to be configured.",
		});
	}
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
	const shippingQuote =
		input.fulfillment === "delivery" && activeShippingPolicy
			? await ctx.db.storefrontShippingQuote.findFirst({
					where: {
						id: input.shippingQuoteId || "",
						policyId: activeShippingPolicy.id,
						policy: { active: true, enabled: true },
						collectionId: cart.id,
						cartVersion: cart.version,
						destinationPlaceId: input.shippingAddress.placeId,
						status: {
							in: [
								"PENDING_OFFICE_REVIEW",
								"MANUAL_REVIEW_REQUIRED",
								"AUTO_APPROVED",
								"APPROVED",
								"OVERRIDDEN",
							],
						},
						expiresAt: { gt: new Date() },
					},
				})
			: null;
	if (
		input.fulfillment === "delivery" &&
		activeShippingPolicy &&
		!shippingQuote
	) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message:
				"Calculate delivery for the selected address before submitting the order.",
		});
	}
	const deliveryAmount =
		input.fulfillment === "delivery"
			? shippingQuote
				? Number(shippingQuote.finalAmount ?? shippingQuote.calculatedAmount)
				: settings.freeDeliveryThreshold &&
						subtotal >= settings.freeDeliveryThreshold
					? 0
					: settings.deliveryFlatRate
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
	const shippingAddress = shippingQuote
		? canonicalizeStorefrontShippingAddress(
				input.shippingAddress,
				shippingQuote.destinationAddress,
			)
		: input.shippingAddress;
	const shipping = await persistCustomerAddress(ctx, shippingAddress, true);
	const billing = input.billingSameAsShipping
		? shipping
		: await persistCustomerAddress(
				ctx,
				input.billingAddress || shippingAddress,
				false,
			);

	const checkout =
		existing ||
		(await ctx.db.$transaction(async (tx) => {
			if (shippingQuote) {
				const activePolicy = await tx.storefrontShippingPolicy.updateMany({
					where: {
						id: shippingQuote.policyId,
						active: true,
						enabled: true,
					},
					data: { active: true },
				});
				if (activePolicy.count !== 1) {
					throw new TRPCError({
						code: "CONFLICT",
						message:
							"Delivery settings changed. Recalculate delivery before submitting the order.",
					});
				}
			}
			return tx.storefrontCheckout.create({
				data: {
					collectionId: cart.id,
					ownerUserId: ctx.userId,
					idempotencyKey: input.idempotencyKey,
					status: "READY",
					acceptedConfiguration: {
						cartVersion: cart.version,
						lineHashes: repriced.map(
							({ current }) => current.configurationHash,
						),
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
					shippingAddress: shippingAddress as Prisma.InputJsonValue,
					billingAddress: (input.billingSameAsShipping
						? shippingAddress
						: input.billingAddress) as Prisma.InputJsonValue,
					shippingQuoteId: shippingQuote?.id || null,
					expiresAt: new Date(Date.now() + 60 * 60 * 1_000),
				},
			});
		}));

	let salesOrderId = checkout.salesOrderId;
	let orderId: string | null = null;
	let createdOrder = false;
	if (!salesOrderId) {
		const sales = await saveStorefrontSalesOrder(ctx, {
			checkoutId: checkout.id,
			customerId: customer.id,
			customerProfileId: customer.customerTypeId,
			salesRepId: settings.defaultSalesRepId,
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
		createdOrder = true;
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
	if (createdOrder) {
		await notifyStorefrontOrderReview({
			ctx,
			salesRepId: settings.defaultSalesRepId,
			salesId: salesOrderId,
			salesNo: orderId || String(salesOrderId),
			customerName:
				customer.businessName || customer.name || customer.email || "Customer",
		});
	}
	return {
		checkoutId: checkout.id,
		salesOrderId,
		orderId: orderId || String(salesOrderId),
		status: "ORDER_CREATED" as const,
		paymentUrl: null,
	};
}

export async function approveStorefrontCheckoutPayment(
	ctx: TRPCContext,
	checkoutId: string,
) {
	const checkout = await ctx.db.storefrontCheckout.findUnique({
		where: { id: checkoutId },
		include: { shippingQuote: true },
	});
	if (!checkout?.salesOrderId) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Checkout not found." });
	}
	const currentTotals = safeRecord(checkout.totals);
	if (checkout.status === "PAYMENT_PENDING" && currentTotals.paymentUrl) {
		return {
			checkoutId: checkout.id,
			paymentUrl: String(currentTotals.paymentUrl),
			alreadyApproved: true,
		};
	}
	if (checkout.status !== "ORDER_CREATED") {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "Only orders awaiting review can receive a payment link.",
		});
	}
	if (
		checkout.shippingQuote &&
		!["AUTO_APPROVED", "APPROVED", "OVERRIDDEN"].includes(
			checkout.shippingQuote.status,
		)
	) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message:
				"Approve or override the delivery quote before sending the payment link.",
		});
	}
	const sale = await ctx.db.salesOrders.findUnique({
		where: { id: checkout.salesOrderId },
		select: {
			id: true,
			orderId: true,
			amountDue: true,
			grandTotal: true,
			salesRepId: true,
			customer: {
				select: {
					id: true,
					name: true,
					businessName: true,
					email: true,
					phoneNo: true,
				},
			},
		},
	});
	if (!sale?.customer || !sale.salesRepId) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "Assign the order to a sales rep before approving payment.",
		});
	}
	if (!sale.customer.email) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message:
				"The customer needs an email address before payment can be sent.",
		});
	}
	const amountDue = Number(
		currentTotals.paymentTotal || sale.amountDue || sale.grandTotal || 0,
	);
	const paymentToken = await buildFullPaymentToken(ctx, {
		salesId: sale.id,
		customerId: sale.customer.id,
		customerPhone: sale.customer.phoneNo,
		amountDue,
	});
	if (!paymentToken) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "Unable to initialize payment for this order.",
		});
	}
	const storefrontUrl = (
		process.env.STOREFRONT_APP_URL || "http://localhost:3018"
	).replace(/\/$/, "");
	const payment = await createSalesCheckoutLink(
		ctx,
		{ token: paymentToken, selectedSalesIds: [sale.id] },
		{
			redirectUrl: `${storefrontUrl}/checkout/complete?checkoutId=${checkout.id}`,
			idempotencyKey: `${checkout.idempotencyKey}:approved`,
		},
	);
	if (!payment?.paymentLink || !payment.squarePaymentId) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "The payment provider did not return a checkout link.",
		});
	}
	await ctx.db.$transaction([
		ctx.db.storefrontCheckout.update({
			where: { id: checkout.id },
			data: {
				status: "PAYMENT_PENDING",
				paymentProvider: "square",
				paymentReference: payment.squarePaymentId,
				totals: {
					...currentTotals,
					paymentUrl: payment.paymentLink,
					orderId: sale.orderId,
				},
			},
		}),
		ctx.db.storefrontAuditEvent.create({
			data: {
				actorUserId: ctx.userId,
				action: "checkout.payment_link_approved",
				entityType: "StorefrontCheckout",
				entityId: checkout.id,
				requestId: ctx.requestId,
				metadata: { salesOrderId: sale.id, salesRepId: sale.salesRepId },
			},
		}),
	]);
	const emailService = new EmailService(ctx.db);
	await emailService.sendTransactional({
		to: sale.customer.email,
		subject: `Payment is ready for order ${sale.orderId}`,
		template: "dealer-program-status",
		data: {
			preview: "Your GND order is ready for payment",
			heading: "Payment link ready",
			recipientName:
				sale.customer.businessName || sale.customer.name || sale.customer.email,
			message: `Order ${sale.orderId} has been reviewed and is ready for payment.`,
			actionLabel: "Pay order",
			actionUrl: payment.paymentLink,
		},
	});
	return {
		checkoutId: checkout.id,
		paymentUrl: payment.paymentLink,
		alreadyApproved: false,
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

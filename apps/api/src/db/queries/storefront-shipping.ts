import {
	computeStorefrontDrivingRoute,
	resolveStorefrontPlace,
} from "@api/db/queries/google-place";
import {
	type StorefrontShippingPolicyInput,
	storefrontShippingPolicyInputSchema,
} from "@api/schemas/storefront-shipping";
import type { TRPCContext } from "@api/trpc/init";
import type { Prisma } from "@gnd/db";
import { Notifications } from "@gnd/notifications";
import { EmailService } from "@gnd/notifications/services/email-service";
import {
	type StorefrontShippingLine,
	type StorefrontShippingPolicy,
	buildStorefrontShippingQuote,
} from "@gnd/sales/storefront-shipping";
import { TRPCError } from "@trpc/server";
import {
	buildFinalizedStorefrontCheckoutTotals,
	isStorefrontShippingPaymentLocked,
	requiresStorefrontShippingOverrideReason,
} from "./storefront-shipping-domain";

type CustomerStorefrontContext = TRPCContext & {
	userId: number;
	customerId: number;
};

type JsonRecord = Record<string, unknown>;

export const defaultStorefrontShippingPolicy: StorefrontShippingPolicyInput = {
	enabled: false,
	approvalMode: "OFFICE_REVIEW",
	originPlaceId: null,
	originFormattedAddress: null,
	baseDispatchFee: 0,
	baseVehicleRatePerMile: 0,
	roundTripMultiplier: 2,
	includedWeightLb: 0,
	weightUnitLb: 100,
	weightDistanceRate: 0,
	packagingMultiplier: 1.1,
	weightRoundingIncrementLb: 25,
	minimumCharge: 0,
	maximumCharge: null,
	maxDistanceMiles: null,
	maxWeightLb: null,
	freeDeliveryThreshold: null,
	autoApprovalMaxDistanceMiles: null,
	autoApprovalMaxWeightLb: null,
	autoApprovalMaxAmount: null,
	allowGlobalFallbackForAutoApproval: false,
	globalDoorWeightLb: null,
	globalMouldingLbPerLinearFoot: null,
	globalShelfWeightPerUnitLb: null,
	doorWeightProfiles: [],
	mouldingWeightProfiles: [],
	shelfCategoryWeights: [],
	productWeightOverrides: [],
};

export async function getStorefrontShippingPolicy(ctx: TRPCContext) {
	const policy = await ctx.db.storefrontShippingPolicy.findFirst({
		where: { active: true },
		orderBy: { version: "desc" },
	});
	return policy ? serializePolicy(policy) : defaultStorefrontShippingPolicy;
}

export async function saveStorefrontShippingPolicy(
	ctx: TRPCContext,
	input: StorefrontShippingPolicyInput,
) {
	const latest = await ctx.db.storefrontShippingPolicy.aggregate({
		_max: { version: true },
	});
	const version = (latest._max.version || 0) + 1;
	const saved = await ctx.db.$transaction(async (tx) => {
		await tx.storefrontShippingPolicy.updateMany({
			where: { active: true },
			data: { active: false },
		});
		return tx.storefrontShippingPolicy.create({
			data: {
				version,
				active: true,
				enabled: input.enabled,
				approvalMode: input.approvalMode,
				originPlaceId: input.originPlaceId,
				originFormattedAddress: input.originFormattedAddress,
				baseDispatchFee: input.baseDispatchFee,
				baseVehicleRatePerMile: input.baseVehicleRatePerMile,
				roundTripMultiplier: input.roundTripMultiplier,
				includedWeightLb: input.includedWeightLb,
				weightUnitLb: input.weightUnitLb,
				weightDistanceRate: input.weightDistanceRate,
				packagingMultiplier: input.packagingMultiplier,
				weightRoundingIncrementLb: input.weightRoundingIncrementLb,
				minimumCharge: input.minimumCharge,
				maximumCharge: input.maximumCharge,
				maxDistanceMiles: input.maxDistanceMiles,
				maxWeightLb: input.maxWeightLb,
				freeDeliveryThreshold: input.freeDeliveryThreshold,
				autoApprovalMaxDistanceMiles: input.autoApprovalMaxDistanceMiles,
				autoApprovalMaxWeightLb: input.autoApprovalMaxWeightLb,
				autoApprovalMaxAmount: input.autoApprovalMaxAmount,
				allowGlobalFallbackForAutoApproval:
					input.allowGlobalFallbackForAutoApproval,
				globalDoorWeightLb: input.globalDoorWeightLb,
				globalMouldingLbPerLinearFoot: input.globalMouldingLbPerLinearFoot,
				globalShelfWeightPerUnitLb: input.globalShelfWeightPerUnitLb,
				doorWeightProfiles: asJson(input.doorWeightProfiles),
				mouldingWeightProfiles: asJson(input.mouldingWeightProfiles),
				shelfCategoryWeights: asJson(input.shelfCategoryWeights),
				productWeightOverrides: asJson(input.productWeightOverrides),
				createdByUserId: ctx.userId,
			},
		});
	});
	await ctx.db.storefrontAuditEvent.create({
		data: {
			actorUserId: ctx.userId,
			action: "shipping.policy_published",
			entityType: "StorefrontShippingPolicy",
			entityId: saved.id,
			requestId: ctx.requestId,
			metadata: asJson({ version: saved.version }),
		},
	});
	return { id: saved.id, version: saved.version };
}

export async function previewStorefrontShipping(
	ctx: CustomerStorefrontContext,
	input: {
		cartVersion: number;
		destination: {
			placeId: string;
			formattedAddress: string;
			sessionToken?: string;
		};
	},
) {
	const [policy, cart] = await Promise.all([
		ctx.db.storefrontShippingPolicy.findFirst({
			where: { active: true },
			orderBy: { version: "desc" },
		}),
		ctx.db.storefrontCommerceCollection.findFirst({
			where: {
				ownerUserId: ctx.userId,
				type: "CART",
				status: "ACTIVE",
			},
			include: {
				lines: {
					orderBy: { createdAt: "asc" },
					include: {
						offer: { include: { category: true } },
					},
				},
			},
		}),
	]);
	if (!policy?.enabled || !policy.originPlaceId) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "Calculated delivery is not configured yet.",
		});
	}
	if (!cart || cart.version !== input.cartVersion || !cart.lines.length) {
		throw new TRPCError({
			code: "CONFLICT",
			message: "The cart changed. Refresh it before calculating delivery.",
		});
	}

	const destination = await resolveStorefrontPlace(input.destination).catch(
		(error) => {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message:
					error instanceof Error
						? error.message
						: "The delivery address could not be resolved.",
			});
		},
	);
	const origin = await resolveStorefrontPlace({
		placeId: policy.originPlaceId,
	});
	const route = await computeStorefrontDrivingRoute({
		origin,
		destination,
	}).catch(() => null);
	const domainPolicy = toDomainPolicy(policy);
	const domainLines = buildCartShippingLines(cart.lines, policy);
	const subtotal = cart.lines.reduce(
		(total, line) => total + Number(line.lineTotal || 0),
		0,
	);
	const calculation = buildStorefrontShippingQuote({
		oneWayDistanceMiles: route?.oneWayDistanceMiles ?? null,
		subtotal,
		policy: domainPolicy,
		lines: domainLines,
	});
	const status = calculation.decision;

	const saved = await ctx.db.$transaction(async (tx) => {
		const currentCart = await tx.storefrontCommerceCollection.findFirst({
			where: {
				id: cart.id,
				ownerUserId: ctx.userId,
				type: "CART",
				status: "ACTIVE",
				version: cart.version,
			},
			select: { id: true },
		});
		if (!currentCart) {
			throw new TRPCError({
				code: "CONFLICT",
				message: "The cart changed. Refresh it before calculating delivery.",
			});
		}
		const revisionResult = await tx.storefrontShippingQuote.aggregate({
			where: { collectionId: cart.id },
			_max: { revision: true },
		});
		return tx.storefrontShippingQuote.create({
			data: {
				collectionId: cart.id,
				policyId: policy.id,
				policyVersion: policy.version,
				revision: (revisionResult._max.revision || 0) + 1,
				status,
				cartVersion: cart.version,
				destinationPlaceId: destination.placeId,
				destinationAddress: asJson(destination),
				oneWayDistanceMiles: route?.oneWayDistanceMiles ?? null,
				routeProvider: route?.provider ?? null,
				routeProviderReference: route?.duration ?? null,
				subtotal,
				estimatedWeightLb: calculation.breakdown.estimatedWeightLb,
				chargeableWeightLb: calculation.breakdown.chargeableWeightLb,
				calculatedAmount: calculation.amount,
				finalAmount:
					calculation.decision === "AUTO_APPROVED" ? calculation.amount : null,
				calculation: asJson(calculation),
				blockers: asJson(calculation.blockers),
				autoApprovalBlockers: asJson(calculation.autoApprovalBlockers),
				expiresAt: new Date(Date.now() + 60 * 60 * 1_000),
			},
		});
	});

	return {
		id: saved.id,
		revision: saved.revision,
		status: saved.status,
		amount: calculation.amount,
		finalAmount: saved.finalAmount == null ? null : Number(saved.finalAmount),
		destination,
		calculation,
	};
}

export async function reviewStorefrontShippingQuote(
	ctx: TRPCContext,
	input: { quoteId: string; finalAmount: number; reviewNote?: string | null },
) {
	const quote = await ctx.db.storefrontShippingQuote.findUnique({
		where: { id: input.quoteId },
		include: { checkout: true },
	});
	if (!quote || quote.status === "SUPERSEDED" || quote.status === "EXPIRED") {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "This shipping quote is no longer available.",
		});
	}
	if (
		!["PENDING_OFFICE_REVIEW", "MANUAL_REVIEW_REQUIRED"].includes(quote.status)
	) {
		throw new TRPCError({
			code: "CONFLICT",
			message: "This shipping quote has already been finalized.",
		});
	}
	if (isStorefrontShippingPaymentLocked(quote.checkout)) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "Shipping cannot change after payment has started.",
		});
	}
	const finalAmount = Math.round(input.finalAmount * 100) / 100;
	const status =
		finalAmount === Number(quote.calculatedAmount) ? "APPROVED" : "OVERRIDDEN";
	if (
		requiresStorefrontShippingOverrideReason({
			calculatedAmount: Number(quote.calculatedAmount),
			finalAmount,
			reviewNote: input.reviewNote,
		})
	) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Add a reason when overriding the calculated delivery amount.",
		});
	}
	await ctx.db.$transaction(async (tx) => {
		const finalized = await tx.storefrontShippingQuote.updateMany({
			where: {
				id: quote.id,
				status: {
					in: ["PENDING_OFFICE_REVIEW", "MANUAL_REVIEW_REQUIRED"],
				},
			},
			data: {
				status,
				finalAmount,
				reviewNote: input.reviewNote || null,
				reviewedByUserId: ctx.userId,
				reviewedAt: new Date(),
			},
		});
		if (finalized.count !== 1) {
			throw new TRPCError({
				code: "CONFLICT",
				message: "Another reviewer already finalized this shipping quote.",
			});
		}
		if (!quote.checkout) return;
		const finalizedTotals = buildFinalizedStorefrontCheckoutTotals(
			quote.checkout.totals,
			finalAmount,
		);
		await tx.storefrontCheckout.update({
			where: { id: quote.checkout.id },
			data: {
				totals: asJson(finalizedTotals.totals),
			},
		});
		if (quote.checkout.salesOrderId) {
			const sale = await tx.salesOrders.findUnique({
				where: { id: quote.checkout.salesOrderId },
				select: { grandTotal: true, amountDue: true },
			});
			await tx.salesExtraCosts.updateMany({
				where: {
					orderId: quote.checkout.salesOrderId,
					type: "Delivery",
				},
				data: {
					amount: finalAmount,
					totalAmount: finalAmount,
				},
			});
			if (finalAmount > 0) {
				const count = await tx.salesExtraCosts.count({
					where: {
						orderId: quote.checkout.salesOrderId,
						type: "Delivery",
					},
				});
				if (!count) {
					await tx.salesExtraCosts.create({
						data: {
							orderId: quote.checkout.salesOrderId,
							label: "Delivery",
							type: "Delivery",
							amount: finalAmount,
							totalAmount: finalAmount,
							taxxable: false,
						},
					});
				}
			}
			await tx.salesOrders.update({
				where: { id: quote.checkout.salesOrderId },
				data: {
					grandTotal: roundMoney(
						Number(sale?.grandTotal || 0) + finalizedTotals.delta,
					),
					amountDue: roundMoney(
						Number(sale?.amountDue || 0) + finalizedTotals.delta,
					),
				},
			});
		}
	});
	await ctx.db.storefrontAuditEvent.create({
		data: {
			actorUserId: ctx.userId,
			action:
				status === "OVERRIDDEN"
					? "shipping.quote_overridden"
					: "shipping.quote_approved",
			entityType: "StorefrontShippingQuote",
			entityId: quote.id,
			requestId: ctx.requestId,
			metadata: asJson({
				calculatedAmount: Number(quote.calculatedAmount),
				finalAmount,
				reviewNote: input.reviewNote || null,
			}),
		},
	});
	if (quote.checkout?.salesOrderId) {
		const sale = await ctx.db.salesOrders.findUnique({
			where: { id: quote.checkout.salesOrderId },
			select: {
				id: true,
				orderId: true,
				customer: {
					select: {
						name: true,
						businessName: true,
						email: true,
						userId: true,
					},
				},
			},
		});
		if (sale?.customer) {
			const orderUrl = `${(
				process.env.STOREFRONT_APP_URL || "http://localhost:3018"
			).replace(/\/$/, "")}/orders/${encodeURIComponent(sale.orderId)}`;
			const notifications = new Notifications(ctx.db);
			const emailService = new EmailService(ctx.db);
			await Promise.allSettled([
				sale.customer.userId
					? notifications.create(
							"sales_info",
							{
								headline: `Delivery updated for order ${sale.orderId}`,
								note: `The office finalized delivery at $${finalAmount.toFixed(2)}. Your updated order total is ready to review.`,
								color: "blue",
								salesId: sale.id,
								salesNo: sale.orderId,
							},
							{
								author: { id: Number(ctx.userId), role: "employee" },
								recipients: [{ role: "customer", ids: [sale.customer.userId] }],
								includeChannelSubscribers: false,
								allowFallbackRecipient: false,
								forceInAppRecipients: true,
							},
						)
					: Promise.resolve(),
				sale.customer.email
					? emailService.sendTransactional({
							to: sale.customer.email,
							subject: `Delivery updated for order ${sale.orderId}`,
							template: "dealer-program-status",
							data: {
								preview: "Your delivery amount was finalized",
								heading: "Updated delivery and order total",
								recipientName:
									sale.customer.businessName ||
									sale.customer.name ||
									sale.customer.email,
								message: `The office finalized delivery for order ${sale.orderId} at $${finalAmount.toFixed(2)}. Review the updated total in your account.`,
								actionLabel: "View order",
								actionUrl: orderUrl,
							},
						})
					: Promise.resolve(),
			]);
		}
	}
	return { id: quote.id, status, finalAmount };
}

function buildCartShippingLines(
	lines: Array<{
		id: string;
		rootComponentUid: string;
		quantity: unknown;
		configuration: unknown;
		offer: {
			sourceComponentUid: string;
			category: { id: string; slug: string; title: string };
		} | null;
	}>,
	policy: {
		globalDoorWeightLb: unknown;
		globalMouldingLbPerLinearFoot: unknown;
		globalShelfWeightPerUnitLb: unknown;
		doorWeightProfiles: unknown;
		mouldingWeightProfiles: unknown;
		shelfCategoryWeights: unknown;
		productWeightOverrides: unknown;
	},
) {
	const result: StorefrontShippingLine[] = [];
	const doorProfiles = recordArray(policy.doorWeightProfiles);
	const mouldingProfiles = recordArray(policy.mouldingWeightProfiles);
	const shelfWeights = recordArray(policy.shelfCategoryWeights);
	const overrides = recordArray(policy.productWeightOverrides);
	for (const line of lines) {
		const resolvedLineCount = result.length;
		const configuration = safeRecord(line.configuration);
		const meta = safeRecord(configuration.meta);
		const hpt = safeRecord(configuration.housePackageTool);
		const doors = recordArray(hpt.doors);
		doors.forEach((door, index) => {
			const doorMeta = safeRecord(door.meta);
			const componentUid = String(
				doorMeta.storefrontComponentUid || line.rootComponentUid,
			);
			const dimension = String(door.dimension || "").trim();
			const override = findOverride(overrides, [
				`door:${componentUid}:${dimension}`,
				componentUid,
			]);
			const profile = doorProfiles.find(
				(candidate) =>
					String(candidate.dimension || "") === dimension &&
					(!candidate.componentUid ||
						String(candidate.componentUid) === componentUid),
			);
			result.push({
				kind: "DOOR",
				key: `${line.id}:door:${index}`,
				description: `${String(configuration.title || "Door")} ${dimension}`,
				quantity: Number(door.totalQty || 0),
				dimension,
				weights: {
					overrideWeightLb: numberOrNull(override?.weightLb),
					profileWeightLb: numberOrNull(profile?.weightLb),
					globalDefaultWeightLb: numberOrNull(policy.globalDoorWeightLb),
				},
				handlingFeePerUnit: numberOrNull(
					override?.handlingFeePerUnit ?? profile?.handlingFeePerUnit,
				),
			});
		});

		const isMoulding =
			line.offer?.category.slug === "mouldings" ||
			/moulding|molding/i.test(line.offer?.category.title || "");
		if (isMoulding) {
			const moulding = safeRecord(meta.storefrontMoulding);
			const componentUid =
				line.offer?.sourceComponentUid || line.rootComponentUid;
			const override = findOverride(overrides, [
				`moulding:${componentUid}`,
				componentUid,
			]);
			const profile = mouldingProfiles.find(
				(candidate) =>
					(!candidate.categoryId ||
						String(candidate.categoryId) === line.offer?.category.id) &&
					(!candidate.componentUid ||
						String(candidate.componentUid) === componentUid),
			);
			result.push({
				kind: "MOULDING",
				key: `${line.id}:moulding`,
				description: String(configuration.title || "Moulding"),
				requestedLinearFeet: Number(
					moulding.requestedLinearFeet || line.quantity || 0,
				),
				pieceLengthFeet: Number(moulding.pieceLengthFeet || 16),
				wastePercentage: Number(moulding.wastePercentage || 0),
				unitPrice: Number(configuration.unitPrice || 0),
				weights: {
					overrideLbPerLinearFoot: numberOrNull(override?.lbPerLinearFoot),
					categoryLbPerLinearFoot: numberOrNull(profile?.lbPerLinearFoot),
					globalDefaultLbPerLinearFoot: numberOrNull(
						policy.globalMouldingLbPerLinearFoot,
					),
				},
				handlingFeePerUnit: numberOrNull(override?.handlingFeePerUnit),
			});
		}

		const shelfItems = recordArray(configuration.shelfItems);
		shelfItems.forEach((shelf, index) => {
			const productId = Number(shelf.productId || 0);
			const override = findOverride(overrides, [`shelf:${productId}`]);
			const child = shelfWeights.find(
				(candidate) =>
					Number(candidate.categoryId || 0) === Number(shelf.categoryId || 0),
			);
			const parent = shelfWeights.find(
				(candidate) =>
					Number(candidate.categoryId || 0) ===
					Number(shelf.parentCategoryId || 0),
			);
			result.push({
				kind: "SHELF",
				key: `${line.id}:shelf:${index}`,
				description: String(shelf.description || "Shelf item"),
				quantity: Number(shelf.qty || 0),
				weights: {
					overrideWeightPerUnitLb: numberOrNull(override?.weightLb),
					childCategoryWeightPerUnitLb: numberOrNull(child?.weightPerUnitLb),
					parentCategoryWeightPerUnitLb: numberOrNull(parent?.weightPerUnitLb),
					globalDefaultWeightPerUnitLb: numberOrNull(
						policy.globalShelfWeightPerUnitLb,
					),
				},
				handlingFeePerUnit: numberOrNull(override?.handlingFeePerUnit),
			});
		});
		const isShelfOffer =
			shelfItems.length === 0 &&
			/shelf|hardware/i.test(
				`${line.offer?.category.slug || ""} ${line.offer?.category.title || ""}`,
			);
		if (isShelfOffer) {
			const componentUid =
				line.offer?.sourceComponentUid || line.rootComponentUid;
			const override = findOverride(overrides, [
				`shelf:${componentUid}`,
				componentUid,
			]);
			const category = shelfWeights.find(
				(candidate) =>
					String(candidate.categoryId || "") ===
					String(line.offer?.category.id || ""),
			);
			result.push({
				kind: "SHELF",
				key: `${line.id}:shelf-offer`,
				description: String(configuration.title || "Shelf item"),
				quantity: Number(line.quantity || 0),
				weights: {
					overrideWeightPerUnitLb: numberOrNull(override?.weightLb),
					childCategoryWeightPerUnitLb: numberOrNull(category?.weightPerUnitLb),
					globalDefaultWeightPerUnitLb: numberOrNull(
						policy.globalShelfWeightPerUnitLb,
					),
				},
				handlingFeePerUnit: numberOrNull(override?.handlingFeePerUnit),
			});
		}
		if (result.length === resolvedLineCount) {
			const componentUid =
				line.offer?.sourceComponentUid || line.rootComponentUid;
			const override = findOverride(overrides, [componentUid]);
			result.push({
				kind: "SHELF",
				key: `${line.id}:product`,
				description: String(configuration.title || "Storefront product"),
				quantity: Number(line.quantity || 0),
				weights: {
					overrideWeightPerUnitLb: numberOrNull(override?.weightLb),
				},
				handlingFeePerUnit: numberOrNull(override?.handlingFeePerUnit),
			});
		}
	}
	return result;
}

function serializePolicy(policy: Record<string, unknown>) {
	return storefrontShippingPolicyInputSchema.parse({
		...defaultStorefrontShippingPolicy,
		...Object.fromEntries(
			Object.entries(defaultStorefrontShippingPolicy)
				.filter(([, value]) => typeof value === "number" || value === null)
				.map(([key]) => [key, numberOrNull(policy[key])]),
		),
		enabled: policy.enabled === true,
		approvalMode:
			policy.approvalMode === "AUTO_WHEN_CONFIDENT"
				? "AUTO_WHEN_CONFIDENT"
				: "OFFICE_REVIEW",
		originPlaceId: stringOrNull(policy.originPlaceId),
		originFormattedAddress: stringOrNull(policy.originFormattedAddress),
		allowGlobalFallbackForAutoApproval:
			policy.allowGlobalFallbackForAutoApproval === true,
		doorWeightProfiles: recordArray(policy.doorWeightProfiles),
		mouldingWeightProfiles: recordArray(policy.mouldingWeightProfiles),
		shelfCategoryWeights: recordArray(policy.shelfCategoryWeights),
		productWeightOverrides: recordArray(policy.productWeightOverrides),
	});
}

function toDomainPolicy(
	policy: Record<string, unknown>,
): StorefrontShippingPolicy {
	const value = serializePolicy(policy);
	return {
		enabled: value.enabled,
		approvalMode: value.approvalMode,
		baseDispatchFee: Number(value.baseDispatchFee || 0),
		baseVehicleRatePerMile: Number(value.baseVehicleRatePerMile || 0),
		roundTripMultiplier: Number(value.roundTripMultiplier || 2),
		includedWeightLb: Number(value.includedWeightLb || 0),
		weightUnitLb: Number(value.weightUnitLb || 100),
		weightDistanceRate: Number(value.weightDistanceRate || 0),
		packagingMultiplier: Number(value.packagingMultiplier || 1),
		weightRoundingIncrementLb: Number(value.weightRoundingIncrementLb || 1),
		minimumCharge: Number(value.minimumCharge || 0),
		maximumCharge: numberOrNull(value.maximumCharge),
		maxDistanceMiles: numberOrNull(value.maxDistanceMiles),
		maxWeightLb: numberOrNull(value.maxWeightLb),
		freeDeliveryThreshold: numberOrNull(value.freeDeliveryThreshold),
		autoApprovalMaxDistanceMiles: numberOrNull(
			value.autoApprovalMaxDistanceMiles,
		),
		autoApprovalMaxWeightLb: numberOrNull(value.autoApprovalMaxWeightLb),
		autoApprovalMaxAmount: numberOrNull(value.autoApprovalMaxAmount),
		allowGlobalFallbackForAutoApproval:
			value.allowGlobalFallbackForAutoApproval,
	};
}

function findOverride(overrides: JsonRecord[], keys: string[]) {
	return overrides.find((override) =>
		keys.includes(String(override.key || "")),
	);
}

function recordArray(value: unknown): JsonRecord[] {
	return Array.isArray(value)
		? value.filter(
				(item): item is JsonRecord =>
					Boolean(item) && typeof item === "object" && !Array.isArray(item),
			)
		: [];
}

function safeRecord(value: unknown): JsonRecord {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as JsonRecord)
		: {};
}

function numberOrNull(value: unknown) {
	if (value === null || value === undefined || value === "") return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function stringOrNull(value: unknown) {
	const parsed = String(value ?? "").trim();
	return parsed || null;
}

function asJson(value: unknown): Prisma.InputJsonValue {
	return value as Prisma.InputJsonValue;
}

function roundMoney(value: number) {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

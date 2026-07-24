import type {
	StorefrontPromotionInput,
	StorefrontPromotionListInput,
	StorefrontPromotionOptionSearchInput,
} from "@api/schemas/storefront-promotion";
import type { TRPCContext } from "@api/trpc/init";
import type { Prisma } from "@gnd/db";
import { TRPCError } from "@trpc/server";

const promotionInclude = {
	categoryTargets: { select: { categoryId: true } },
	offerTargets: { select: { offerId: true } },
	customerTargets: { select: { customerId: true } },
	profileTargets: { select: { customerProfileId: true } },
} satisfies Prisma.StorefrontPromotionInclude;

function promotionDto(
	promotion: Prisma.StorefrontPromotionGetPayload<{
		include: typeof promotionInclude;
	}>,
) {
	const now = Date.now();
	const state =
		promotion.status !== "PUBLISHED"
			? promotion.status
			: promotion.startsAt.getTime() > now
				? "SCHEDULED"
				: promotion.endsAt && promotion.endsAt.getTime() <= now
					? "EXPIRED"
					: "ACTIVE";
	return {
		...promotion,
		percentageOff: Number(promotion.percentageOff),
		state,
		categoryIds: promotion.categoryTargets.map((row) => row.categoryId),
		offerIds: promotion.offerTargets.map((row) => row.offerId),
		customerIds: promotion.customerTargets.map((row) => row.customerId),
		customerProfileIds: promotion.profileTargets.map(
			(row) => row.customerProfileId,
		),
		categoryTargets: undefined,
		offerTargets: undefined,
		customerTargets: undefined,
		profileTargets: undefined,
	};
}

export async function listStorefrontPromotions(
	ctx: TRPCContext,
	input: StorefrontPromotionListInput,
) {
	const rows = await ctx.db.storefrontPromotion.findMany({
		where: {
			...(input.status === "ARCHIVED"
				? { deletedAt: { not: null }, status: "ARCHIVED" as const }
				: input.status
					? { deletedAt: null, status: input.status }
					: {}),
			...(input.query
				? {
						OR: [
							{ internalName: { contains: input.query } },
							{ publicTitle: { contains: input.query } },
							{ badgeText: { contains: input.query } },
						],
					}
				: {}),
		},
		cursor: input.cursor ? { id: input.cursor } : undefined,
		skip: input.cursor ? 1 : 0,
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		take: input.limit + 1,
		include: promotionInclude,
	});
	const page = rows.slice(0, input.limit);
	return {
		items: page.map(promotionDto),
		nextCursor: rows.length > input.limit ? (page.at(-1)?.id ?? null) : null,
	};
}

export function listStorefrontPromotionProfiles(ctx: TRPCContext) {
	return ctx.db.customerTypes.findMany({
		where: { deletedAt: null, dealerOwnerId: null },
		orderBy: [{ title: "asc" }, { id: "asc" }],
		select: { id: true, title: true, coefficient: true },
		take: 500,
	});
}

export function listStorefrontPromotionCategories(ctx: TRPCContext) {
	return ctx.db.storefrontCategory.findMany({
		where: { deletedAt: null },
		orderBy: [{ title: "asc" }, { id: "asc" }],
		select: { id: true, title: true, status: true },
		take: 500,
	});
}

export function searchStorefrontPromotionOptions(
	ctx: TRPCContext,
	input: StorefrontPromotionOptionSearchInput,
) {
	if (input.type === "CUSTOMER") {
		return ctx.db.customers.findMany({
			where: {
				deletedAt: null,
				dealerOwnerId: null,
				...(input.query
					? {
							OR: [
								{ name: { contains: input.query } },
								{ businessName: { contains: input.query } },
								{ email: { contains: input.query } },
							],
						}
					: {}),
			},
			orderBy: [{ businessName: "asc" }, { name: "asc" }],
			select: {
				id: true,
				name: true,
				businessName: true,
				email: true,
			},
			take: input.limit,
		});
	}
	return ctx.db.storefrontOffer.findMany({
		where: {
			deletedAt: null,
			...(input.query
				? {
						OR: [
							{ title: { contains: input.query } },
							{ slug: { contains: input.query } },
						],
					}
				: {}),
		},
		orderBy: [{ title: "asc" }, { id: "asc" }],
		select: {
			id: true,
			title: true,
			status: true,
			category: { select: { title: true } },
		},
		take: input.limit,
	});
}

export async function getStorefrontPromotion(ctx: TRPCContext, id: string) {
	const promotion = await ctx.db.storefrontPromotion.findUnique({
		where: { id },
		include: promotionInclude,
	});
	if (!promotion) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Promotion not found." });
	}
	return promotionDto(promotion);
}

async function validatePromotionTargets(
	ctx: TRPCContext,
	input: StorefrontPromotionInput,
) {
	const [profiles, customers, categories, offers] = await Promise.all([
		input.customerProfileIds.length
			? ctx.db.customerTypes.count({
					where: {
						id: { in: input.customerProfileIds },
						deletedAt: null,
						dealerOwnerId: null,
					},
				})
			: 0,
		input.customerIds.length
			? ctx.db.customers.count({
					where: {
						id: { in: input.customerIds },
						deletedAt: null,
						dealerOwnerId: null,
					},
				})
			: 0,
		input.categoryIds.length
			? ctx.db.storefrontCategory.count({
					where: { id: { in: input.categoryIds }, deletedAt: null },
				})
			: 0,
		input.offerIds.length
			? ctx.db.storefrontOffer.count({
					where: { id: { in: input.offerIds }, deletedAt: null },
				})
			: 0,
	]);
	if (
		profiles !== new Set(input.customerProfileIds).size ||
		customers !== new Set(input.customerIds).size ||
		categories !== new Set(input.categoryIds).size ||
		offers !== new Set(input.offerIds).size
	) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "One or more selected promotion targets are unavailable.",
		});
	}
}

export async function saveStorefrontPromotion(
	ctx: TRPCContext & { userId: number },
	input: StorefrontPromotionInput,
) {
	await validatePromotionTargets(ctx, input);
	const data = {
		internalName: input.internalName,
		publicTitle: input.publicTitle,
		description: input.description || null,
		badgeText: input.badgeText,
		bannerText: input.bannerText || null,
		bannerHref: input.bannerHref || null,
		percentageOff: input.percentageOff,
		priority: input.priority,
		audienceMode: input.audienceMode,
		scopeMode: input.scopeMode,
		startsAt: input.startsAt,
		endsAt: input.endsAt,
		updatedByUserId: ctx.userId,
	} satisfies Prisma.StorefrontPromotionUncheckedUpdateInput;

	return ctx.db.$transaction(async (tx) => {
		const promotion = input.id
			? await tx.storefrontPromotion.update({
					where: { id: input.id },
					data,
				})
			: await tx.storefrontPromotion.create({
					data: {
						...data,
						createdByUserId: ctx.userId,
					},
				});
		await Promise.all([
			tx.storefrontPromotionCategory.deleteMany({
				where: { promotionId: promotion.id },
			}),
			tx.storefrontPromotionOffer.deleteMany({
				where: { promotionId: promotion.id },
			}),
			tx.storefrontPromotionCustomer.deleteMany({
				where: { promotionId: promotion.id },
			}),
			tx.storefrontPromotionCustomerProfile.deleteMany({
				where: { promotionId: promotion.id },
			}),
		]);
		await Promise.all([
			input.categoryIds.length
				? tx.storefrontPromotionCategory.createMany({
						data: [...new Set(input.categoryIds)].map((categoryId) => ({
							promotionId: promotion.id,
							categoryId,
						})),
					})
				: null,
			input.offerIds.length
				? tx.storefrontPromotionOffer.createMany({
						data: [...new Set(input.offerIds)].map((offerId) => ({
							promotionId: promotion.id,
							offerId,
						})),
					})
				: null,
			input.customerIds.length
				? tx.storefrontPromotionCustomer.createMany({
						data: [...new Set(input.customerIds)].map((customerId) => ({
							promotionId: promotion.id,
							customerId,
						})),
					})
				: null,
			input.customerProfileIds.length
				? tx.storefrontPromotionCustomerProfile.createMany({
						data: [...new Set(input.customerProfileIds)].map(
							(customerProfileId) => ({
								promotionId: promotion.id,
								customerProfileId,
							}),
						),
					})
				: null,
		]);
		await tx.storefrontAuditEvent.create({
			data: {
				actorUserId: ctx.userId,
				action: input.id ? "promotion.updated" : "promotion.created",
				entityType: "StorefrontPromotion",
				entityId: promotion.id,
				requestId: ctx.requestId,
			},
		});
		return { id: promotion.id };
	});
}

export async function setStorefrontPromotionStatus(
	ctx: TRPCContext & { userId: number },
	input: { id: string; status: "PUBLISHED" | "ARCHIVED" },
) {
	const now = new Date();
	const result = await ctx.db.$transaction(async (tx) => {
		const existing = await tx.storefrontPromotion.findUnique({
			where: { id: input.id },
			include: promotionInclude,
		});
		if (!existing) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Promotion not found.",
			});
		}
		if (
			input.status === "PUBLISHED" &&
			((existing.audienceMode === "TARGETED" &&
				!existing.customerTargets.length &&
				!existing.profileTargets.length) ||
				(existing.scopeMode === "TARGETED" &&
					!existing.categoryTargets.length &&
					!existing.offerTargets.length))
		) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Complete the targeted audience and product scope first.",
			});
		}
		const saved = await tx.storefrontPromotion.update({
			where: { id: input.id },
			data: {
				status: input.status,
				publishedAt: input.status === "PUBLISHED" ? now : existing.publishedAt,
				deletedAt: input.status === "ARCHIVED" ? now : null,
				updatedByUserId: ctx.userId,
			},
		});
		await tx.storefrontAuditEvent.create({
			data: {
				actorUserId: ctx.userId,
				action:
					input.status === "PUBLISHED"
						? "promotion.published"
						: "promotion.archived",
				entityType: "StorefrontPromotion",
				entityId: saved.id,
				requestId: ctx.requestId,
			},
		});
		return saved;
	});
	return { id: result.id, status: result.status };
}

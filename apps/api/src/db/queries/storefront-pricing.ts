import type { TRPCContext } from "@api/trpc/init";
import {
	type StorefrontPricingProfileSnapshot,
	type StorefrontPromotionCandidate,
	isStorefrontPromotionEligible,
	selectStorefrontPromotion,
} from "@gnd/sales/storefront-pricing";
import { TRPCError } from "@trpc/server";

const MAX_ACTIVE_STOREFRONT_PROMOTIONS = 500;

function safeRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function positiveInteger(value: unknown) {
	const parsed = Number(value);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export type ResolvedStorefrontPricingContext = {
	customerId: number | null;
	profile: StorefrontPricingProfileSnapshot | null;
	promotion: StorefrontPromotionCandidate | null;
};

async function resolveStorefrontShopperProfile(ctx: TRPCContext) {
	const [customer, setting] = await Promise.all([
		ctx.userId
			? ctx.db.customers.findFirst({
					where: {
						userId: ctx.userId,
						deletedAt: null,
						dealerOwnerId: null,
						user: {
							type: "CUSTOMER",
							deletedAt: null,
							accessRevokedAt: null,
						},
					},
					select: {
						id: true,
						customerTypeId: true,
						profile: {
							select: {
								id: true,
								title: true,
								coefficient: true,
								dealerOwnerId: true,
								deletedAt: true,
								updatedAt: true,
							},
						},
					},
				})
			: null,
		ctx.db.settings.findFirst({
			where: { type: "storefront-settings", deletedAt: null },
			orderBy: { id: "desc" },
			select: { meta: true },
		}),
	]);

	const assignedProfile =
		customer?.profile &&
		customer.profile.deletedAt == null &&
		customer.profile.dealerOwnerId == null
			? customer.profile
			: null;
	const defaultProfileId = positiveInteger(
		safeRecord(setting?.meta).defaultCustomerProfileId,
	);
	const defaultProfile =
		!assignedProfile && defaultProfileId
			? await ctx.db.customerTypes.findFirst({
					where: {
						id: defaultProfileId,
						dealerOwnerId: null,
						deletedAt: null,
					},
					select: {
						id: true,
						title: true,
						coefficient: true,
						updatedAt: true,
					},
				})
			: null;
	const resolvedProfile = assignedProfile ?? defaultProfile;
	const profile: StorefrontPricingProfileSnapshot | null = resolvedProfile
		? {
				id: resolvedProfile.id,
				title: resolvedProfile.title,
				coefficient: resolvedProfile.coefficient,
				updatedAt: resolvedProfile.updatedAt?.toISOString() ?? null,
				source: assignedProfile ? "CUSTOMER" : "STOREFRONT_DEFAULT",
			}
		: null;

	return { customerId: customer?.id ?? null, profile };
}

async function loadActiveStorefrontPromotions(ctx: TRPCContext, now: Date) {
	const campaigns = await ctx.db.storefrontPromotion.findMany({
		where: {
			status: "PUBLISHED",
			publishedAt: { lte: now },
			deletedAt: null,
			startsAt: { lte: now },
			OR: [{ endsAt: null }, { endsAt: { gt: now } }],
		},
		include: {
			customerTargets: { select: { customerId: true } },
			profileTargets: { select: { customerProfileId: true } },
			categoryTargets: { select: { categoryId: true } },
			offerTargets: { select: { offerId: true } },
		},
		orderBy: [{ percentageOff: "desc" }, { priority: "desc" }],
		take: MAX_ACTIVE_STOREFRONT_PROMOTIONS + 1,
	});
	if (campaigns.length > MAX_ACTIVE_STOREFRONT_PROMOTIONS) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message:
				"Too many active storefront promotions. Archive or reschedule campaigns before continuing.",
		});
	}
	return campaigns.map((campaign) => ({
		id: campaign.id,
		publicTitle: campaign.publicTitle,
		badgeText: campaign.badgeText,
		bannerText: campaign.bannerText,
		bannerHref: campaign.bannerHref,
		percentageOff: Number(campaign.percentageOff),
		priority: campaign.priority,
		audienceMode: campaign.audienceMode,
		scopeMode: campaign.scopeMode,
		startsAt: campaign.startsAt,
		endsAt: campaign.endsAt,
		customerIds: campaign.customerTargets.map((row) => row.customerId),
		customerProfileIds: campaign.profileTargets.map(
			(row) => row.customerProfileId,
		),
		categoryIds: campaign.categoryTargets.map((row) => row.categoryId),
		offerIds: campaign.offerTargets.map((row) => row.offerId),
	})) satisfies StorefrontPromotionCandidate[];
}

export async function resolveStorefrontPricingContext(
	ctx: TRPCContext,
	input: {
		offerId: string;
		categoryId: string;
		now?: Date;
	},
): Promise<ResolvedStorefrontPricingContext> {
	const now = input.now ?? new Date();
	const [shopper, candidates] = await Promise.all([
		resolveStorefrontShopperProfile(ctx),
		loadActiveStorefrontPromotions(ctx, now),
	]);
	return {
		customerId: shopper.customerId,
		profile: shopper.profile,
		promotion: selectStorefrontPromotion(
			candidates.filter((campaign) =>
				isStorefrontPromotionEligible(campaign, {
					now,
					customerId: shopper.customerId,
					customerProfileId: shopper.profile?.id ?? null,
					categoryId: input.categoryId,
					offerId: input.offerId,
				}),
			),
		),
	};
}

export async function resolveStorefrontPromotionMap(
	ctx: TRPCContext,
	offers: Array<{ id: string; categoryId: string }>,
) {
	if (!offers.length) return new Map<string, StorefrontPromotionCandidate>();
	const now = new Date();
	const [shopper, campaigns] = await Promise.all([
		resolveStorefrontShopperProfile(ctx),
		loadActiveStorefrontPromotions(ctx, now),
	]);
	return new Map(
		offers.flatMap((offer) => {
			const promotion = selectStorefrontPromotion(
				campaigns.filter((campaign) =>
					isStorefrontPromotionEligible(campaign, {
						now,
						customerId: shopper.customerId,
						customerProfileId: shopper.profile?.id ?? null,
						categoryId: offer.categoryId,
						offerId: offer.id,
					}),
				),
			);
			return promotion ? [[offer.id, promotion] as const] : [];
		}),
	);
}

export async function resolveStorefrontAnnouncement(ctx: TRPCContext) {
	const now = new Date();
	const [shopper, campaigns] = await Promise.all([
		resolveStorefrontShopperProfile(ctx),
		loadActiveStorefrontPromotions(ctx, now),
	]);
	const eligible = campaigns.filter((campaign) => {
		if (!campaign.bannerText) return false;
		if (campaign.audienceMode === "EVERYONE") return true;
		return (
			(shopper.customerId != null &&
				campaign.customerIds.includes(shopper.customerId)) ||
			(shopper.profile != null &&
				campaign.customerProfileIds.includes(shopper.profile.id))
		);
	});
	const promotion = selectStorefrontPromotion(eligible);
	return promotion
		? {
				title: promotion.publicTitle,
				text: promotion.bannerText,
				href: promotion.bannerHref,
				badgeText: promotion.badgeText,
				percentageOff: promotion.percentageOff,
			}
		: null;
}

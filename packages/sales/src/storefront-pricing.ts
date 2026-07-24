import {
	divideMoney,
	percentageMoney,
	roundMoney,
	subtractMoney,
} from "./payment-system/domain/money";
import { profileAdjustedSalesPrice } from "./sales-form/ui/workflow/workflow-format";

export type StorefrontPromotionAudienceMode = "EVERYONE" | "TARGETED";
export type StorefrontPromotionScopeMode = "ALL_OFFERS" | "TARGETED";

export type StorefrontPromotionCandidate = {
	id: string;
	publicTitle: string;
	badgeText: string;
	bannerText: string | null;
	bannerHref: string | null;
	percentageOff: number;
	priority: number;
	audienceMode: StorefrontPromotionAudienceMode;
	scopeMode: StorefrontPromotionScopeMode;
	startsAt: Date;
	endsAt: Date | null;
	customerIds: number[];
	customerProfileIds: number[];
	categoryIds: string[];
	offerIds: string[];
};

export type StorefrontPromotionEligibilityContext = {
	now: Date;
	customerId: number | null;
	customerProfileId: number | null;
	categoryId: string;
	offerId: string;
};

export type StorefrontPricingProfileSnapshot = {
	id: number;
	title: string;
	coefficient: number | null;
	updatedAt: string | null;
	source: "CUSTOMER" | "STOREFRONT_DEFAULT";
};

export type StorefrontAppliedPromotionSnapshot = {
	id: string;
	publicTitle: string;
	badgeText: string;
	bannerText: string | null;
	bannerHref: string | null;
	percentageOff: number;
	priority: number;
	startsAt: string;
	endsAt: string | null;
};

export type StorefrontPricingSnapshot = {
	currency: "USD";
	pricedAt: string;
	source: "canonical-dyke-sales-pricing";
	profile: StorefrontPricingProfileSnapshot | null;
	promotion: StorefrontAppliedPromotionSnapshot | null;
	listUnitPrice: number;
	listLineTotal: number;
	discountAmount: number;
	unitPrice: number;
	lineTotal: number;
	isFrom: boolean;
};

function safeRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

export function storefrontPricingSnapshotFingerprint(value: unknown) {
	const snapshot = safeRecord(value);
	const profile = safeRecord(snapshot.profile);
	const promotion = safeRecord(snapshot.promotion);
	return JSON.stringify({
		profileId: profile.id ?? null,
		profileCoefficient: profile.coefficient ?? null,
		profileUpdatedAt: profile.updatedAt ?? null,
		promotionId: promotion.id ?? null,
		promotionPercentage: promotion.percentageOff ?? null,
		listLineTotal: Number(snapshot.listLineTotal ?? snapshot.lineTotal ?? 0),
		lineTotal: Number(snapshot.lineTotal ?? 0),
	});
}

export function applyStorefrontProfilePrice(input: {
	salesPrice: number | null | undefined;
	basePrice: number | null | undefined;
	profile: StorefrontPricingProfileSnapshot | null;
}) {
	return profileAdjustedSalesPrice(
		input.salesPrice,
		input.basePrice,
		input.profile?.coefficient,
	);
}

function activeAt(promotion: StorefrontPromotionCandidate, now: Date): boolean {
	return (
		promotion.startsAt.getTime() <= now.getTime() &&
		(!promotion.endsAt || now.getTime() < promotion.endsAt.getTime())
	);
}

export function isStorefrontPromotionEligible(
	promotion: StorefrontPromotionCandidate,
	context: StorefrontPromotionEligibilityContext,
) {
	if (!activeAt(promotion, context.now)) return false;

	const audienceEligible =
		promotion.audienceMode === "EVERYONE" ||
		(context.customerId != null &&
			promotion.customerIds.includes(context.customerId)) ||
		(context.customerProfileId != null &&
			promotion.customerProfileIds.includes(context.customerProfileId));
	if (!audienceEligible) return false;

	return (
		promotion.scopeMode === "ALL_OFFERS" ||
		promotion.offerIds.includes(context.offerId) ||
		promotion.categoryIds.includes(context.categoryId)
	);
}

export function selectStorefrontPromotion(
	promotions: StorefrontPromotionCandidate[],
) {
	return (
		[...promotions].sort(
			(a, b) =>
				b.percentageOff - a.percentageOff ||
				b.priority - a.priority ||
				b.startsAt.getTime() - a.startsAt.getTime() ||
				a.id.localeCompare(b.id),
		)[0] ?? null
	);
}

function promotionSnapshot(
	promotion: StorefrontPromotionCandidate | null,
): StorefrontAppliedPromotionSnapshot | null {
	if (!promotion) return null;
	return {
		id: promotion.id,
		publicTitle: promotion.publicTitle,
		badgeText: promotion.badgeText,
		bannerText: promotion.bannerText,
		bannerHref: promotion.bannerHref,
		percentageOff: promotion.percentageOff,
		priority: promotion.priority,
		startsAt: promotion.startsAt.toISOString(),
		endsAt: promotion.endsAt?.toISOString() ?? null,
	};
}

export function applyStorefrontPromotion(input: {
	listLineTotal: number;
	quantity: number;
	promotion: StorefrontPromotionCandidate | null;
	profile?: StorefrontPricingProfileSnapshot | null;
	pricedAt?: Date;
	isFrom?: boolean;
}): StorefrontPricingSnapshot {
	const listLineTotal = Math.max(0, roundMoney(input.listLineTotal));
	const quantity = Math.max(0, Number(input.quantity || 0));
	const percentage = input.promotion?.percentageOff ?? 0;
	const discountAmount = input.promotion
		? Math.min(listLineTotal, percentageMoney(listLineTotal, percentage))
		: 0;
	const lineTotal = subtractMoney(listLineTotal, discountAmount);
	return {
		currency: "USD",
		pricedAt: (input.pricedAt ?? new Date()).toISOString(),
		source: "canonical-dyke-sales-pricing",
		profile: input.profile ?? null,
		promotion: promotionSnapshot(input.promotion),
		listUnitPrice:
			quantity > 0 ? divideMoney(listLineTotal, quantity) : listLineTotal,
		listLineTotal,
		discountAmount,
		unitPrice: quantity > 0 ? divideMoney(lineTotal, quantity) : lineTotal,
		lineTotal,
		isFrom: input.isFrom === true,
	};
}

export function toPublicStorefrontPricing(value: unknown) {
	const snapshot = safeRecord(value);
	const promotion = safeRecord(snapshot.promotion);
	const discountAmount = Number(snapshot.discountAmount || 0);
	return {
		currency: String(snapshot.currency || "USD"),
		listPrice: Number(snapshot.listUnitPrice ?? snapshot.unitPrice ?? 0),
		salePrice: Number(snapshot.unitPrice || 0),
		listLineTotal: Number(snapshot.listLineTotal ?? snapshot.lineTotal ?? 0),
		saleLineTotal: Number(snapshot.lineTotal || 0),
		discountAmount,
		percentageOff:
			promotion.percentageOff == null ? null : Number(promotion.percentageOff),
		promotionTitle:
			promotion.publicTitle == null ? null : String(promotion.publicTitle),
		badgeText: promotion.badgeText == null ? null : String(promotion.badgeText),
		isOnSale: discountAmount > 0,
		isFrom: snapshot.isFrom === true,
	};
}

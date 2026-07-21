import { profileAdjustedSalesPrice } from "./sales-form/ui/workflow/workflow-format";

export const storefrontCatalogFamilies = [
	"doors",
	"mouldings",
	"shelf-items",
] as const;

export type StorefrontCatalogFamily =
	(typeof storefrontCatalogFamilies)[number];

const FAMILY_BY_STEP_TITLE: Record<string, StorefrontCatalogFamily> = {
	door: "doors",
	moulding: "mouldings",
	"shelf items": "shelf-items",
};

export function storefrontCatalogFamilyFromStepTitle(
	title?: string | null,
): StorefrontCatalogFamily | null {
	return (
		FAMILY_BY_STEP_TITLE[
			String(title || "")
				.trim()
				.toLowerCase()
		] || null
	);
}

function safeRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

export function storefrontCatalogStepUidsFromSalesSettings(value: unknown) {
	const settingsMeta = safeRecord(value);
	const nestedData = safeRecord(settingsMeta.data);
	const configuredRoute = safeRecord(settingsMeta.route);
	const rawRoute = Object.keys(configuredRoute).length
		? configuredRoute
		: safeRecord(nestedData.route);
	const stepUids = new Set<string>();

	for (const routeDefinition of Object.values(rawRoute)) {
		const routeSequence = safeRecord(routeDefinition).routeSequence;
		if (!Array.isArray(routeSequence)) continue;
		for (const routeStep of routeSequence) {
			const uid = String(safeRecord(routeStep).uid || "").trim();
			if (uid) stepUids.add(uid);
		}
	}

	return [...stepUids];
}

export type StorefrontCatalogProfile = {
	id: number;
	title: string | null;
	coefficient: number | null;
};

export function deduplicateStorefrontCatalogProfiles<
	T extends StorefrontCatalogProfile,
>(profiles: T[]) {
	const profilesByTitle = new Map<string, T>();
	for (const profile of profiles) {
		const key = String(profile.title || `profile-${profile.id}`)
			.toLowerCase()
			.replace(/\d+(?:\.\d+)?\s*%/g, "")
			.replace(/[^a-z0-9]+/g, "");
		const existing = profilesByTitle.get(key);
		const hasCoefficient = Number(profile.coefficient) > 0;
		const existingHasCoefficient = Number(existing?.coefficient) > 0;
		if (!existing || (hasCoefficient && !existingHasCoefficient)) {
			profilesByTitle.set(key, profile);
		}
	}
	return [...profilesByTitle.values()];
}

export type StorefrontCatalogSourceComponent = {
	uid?: string | null;
	title?: string | null;
	img?: string | null;
	basePrice?: number | null;
	salesPrice?: number | null;
};

export type StorefrontCatalogSourceStep = {
	uid?: string | null;
	title?: string | null;
	components?: StorefrontCatalogSourceComponent[] | null;
};

export type StorefrontCatalogPricingRow = {
	stepProductUid?: string | null;
	dependenciesUid?: string | null;
	price?: number | null;
};

export function storefrontCatalogBasePrice(
	componentUid: string,
	rows: StorefrontCatalogPricingRow[],
) {
	const componentRows = rows.filter(
		(row) => row.stepProductUid === componentUid,
	);
	const direct = componentRows.find(
		(row) => !row.dependenciesUid || row.dependenciesUid === componentUid,
	);
	if (direct?.price != null && Number.isFinite(Number(direct.price))) {
		return Number(direct.price);
	}

	const dependencyPrices = componentRows
		.map((row) => Number(row.price))
		.filter((price) => Number.isFinite(price) && price > 0);
	return dependencyPrices.length ? Math.min(...dependencyPrices) : 0;
}

export type StorefrontCatalogOverlay = {
	id?: string | null;
	sourceStepUid: string;
	sourceComponentUid: string;
	availableOnStorefront: boolean;
	title?: string | null;
	description?: string | null;
	imageUrl?: string | null;
	status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
	sortOrder?: number | null;
};

export type StorefrontCatalogOffer = {
	id: string;
	sourceComponentUid: string;
	featured?: boolean | null;
	status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

export type StorefrontCatalogItem = {
	uid: string;
	stepUid: string;
	family: StorefrontCatalogFamily;
	title: string;
	description: string | null;
	imageUrl: string | null;
	online: boolean;
	featured: boolean;
	publicationStatus: "DRAFT" | "PUBLISHED" | "ARCHIVED";
	costPrice: number;
	salesPrice: number;
	overlayId: string | null;
	offerId: string | null;
	sortOrder: number;
};

function finiteMoney(value?: number | null) {
	const amount = Number(value || 0);
	return Number.isFinite(amount) ? amount : 0;
}

export function buildStorefrontCatalogProjection(input: {
	steps: StorefrontCatalogSourceStep[];
	overlays?: StorefrontCatalogOverlay[];
	offers?: StorefrontCatalogOffer[];
	profileCoefficient?: number | null;
}) {
	const overlaysByUid = new Map(
		(input.overlays || []).map((overlay) => [
			overlay.sourceComponentUid,
			overlay,
		]),
	);
	const offersByUid = new Map(
		(input.offers || []).map((offer) => [offer.sourceComponentUid, offer]),
	);
	const itemsByUid = new Map<string, StorefrontCatalogItem>();

	for (const step of input.steps) {
		const family = storefrontCatalogFamilyFromStepTitle(step.title);
		const stepUid = String(step.uid || "").trim();
		if (!family || !stepUid) continue;

		for (const component of step.components || []) {
			const uid = String(component.uid || "").trim();
			if (!uid || itemsByUid.has(uid)) continue;
			const overlay = overlaysByUid.get(uid);
			const offer = offersByUid.get(uid);
			const costPrice = finiteMoney(component.basePrice);
			itemsByUid.set(uid, {
				uid,
				stepUid,
				family,
				title:
					String(
						overlay?.title || component.title || "Untitled component",
					).trim() || "Untitled component",
				description: overlay?.description || null,
				imageUrl: overlay?.imageUrl || component.img || null,
				online:
					Boolean(overlay?.availableOnStorefront) &&
					overlay?.status === "PUBLISHED",
				featured: Boolean(offer?.featured) && offer?.status === "PUBLISHED",
				publicationStatus: overlay?.status || "DRAFT",
				costPrice,
				salesPrice: profileAdjustedSalesPrice(
					component.salesPrice,
					costPrice,
					input.profileCoefficient,
				),
				overlayId: overlay?.id || null,
				offerId: offer?.id || null,
				sortOrder: Number(overlay?.sortOrder || 0),
			});
		}
	}

	const items = [...itemsByUid.values()].sort(
		(a, b) =>
			a.sortOrder - b.sortOrder ||
			a.title.localeCompare(b.title) ||
			a.uid.localeCompare(b.uid),
	);
	const onlineCounts: Record<StorefrontCatalogFamily, number> = {
		doors: 0,
		mouldings: 0,
		"shelf-items": 0,
	};
	for (const item of items) {
		if (item.online) onlineCounts[item.family] += 1;
	}

	return { items, onlineCounts };
}

import type { StorefrontCatalogListInput } from "@api/schemas/storefront-admin";
import type { TRPCContext } from "@api/trpc/init";
import {
	type StorefrontCatalogFamily,
	buildStorefrontCatalogProjection,
	deduplicateStorefrontCatalogProfiles,
	storefrontCatalogBasePrice,
	storefrontCatalogFamilyFromStepTitle,
	storefrontCatalogStepUidsFromSalesSettings,
} from "@gnd/sales/storefront-catalog";

const FAMILY_TITLES = ["Door", "Moulding", "Shelf Items"] as const;
const TITLE_BY_FAMILY: Record<StorefrontCatalogFamily, string> = {
	doors: "Door",
	mouldings: "Moulding",
	"shelf-items": "Shelf Items",
};

async function getCanonicalCatalogSteps(ctx: TRPCContext) {
	const settings = await ctx.db.settings.findFirst({
		where: { type: "sales-settings", deletedAt: null },
		orderBy: { id: "desc" },
		select: { meta: true },
	});
	const routedStepUids = storefrontCatalogStepUidsFromSalesSettings(
		settings?.meta,
	);
	if (!routedStepUids.length) return [];

	return ctx.db.dykeSteps.findMany({
		where: {
			uid: { in: routedStepUids },
			title: { in: [...FAMILY_TITLES] },
			deletedAt: null,
		},
		select: { id: true, uid: true, title: true },
	});
}

export async function getStorefrontCatalogFamilies(ctx: TRPCContext) {
	const steps = await getCanonicalCatalogSteps(ctx);
	const stepUids = steps
		.map((step) => step.uid)
		.filter((uid): uid is string => Boolean(uid));
	const [onlineGroups, totalGroups] = await Promise.all([
		ctx.db.storefrontComponent.groupBy({
			by: ["sourceStepUid"],
			where: {
				sourceStepUid: { in: stepUids },
				availableOnStorefront: true,
				status: "PUBLISHED",
				deletedAt: null,
			},
			_count: { sourceComponentUid: true },
		}),
		ctx.db.dykeStepProducts.groupBy({
			by: ["dykeStepId"],
			where: {
				dykeStepId: { in: steps.map((step) => step.id) },
				deletedAt: null,
			},
			_count: { id: true },
		}),
	]);
	const onlineByStep = new Map(
		onlineGroups.map((row) => [
			row.sourceStepUid,
			row._count.sourceComponentUid,
		]),
	);
	const totalByStep = new Map(
		totalGroups.map((row) => [row.dykeStepId, row._count.id]),
	);
	const result: Record<
		StorefrontCatalogFamily,
		{
			family: StorefrontCatalogFamily;
			label: string;
			online: number;
			total: number;
		}
	> = {
		doors: { family: "doors", label: "Doors", online: 0, total: 0 },
		mouldings: {
			family: "mouldings",
			label: "Mouldings",
			online: 0,
			total: 0,
		},
		"shelf-items": {
			family: "shelf-items",
			label: "Shelf Items",
			online: 0,
			total: 0,
		},
	};
	for (const step of steps) {
		const family = storefrontCatalogFamilyFromStepTitle(step.title);
		if (!family) continue;
		result[family].online += step.uid ? onlineByStep.get(step.uid) || 0 : 0;
		result[family].total += totalByStep.get(step.id) || 0;
	}
	return Object.values(result);
}

export async function getStorefrontCatalogProfiles(ctx: TRPCContext) {
	const profiles = await ctx.db.customerTypes.findMany({
		where: { deletedAt: null, dealerOwnerId: null },
		orderBy: [{ title: "asc" }, { id: "asc" }],
		select: { id: true, title: true, coefficient: true },
	});
	return deduplicateStorefrontCatalogProfiles(profiles);
}

export async function getStorefrontCatalogList(
	ctx: TRPCContext,
	input: StorefrontCatalogListInput,
) {
	const catalogSteps = await getCanonicalCatalogSteps(ctx);
	const selectedFamilyTitle = input.family
		? TITLE_BY_FAMILY[input.family]
		: null;
	const steps = input.family
		? catalogSteps.filter((step) => step.title === selectedFamilyTitle)
		: catalogSteps;
	const stepIds = steps.map((step) => step.id);
	const stepUids = steps
		.map((step) => step.uid)
		.filter((uid): uid is string => Boolean(uid));
	if (!stepIds.length) return { items: [], nextCursor: null };

	const [onlineRows, featuredRows] = await Promise.all([
		input.status
			? ctx.db.storefrontComponent.findMany({
					where: {
						sourceStepUid: { in: stepUids },
						availableOnStorefront: true,
						status: "PUBLISHED",
						deletedAt: null,
					},
					select: { sourceComponentUid: true },
				})
			: Promise.resolve([]),
		input.featured != null
			? ctx.db.storefrontOffer.findMany({
					where: {
						featured: true,
						status: "PUBLISHED",
						deletedAt: null,
					},
					select: { sourceComponentUid: true },
				})
			: Promise.resolve([]),
	]);
	const onlineUids = onlineRows.map((row) => row.sourceComponentUid);
	const featuredUids = featuredRows.map((row) => row.sourceComponentUid);
	if (input.status === "online" && !onlineUids.length)
		return { items: [], nextCursor: null };
	if (input.featured === true && !featuredUids.length)
		return { items: [], nextCursor: null };

	const uidFilters: Array<Record<string, unknown>> = [];
	if (input.status === "online") uidFilters.push({ uid: { in: onlineUids } });
	if (input.status === "offline" && onlineUids.length)
		uidFilters.push({ uid: { notIn: onlineUids } });
	if (input.featured === true) uidFilters.push({ uid: { in: featuredUids } });
	if (input.featured === false && featuredUids.length)
		uidFilters.push({ uid: { notIn: featuredUids } });

	const rows = await ctx.db.dykeStepProducts.findMany({
		where: {
			dykeStepId: { in: stepIds },
			deletedAt: null,
			uid: { not: null },
			...(input.cursor ? { id: { gt: input.cursor } } : {}),
			...(uidFilters.length ? { AND: uidFilters } : {}),
			...(input.query
				? {
						OR: [
							{ name: { contains: input.query } },
							{ productCode: { contains: input.query } },
							{ door: { title: { contains: input.query } } },
							{ product: { title: { contains: input.query } } },
						],
					}
				: {}),
		},
		orderBy: { id: "asc" },
		take: input.limit + 1,
		select: {
			id: true,
			uid: true,
			name: true,
			img: true,
			step: { select: { uid: true, title: true } },
			door: { select: { title: true, img: true } },
			product: { select: { title: true, img: true } },
		},
	});
	const page = rows.slice(0, input.limit);
	const componentUids = page
		.map((row) => row.uid)
		.filter((uid): uid is string => Boolean(uid));
	const [overlays, offers, prices, profile] = await Promise.all([
		ctx.db.storefrontComponent.findMany({
			where: { sourceComponentUid: { in: componentUids }, deletedAt: null },
		}),
		ctx.db.storefrontOffer.findMany({
			where: { sourceComponentUid: { in: componentUids }, deletedAt: null },
			select: {
				id: true,
				sourceComponentUid: true,
				featured: true,
				status: true,
				slug: true,
				category: {
					select: { slug: true, status: true, deletedAt: true },
				},
			},
		}),
		ctx.db.dykePricingSystem.findMany({
			where: { stepProductUid: { in: componentUids }, deletedAt: null },
			select: { stepProductUid: true, dependenciesUid: true, price: true },
		}),
		input.profileId
			? ctx.db.customerTypes.findUnique({
					where: { id: input.profileId },
					select: { coefficient: true },
				})
			: Promise.resolve(null),
	]);
	const sourceSteps = page.map((row) => {
		const uid = row.uid || "";
		const price = storefrontCatalogBasePrice(uid, prices);
		return {
			uid: row.step.uid,
			title: row.step.title,
			components: [
				{
					uid,
					title: row.name || row.door?.title || row.product?.title,
					img: row.img || row.door?.img || row.product?.img,
					basePrice: price,
					salesPrice: price,
				},
			],
		};
	});
	const projection = buildStorefrontCatalogProjection({
		steps: sourceSteps,
		overlays,
		offers,
		profileCoefficient: profile?.coefficient,
	});
	const sourceIdByUid = new Map(page.map((row) => [row.uid, row.id]));
	const offerByUid = new Map(
		offers.map((offer) => [offer.sourceComponentUid, offer]),
	);
	return {
		items: projection.items.map((item) => {
			const offer = offerByUid.get(item.uid);
			const storefrontPath =
				item.online &&
				offer?.status === "PUBLISHED" &&
				offer.category.status === "PUBLISHED" &&
				!offer.category.deletedAt
					? `/product/${offer.category.slug}/${offer.slug}`
					: null;
			return {
				...item,
				sourceId: sourceIdByUid.get(item.uid) || 0,
				storefrontPath,
			};
		}),
		nextCursor: rows.length > input.limit ? page.at(-1)?.id || null : null,
	};
}

export async function getStorefrontCatalogDetail(
	ctx: TRPCContext,
	componentUid: string,
) {
	const source = await ctx.db.dykeStepProducts.findFirst({
		where: {
			uid: componentUid,
			deletedAt: null,
			step: { title: { in: [...FAMILY_TITLES] }, deletedAt: null },
		},
		select: {
			id: true,
			uid: true,
			name: true,
			img: true,
			step: { select: { uid: true, title: true } },
			door: { select: { title: true, img: true } },
			product: { select: { title: true, img: true } },
		},
	});
	if (!source?.uid || !source.step.uid) return null;
	const [overlay, offer, categories, shelfCategories] = await Promise.all([
		ctx.db.storefrontComponent.findUnique({
			where: { sourceComponentUid: componentUid },
		}),
		ctx.db.storefrontOffer.findUnique({
			where: { sourceComponentUid: componentUid },
			include: {
				stepPolicies: { orderBy: { sortOrder: "asc" } },
				componentPolicies: { orderBy: { sortOrder: "asc" } },
			},
		}),
		ctx.db.storefrontCategory.findMany({
			where: { deletedAt: null },
			orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
			select: { id: true, title: true, status: true },
		}),
		ctx.db.dykeShelfCategories.findMany({
			where: { deletedAt: null, type: "parent" },
			orderBy: { name: "asc" },
			select: { id: true, name: true },
		}),
	]);
	return {
		source: {
			id: source.id,
			uid: source.uid,
			stepUid: source.step.uid,
			family: storefrontCatalogFamilyFromStepTitle(source.step.title),
			title:
				source.name ||
				source.door?.title ||
				source.product?.title ||
				"Untitled component",
			imageUrl: source.img || source.door?.img || source.product?.img || null,
		},
		overlay,
		offer,
		categories,
		shelfCategories,
	};
}

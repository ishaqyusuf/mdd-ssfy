import { getNewSalesFormStepRouting } from "@api/db/queries/new-sales-form";
import { db } from "@gnd/db";
import { resolveWorkflowComponentImageSrc } from "@gnd/sales/sales-form";
import {
	type StorefrontComponent,
	projectStorefrontOfferRoute,
} from "@gnd/sales/storefront-configuration";

type RouteComponent = {
	uid?: string | null;
	title?: string | null;
	img?: string | null;
};

type RouteStep = {
	uid?: string | null;
	title?: string | null;
	components?: RouteComponent[] | null;
};

const actor = await db.users.findFirst({
	where: {
		deletedAt: null,
		accessRevokedAt: null,
		roles: {
			some: { deletedAt: null, role: { name: { contains: "Sales" } } },
		},
	},
	orderBy: { id: "asc" },
	select: { id: true, name: true, email: true },
});
if (!actor) throw new Error("No active sales rep is available for storefront.");

const routeData = await getNewSalesFormStepRouting({ db } as never, {});
const itemTypeStep = routeData.stepsByUid.MtJgR as RouteStep | undefined;
const rootComponent = itemTypeStep?.components?.find(
	(component) => component.uid === "KmUMM",
);
const route = routeData.composedRouter.KmUMM;
if (!itemTypeStep?.uid || !rootComponent?.uid || !route) {
	throw new Error("Interior pre-hung sales route is unavailable.");
}

const routeStepUids = route.routeSequence
	.map((step) => String(step.uid || ""))
	.filter(Boolean);
const sourcesByUid = new Map<
	string,
	{ component: RouteComponent; stepUid: string }
>();

for (const sourceStep of Object.values(routeData.stepsByUid) as RouteStep[]) {
	const stepUid = String(sourceStep.uid || "");
	const includeStep =
		String(sourceStep.title || "")
			.trim()
			.toLowerCase() === "door" ||
		routeStepUids.includes(stepUid) ||
		stepUid === itemTypeStep.uid;
	if (!includeStep || !stepUid) continue;
	for (const component of sourceStep.components || []) {
		const uid = String(component.uid || "");
		if (uid && !sourcesByUid.has(uid)) {
			sourcesByUid.set(uid, { component, stepUid });
		}
	}
}

const sourceRows = [...sourcesByUid.entries()].map(
	([sourceComponentUid, source]) => ({
		sourceStepUid: source.stepUid,
		sourceComponentUid,
		availableOnStorefront: true,
		title: source.component.title || null,
		imageUrl: resolveWorkflowComponentImageSrc(source.component.img),
		status: "PUBLISHED" as const,
		createdByUserId: actor.id,
		updatedByUserId: actor.id,
	}),
);
await db.storefrontComponent.createMany({
	data: sourceRows,
	skipDuplicates: true,
});
await db.storefrontComponent.updateMany({
	where: {
		sourceComponentUid: { in: sourceRows.map((row) => row.sourceComponentUid) },
	},
	data: {
		availableOnStorefront: true,
		status: "PUBLISHED",
		deletedAt: null,
		updatedByUserId: actor.id,
	},
});

const category = await db.storefrontCategory.upsert({
	where: { rootComponentUid: rootComponent.uid },
	create: {
		rootStepUid: itemTypeStep.uid,
		rootComponentUid: rootComponent.uid,
		listingStepUid: "jdd5q",
		slug: "interior-pre-hung",
		title: "Interior Pre-Hung Doors",
		description:
			"Configure an interior pre-hung door using GND's standard sales options.",
		imageUrl: resolveWorkflowComponentImageSrc(rootComponent.img),
		status: "PUBLISHED",
		publishedAt: new Date(),
		createdByUserId: actor.id,
		updatedByUserId: actor.id,
	},
	update: {
		listingStepUid: "jdd5q",
		status: "PUBLISHED",
		publishedAt: new Date(),
		deletedAt: null,
		updatedByUserId: actor.id,
	},
});

const testProducts = [
	{
		uid: "QSOAe",
		slug: "carrara-2-panel-interior-door",
		title: "Carrara 2 Panel Interior Door",
	},
	{
		uid: "NKbw8",
		slug: "birkdale-3-panel-interior-door",
		title: "Birkdale 3 Panel Interior Door",
	},
] as const;

const overlays = await db.storefrontComponent.findMany({
	where: { deletedAt: null },
});
for (const [index, product] of testProducts.entries()) {
	const source = sourcesByUid.get(product.uid)?.component;
	if (!source) throw new Error(`Missing test Door component ${product.uid}.`);
	const offer = await db.storefrontOffer.upsert({
		where: { sourceComponentUid: product.uid },
		create: {
			categoryId: category.id,
			sourceStepUid: "jdd5q",
			sourceComponentUid: product.uid,
			slug: product.slug,
			title: product.title,
			description:
				"A configurable interior pre-hung door from the canonical GND sales catalog.",
			imageUrl: resolveWorkflowComponentImageSrc(source.img),
			availability: { purchasable: true, mode: "MADE_TO_ORDER" },
			status: "DRAFT",
			featured: true,
			featuredOrder: index,
			sortOrder: index,
			createdByUserId: actor.id,
			updatedByUserId: actor.id,
		},
		update: {
			categoryId: category.id,
			slug: product.slug,
			title: product.title,
			imageUrl: resolveWorkflowComponentImageSrc(source.img),
			featured: true,
			featuredOrder: index,
			deletedAt: null,
			updatedByUserId: actor.id,
		},
		include: {
			stepPolicies: true,
			componentPolicies: true,
		},
	});
	const readiness = projectStorefrontOfferRoute({
		routeData,
		rootStepUid: category.rootStepUid,
		rootComponentUid: category.rootComponentUid,
		offerSourceStepUid: product.uid ? "jdd5q" : null,
		offerSourceComponentUid: product.uid,
		stepPolicies: offer.stepPolicies,
		componentPolicies: offer.componentPolicies,
		components: overlays.map((overlay) => ({
			...overlay,
			metadata: (overlay.metadata as Record<string, unknown> | null) || null,
		})) as StorefrontComponent[],
	});
	if (!readiness.ready) {
		throw new Error(
			`${product.title} is not publishable: ${JSON.stringify(readiness.issues)}`,
		);
	}
	await db.storefrontOffer.update({
		where: { id: offer.id },
		data: { status: "PUBLISHED", publishedAt: new Date() },
	});
}

const currentSettings = await db.settings.findFirst({
	where: { type: "storefront-settings", deletedAt: null },
	orderBy: { id: "desc" },
});
const currentMeta =
	currentSettings?.meta &&
	typeof currentSettings.meta === "object" &&
	!Array.isArray(currentSettings.meta)
		? currentSettings.meta
		: {};
const settingsData = {
	type: "storefront-settings",
	meta: {
		...currentMeta,
		defaultSalesRepId: actor.id,
		checkout: {
			pickupEnabled: true,
			deliveryEnabled: true,
			deliveryFlatRate: 0,
			freeDeliveryThreshold: null,
		},
	},
	deletedAt: null,
};
if (currentSettings) {
	await db.settings.update({
		where: { id: currentSettings.id },
		data: settingsData,
	});
} else {
	await db.settings.create({ data: settingsData });
}

console.log(
	JSON.stringify(
		{
			category: category.slug,
			onlineComponents: sourceRows.length,
			products: testProducts.map((product) => product.slug),
			defaultSalesRep: actor.name || actor.email,
		},
		null,
		2,
	),
);
await db.$disconnect();
